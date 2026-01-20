-- Create a function to check if a user has access to a specific case
-- This checks case assignment through: case creator, case manager, case manager 2, or investigator
CREATE OR REPLACE FUNCTION public.is_case_assigned_to_user(p_user_id uuid, p_case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM cases c
    WHERE c.id = p_case_id
      AND (
        c.user_id = p_user_id                           -- Case creator
        OR c.case_manager_id = p_user_id                -- Primary case manager
        OR c.case_manager_2_id = p_user_id              -- Secondary case manager
        OR p_user_id = ANY(c.investigator_ids)          -- Assigned investigator
      )
  );
END;
$$;

-- Update the case_attachments SELECT policy to include case assignment check
-- Drop the old policy
DROP POLICY IF EXISTS "Users with view_attachments permission can view" ON public.case_attachments;

-- Create new policy that requires case assignment OR admin/manager role
CREATE POLICY "Users can view attachments for assigned cases"
ON public.case_attachments
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
  AND (
    -- Admins and managers can see all attachments in their org
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    -- Investigators can only see attachments for cases they're assigned to
    OR (
      has_permission(auth.uid(), 'view_attachments'::text)
      AND is_case_assigned_to_user(auth.uid(), case_id)
    )
  )
);

-- Update INSERT policy to also check case assignment for non-admins
DROP POLICY IF EXISTS "Users with add_attachments permission can insert" ON public.case_attachments;

CREATE POLICY "Users can add attachments to assigned cases"
ON public.case_attachments
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR (
      has_permission(auth.uid(), 'add_attachments'::text)
      AND is_case_assigned_to_user(auth.uid(), case_id)
    )
  )
);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users with edit_attachments permission can update" ON public.case_attachments;

CREATE POLICY "Users can edit attachments on assigned cases"
ON public.case_attachments
FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR (
      has_permission(auth.uid(), 'edit_attachments'::text)
      AND is_case_assigned_to_user(auth.uid(), case_id)
    )
  )
);

-- Update DELETE policy
DROP POLICY IF EXISTS "Users with delete_attachments permission can delete" ON public.case_attachments;

CREATE POLICY "Users can delete attachments on assigned cases"
ON public.case_attachments
FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR (
      has_permission(auth.uid(), 'delete_attachments'::text)
      AND is_case_assigned_to_user(auth.uid(), case_id)
    )
  )
);
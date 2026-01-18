-- Fix subject_attachments security:
-- 1. Revoke anonymous access
-- 2. Update RLS to verify case access through subject -> case relationship

-- Revoke anonymous access
REVOKE ALL ON public.subject_attachments FROM anon;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can manage subject attachments in their organization" ON public.subject_attachments;
DROP POLICY IF EXISTS "Users can view subject attachments in their organization" ON public.subject_attachments;
DROP POLICY IF EXISTS "Admins can insert subject attachments in their organization" ON public.subject_attachments;
DROP POLICY IF EXISTS "Admins can update subject attachments in their organization" ON public.subject_attachments;
DROP POLICY IF EXISTS "Admins can delete subject attachments in their organization" ON public.subject_attachments;

-- Create helper function to check if user can access a subject's case
CREATE OR REPLACE FUNCTION public.can_access_subject_case(p_subject_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.case_subjects cs
    JOIN public.cases c ON c.id = cs.case_id
    WHERE cs.id = p_subject_id
      AND c.organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
  );
$$;

-- SELECT: Users can view attachments for subjects in cases within their organization
CREATE POLICY "Users can view subject attachments for accessible cases"
ON public.subject_attachments
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
  AND can_access_subject_case(subject_id)
);

-- INSERT: Users can add attachments to subjects in cases within their organization
CREATE POLICY "Users can insert subject attachments for accessible cases"
ON public.subject_attachments
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND can_access_subject_case(subject_id)
);

-- UPDATE: Users can update their own attachments or admins can update any
CREATE POLICY "Users can update own subject attachments"
ON public.subject_attachments
FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND can_access_subject_case(subject_id)
  AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- DELETE: Users can delete their own attachments or admins can delete any
CREATE POLICY "Users can delete own subject attachments"
ON public.subject_attachments
FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND can_access_subject_case(subject_id)
  AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- Ensure authenticated users have proper grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_attachments TO authenticated;

-- Add security documentation
COMMENT ON TABLE public.subject_attachments IS 'Subject attachments - RLS verifies organization membership AND case access through subject relationship. Anonymous access revoked.';
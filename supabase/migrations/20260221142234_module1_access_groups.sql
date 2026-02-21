-- Module 1: Access Groups (TrackOps parity)
-- Implements Access Groups to control visibility of specific data objects (case_updates, case_attachments)

CREATE TABLE public.access_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  require_validation boolean DEFAULT false,
  refresh_last_update boolean DEFAULT true,
  include_in_documents boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE public.access_group_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_group_id uuid NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(access_group_id, role)
);

-- Extend standard operational tables with access group visibility
ALTER TABLE public.case_updates ADD COLUMN access_group_id uuid REFERENCES public.access_groups(id) ON DELETE SET NULL;
ALTER TABLE public.case_attachments ADD COLUMN access_group_id uuid REFERENCES public.access_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.access_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_group_roles ENABLE ROW LEVEL SECURITY;

-- Visibility helper function
CREATE OR REPLACE FUNCTION public.can_view_access_group(_user_id uuid, _access_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.access_group_roles agr
    JOIN public.user_roles ur ON ur.role = agr.role
    WHERE agr.access_group_id = _access_group_id
      AND ur.user_id = _user_id
  )
$$;

-- RLS: access_groups
CREATE POLICY "Users can view org access groups" ON public.access_groups
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can insert org access groups" ON public.access_groups
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update org access groups" ON public.access_groups
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete org access groups" ON public.access_groups
  FOR DELETE USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- RLS: access_group_roles
CREATE POLICY "Users can view org access group roles" ON public.access_group_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.access_groups ag 
      WHERE ag.id = access_group_roles.access_group_id 
        AND is_org_member(auth.uid(), ag.organization_id)
    )
  );

CREATE POLICY "Admins can insert org access group roles" ON public.access_group_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.access_groups ag 
      WHERE ag.id = access_group_roles.access_group_id 
        AND is_org_member(auth.uid(), ag.organization_id)
        AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Admins can update org access group roles" ON public.access_group_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.access_groups ag 
      WHERE ag.id = access_group_roles.access_group_id 
        AND is_org_member(auth.uid(), ag.organization_id)
        AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Admins can delete org access group roles" ON public.access_group_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.access_groups ag 
      WHERE ag.id = access_group_roles.access_group_id 
        AND is_org_member(auth.uid(), ag.organization_id)
        AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Update RLS for case_updates (replace standard SELECT policy with access-group restricted policy)
DROP POLICY IF EXISTS "Users can view case updates in their organization" ON public.case_updates;

CREATE POLICY "Users can view case updates in their organization" ON public.case_updates
  FOR SELECT USING (
    is_org_member(auth.uid(), organization_id)
    AND (
      access_group_id IS NULL 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR can_view_access_group(auth.uid(), access_group_id)
    )
  );

-- Update RLS for case_attachments 
DROP POLICY IF EXISTS "Users can view case attachments in their organization" ON public.case_attachments;

CREATE POLICY "Users can view case attachments in their organization" ON public.case_attachments
  FOR SELECT USING (
    is_org_member(auth.uid(), organization_id)
    AND (
      access_group_id IS NULL 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR can_view_access_group(auth.uid(), access_group_id)
    )
  );

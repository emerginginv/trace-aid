-- Migration to add missing RLS policies for lifecycle and configuration tables
-- Fixes 403 Forbidden errors when managing statuses and types

-- 1. case_status_categories
ALTER TABLE public.case_status_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view case_status_categories" ON public.case_status_categories;
CREATE POLICY "Members can view case_status_categories" ON public.case_status_categories
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage case_status_categories" ON public.case_status_categories;
CREATE POLICY "Admins can manage case_status_categories" ON public.case_status_categories
  FOR ALL USING (
    is_org_member(auth.uid(), organization_id) AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = case_status_categories.organization_id 
      AND (role IN ('admin', 'owner', 'manager'))
    )
  );

-- 2. case_statuses
ALTER TABLE public.case_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view case_statuses" ON public.case_statuses;
CREATE POLICY "Members can view case_statuses" ON public.case_statuses
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage case_statuses" ON public.case_statuses;
CREATE POLICY "Admins can manage case_statuses" ON public.case_statuses
  FOR ALL USING (
    is_org_member(auth.uid(), organization_id) AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = case_statuses.organization_id 
      AND (role IN ('admin', 'owner', 'manager'))
    )
  );

-- 3. case_types
ALTER TABLE public.case_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view case_types" ON public.case_types;
CREATE POLICY "Members can view case_types" ON public.case_types
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage case_types" ON public.case_types;
CREATE POLICY "Admins can manage case_types" ON public.case_types
  FOR ALL USING (
    is_org_member(auth.uid(), organization_id) AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = case_types.organization_id 
      AND (role IN ('admin', 'owner', 'manager'))
    )
  );

-- 4. case_status_triggers
ALTER TABLE public.case_status_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view case_status_triggers" ON public.case_status_triggers;
CREATE POLICY "Members can view case_status_triggers" ON public.case_status_triggers
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage case_status_triggers" ON public.case_status_triggers;
CREATE POLICY "Admins can manage case_status_triggers" ON public.case_status_triggers
  FOR ALL USING (
    is_org_member(auth.uid(), organization_id) AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = case_status_triggers.organization_id 
      AND (role IN ('admin', 'owner', 'manager'))
    )
  );

-- 5. case_services
ALTER TABLE public.case_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view case_services" ON public.case_services;
CREATE POLICY "Members can view case_services" ON public.case_services
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage case_services" ON public.case_services;
CREATE POLICY "Admins can manage case_services" ON public.case_services
  FOR ALL USING (
    is_org_member(auth.uid(), organization_id) AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = case_services.organization_id 
      AND (role IN ('admin', 'owner', 'manager'))
    )
  );

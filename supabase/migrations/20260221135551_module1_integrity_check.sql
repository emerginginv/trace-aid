-- Module 1: Core Foundation - Integrity Check
-- Audit RLS Policies: Ensure every single table (cases, case_activities, case_updates, case_finances) has RLS.
-- This file adds the missing RLS policies ensuring organization_id isolation.

-- =========================================================================
-- case_activities policies
-- =========================================================================
CREATE POLICY "Users can view case activities in their organization" ON public.case_activities
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create case activities in their organization" ON public.case_activities
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update case activities in their organization" ON public.case_activities
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete case activities" ON public.case_activities
  FOR DELETE USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- =========================================================================
-- case_updates policies
-- =========================================================================
CREATE POLICY "Users can view case updates in their organization" ON public.case_updates
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create case updates in their organization" ON public.case_updates
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update case updates in their organization" ON public.case_updates
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete case updates" ON public.case_updates
  FOR DELETE USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- =========================================================================
-- case_finances policies
-- =========================================================================
CREATE POLICY "Users can view case finances in their organization" ON public.case_finances
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create case finances in their organization" ON public.case_finances
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update case finances in their organization" ON public.case_finances
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete case finances" ON public.case_finances
  FOR DELETE USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- =========================================================================
-- case_subjects policies (if not already existing)
-- =========================================================================
CREATE POLICY "Users can view case subjects in their organization" ON public.case_subjects
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create case subjects in their organization" ON public.case_subjects
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update case subjects in their organization" ON public.case_subjects
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete case subjects" ON public.case_subjects
  FOR DELETE USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- =========================================================================
-- case_attachments policies (if not already existing)
-- =========================================================================
CREATE POLICY "Users can view case attachments in their organization" ON public.case_attachments
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create case attachments in their organization" ON public.case_attachments
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update case attachments in their organization" ON public.case_attachments
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete case attachments" ON public.case_attachments
  FOR DELETE USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

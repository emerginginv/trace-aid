-- Clean up duplicate/legacy RLS policies on report_templates
-- Keep only the properly secured authenticated policies

-- Drop legacy policies without TO authenticated clause
DROP POLICY IF EXISTS "Users can view templates in their org or system templates" ON public.report_templates;
DROP POLICY IF EXISTS "Users can create templates in their org" ON public.report_templates;
DROP POLICY IF EXISTS "Users can update templates in their org" ON public.report_templates;
DROP POLICY IF EXISTS "Users can delete templates in their org" ON public.report_templates;

-- The secure policies already exist:
-- "Users can view templates" - TO authenticated, properly checks is_system_template OR is_org_member
-- "Users can create their own templates" - TO authenticated, requires org membership
-- "Users can update their own templates" - TO authenticated, requires org membership  
-- "Users can delete their own templates" - TO authenticated, requires org membership
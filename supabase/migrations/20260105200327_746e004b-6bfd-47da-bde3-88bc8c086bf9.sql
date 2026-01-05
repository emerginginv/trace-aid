-- Fix report_templates table RLS policies to require authentication
-- The issue: policies may allow unauthenticated access to system templates

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view templates" ON public.report_templates;
DROP POLICY IF EXISTS "Users can view their templates" ON public.report_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.report_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.report_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.report_templates;

-- Recreate SELECT policy requiring authentication
-- Users can view system templates OR their organization's templates
CREATE POLICY "Users can view templates"
ON public.report_templates
FOR SELECT
TO authenticated
USING (
  is_system_template = true 
  OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
);

-- Recreate INSERT policy requiring authentication
CREATE POLICY "Users can create their own templates"
ON public.report_templates
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND organization_id IS NOT NULL 
  AND is_org_member(auth.uid(), organization_id)
);

-- Recreate UPDATE policy requiring authentication
CREATE POLICY "Users can update their own templates"
ON public.report_templates
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND organization_id IS NOT NULL 
  AND is_org_member(auth.uid(), organization_id)
)
WITH CHECK (
  user_id = auth.uid() 
  AND organization_id IS NOT NULL 
  AND is_org_member(auth.uid(), organization_id)
);

-- Recreate DELETE policy requiring authentication
CREATE POLICY "Users can delete their own templates"
ON public.report_templates
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  AND organization_id IS NOT NULL 
  AND is_org_member(auth.uid(), organization_id)
);
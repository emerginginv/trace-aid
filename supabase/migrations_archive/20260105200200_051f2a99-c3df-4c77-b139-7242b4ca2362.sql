-- Fix organizations table RLS policies to require authentication
-- The issue: policies without TO authenticated allow unauthenticated access

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;

-- Recreate SELECT policy requiring authentication
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), id));

-- Recreate UPDATE policy requiring authentication (admins only)
CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  is_org_member(auth.uid(), id) 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  is_org_member(auth.uid(), id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);
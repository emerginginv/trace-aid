-- Fix accounts table RLS policies to require authentication
-- The issue: policies without TO authenticated allow unauthenticated access

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can create accounts in their organization" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their organization" ON public.accounts;
DROP POLICY IF EXISTS "Users can update accounts in their organization" ON public.accounts;
DROP POLICY IF EXISTS "Users can view accounts in their organization" ON public.accounts;

-- Recreate SELECT policy requiring authentication
CREATE POLICY "Users can view accounts in their organization"
ON public.accounts
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), organization_id));

-- Recreate INSERT policy requiring authentication
CREATE POLICY "Users can create accounts in their organization"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Recreate UPDATE policy requiring authentication
CREATE POLICY "Users can update accounts in their organization"
ON public.accounts
FOR UPDATE
TO authenticated
USING (is_org_member(auth.uid(), organization_id))
WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Recreate DELETE policy requiring authentication
CREATE POLICY "Users can delete accounts in their organization"
ON public.accounts
FOR DELETE
TO authenticated
USING (is_org_member(auth.uid(), organization_id));
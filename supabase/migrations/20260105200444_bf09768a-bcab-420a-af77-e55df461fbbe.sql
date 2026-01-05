-- Fix contacts table RLS policies to require authentication
-- The issue: policies without TO authenticated allow unauthenticated access

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their organization" ON public.contacts;

-- Recreate SELECT policy requiring authentication
CREATE POLICY "Users can view contacts in their organization"
ON public.contacts
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), organization_id));

-- Recreate INSERT policy requiring authentication
CREATE POLICY "Users can create contacts in their organization"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND is_org_member(auth.uid(), organization_id)
);

-- Recreate UPDATE policy requiring authentication
CREATE POLICY "Users can update contacts in their organization"
ON public.contacts
FOR UPDATE
TO authenticated
USING (is_org_member(auth.uid(), organization_id))
WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Recreate DELETE policy requiring authentication
CREATE POLICY "Users can delete contacts in their organization"
ON public.contacts
FOR DELETE
TO authenticated
USING (is_org_member(auth.uid(), organization_id));
-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Users can view picklists in their organization" ON public.picklists;

-- Create new SELECT policy that requires authentication
-- Users can see their org's picklists OR system-wide picklists (org_id IS NULL) but only if authenticated
CREATE POLICY "Authenticated users can view picklists"
ON public.picklists
FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) 
  OR organization_id IS NULL
);

-- Also update the INSERT policy to require authentication
DROP POLICY IF EXISTS "Users can insert picklists" ON public.picklists;

CREATE POLICY "Authenticated users can insert picklists"
ON public.picklists
FOR INSERT
TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  OR organization_id IS NULL
);
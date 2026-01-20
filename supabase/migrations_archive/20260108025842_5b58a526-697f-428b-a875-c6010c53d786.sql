-- Drop the problematic policy that allows public access
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

-- The existing "Users can view their organization" policy already correctly handles this for authenticated users
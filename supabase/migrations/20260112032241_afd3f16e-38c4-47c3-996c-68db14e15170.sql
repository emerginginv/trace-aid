-- Drop the overly permissive public SELECT policy on integrations
DROP POLICY IF EXISTS "Anyone can view active integrations" ON public.integrations;

-- Create a new policy that requires authentication
-- Any authenticated user can view active integrations (for marketplace browsing)
CREATE POLICY "Authenticated users can view active integrations"
ON public.integrations
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND is_active = true
);
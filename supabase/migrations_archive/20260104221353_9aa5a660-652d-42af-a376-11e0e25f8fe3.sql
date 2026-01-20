-- Drop the overly permissive policy that exposes all profile data publicly
DROP POLICY IF EXISTS "Anyone can check username availability" ON public.profiles;

-- Create a security definer function for checking username availability without exposing other data
CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = check_username
  )
$$;

-- Create a policy for authenticated users to view profiles of members in their organization
CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() 
      AND om2.user_id = profiles.id
  )
);
-- Allow admins to update user colors in profiles table
-- First, drop the existing update policy if it's too restrictive
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new update policy that allows users to update their own profile
-- OR allows admins to update any profile's color
CREATE POLICY "Users can update own profile, admins can update colors"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR 
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = id 
  OR 
  public.has_role(auth.uid(), 'admin')
);
-- Drop the problematic policy that allows public/anonymous access
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Recreate with proper authenticated role restriction
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);
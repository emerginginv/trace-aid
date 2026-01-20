-- Drop the restrictive policy that only lets users see their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create a new policy that allows all authenticated users to view all roles
-- This is necessary for team management where users need to see their teammates' roles
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Keep the admin-only policy for managing roles (INSERT/UPDATE/DELETE)
-- The existing "Admins can manage user roles" policy handles this
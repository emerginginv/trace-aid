-- Allow all authenticated users to view all profiles
-- This makes sense for a team management system where users need to see their teammates
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Also, let's give Brian an admin role so he can manage users
INSERT INTO public.user_roles (user_id, role)
VALUES ('b5d26813-1d81-4f25-b265-32ccf6d4f3fe', 'admin')
ON CONFLICT DO NOTHING;
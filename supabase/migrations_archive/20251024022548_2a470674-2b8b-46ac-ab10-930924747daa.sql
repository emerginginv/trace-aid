-- Remove overly permissive policies that expose user data to all authenticated users

-- 1. Remove policy that exposes all user profiles to any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- 2. Remove policy that exposes all user roles to any authenticated user  
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;

-- 3. Add policy for users to view their own roles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Users can view own roles'
  ) THEN
    CREATE POLICY "Users can view own roles"
    ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;
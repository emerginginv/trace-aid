-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username text;

-- Set default username as email prefix for all existing users
UPDATE public.profiles 
SET username = split_part(email, '@', 1);

-- Make username required and unique
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX profiles_username_unique ON public.profiles(username);

-- Add RLS policy for username uniqueness check
CREATE POLICY "Anyone can check username availability" ON public.profiles
  FOR SELECT
  USING (true);
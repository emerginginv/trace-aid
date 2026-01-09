-- Revoke anon access from profiles table
-- RLS requires auth.uid() so anon access is unnecessary
REVOKE ALL ON public.profiles FROM anon;
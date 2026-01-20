-- Drop existing policies that use 'public' role
DROP POLICY IF EXISTS "Users can create email change requests" ON public.email_change_requests;
DROP POLICY IF EXISTS "Users can view own email change requests" ON public.email_change_requests;

-- Recreate policies with 'authenticated' role for defense-in-depth
CREATE POLICY "Users can create email change requests"
ON public.email_change_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own email change requests"
ON public.email_change_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
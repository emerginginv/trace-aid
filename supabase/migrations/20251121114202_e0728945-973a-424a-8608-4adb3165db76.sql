-- Create password reset requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  completed_at TIMESTAMPTZ,
  email TEXT NOT NULL
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_token ON public.password_reset_requests(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON public.password_reset_requests(user_id);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Users can only view their own password reset requests
CREATE POLICY "Users can view own password reset requests"
  ON public.password_reset_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own password reset requests
CREATE POLICY "Users can insert own password reset requests"
  ON public.password_reset_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
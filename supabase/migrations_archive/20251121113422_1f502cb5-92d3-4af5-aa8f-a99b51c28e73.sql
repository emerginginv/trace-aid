-- Create table to store pending email change requests
CREATE TABLE IF NOT EXISTS public.email_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own email change requests
CREATE POLICY "Users can view own email change requests"
  ON public.email_change_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own email change requests
CREATE POLICY "Users can create email change requests"
  ON public.email_change_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster token lookups
CREATE INDEX idx_email_change_token ON public.email_change_requests(token) WHERE completed_at IS NULL;
-- Add notification preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT true;

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT,
  default_currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on organization_settings
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_settings
-- Users can view their own organization settings
CREATE POLICY "Users can view own organization settings"
ON public.organization_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own organization settings
CREATE POLICY "Users can insert own organization settings"
ON public.organization_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own organization settings
CREATE POLICY "Users can update own organization settings"
ON public.organization_settings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Add trigger for organization_settings updated_at
CREATE TRIGGER update_organization_settings_updated_at
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
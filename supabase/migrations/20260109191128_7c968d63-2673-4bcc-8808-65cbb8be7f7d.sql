-- Add additional profile fields for user management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS office_phone text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deactivated_by uuid;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.mobile_phone IS 'User mobile phone number';
COMMENT ON COLUMN public.profiles.office_phone IS 'User office phone number';
COMMENT ON COLUMN public.profiles.department IS 'User department or office';
COMMENT ON COLUMN public.profiles.address IS 'User street address';
COMMENT ON COLUMN public.profiles.city IS 'User city';
COMMENT ON COLUMN public.profiles.state IS 'User state/province';
COMMENT ON COLUMN public.profiles.zip_code IS 'User postal/zip code';
COMMENT ON COLUMN public.profiles.is_active IS 'Whether the user account is active (false = deactivated)';
COMMENT ON COLUMN public.profiles.deactivated_at IS 'Timestamp when the user was deactivated';
COMMENT ON COLUMN public.profiles.deactivated_by IS 'User ID of admin who deactivated this user';
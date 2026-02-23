-- Update access_groups table with missing fields from user request
ALTER TABLE public.access_groups 
ADD COLUMN IF NOT EXISTS default_verification boolean DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.access_groups.default_verification IS 'When enabled, the option to enable identity verification for link access is pre-selected.';

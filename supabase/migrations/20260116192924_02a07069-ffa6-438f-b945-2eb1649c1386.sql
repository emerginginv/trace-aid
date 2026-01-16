-- Add missing contact fields for enhanced contact management
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS middle_name text,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'full',
ADD COLUMN IF NOT EXISTS office_phone text,
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS home_phone text,
ADD COLUMN IF NOT EXISTS fax text;

-- Add comment for access_level options
COMMENT ON COLUMN public.contacts.access_level IS 'Access level options: disabled, limited, location, full';
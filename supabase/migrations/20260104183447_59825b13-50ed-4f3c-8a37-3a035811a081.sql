-- Add missing organization profile fields for report branding
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS website_url text;

-- Add comments for documentation
COMMENT ON COLUMN organization_settings.city IS 'City for organization address';
COMMENT ON COLUMN organization_settings.state IS 'State/Province for organization address';
COMMENT ON COLUMN organization_settings.zip_code IS 'ZIP/Postal code for organization address';
COMMENT ON COLUMN organization_settings.email IS 'General contact email for organization';
COMMENT ON COLUMN organization_settings.website_url IS 'Organization website URL';
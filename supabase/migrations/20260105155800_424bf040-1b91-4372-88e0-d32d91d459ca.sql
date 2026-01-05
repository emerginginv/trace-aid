-- Add square_logo_url column for in-app UI branding (separate from document logo)
ALTER TABLE public.organization_settings
ADD COLUMN square_logo_url TEXT;

COMMENT ON COLUMN public.organization_settings.square_logo_url IS 
'Square logo used for in-app UI branding (sidebar). Separate from logo_url used for documents.';
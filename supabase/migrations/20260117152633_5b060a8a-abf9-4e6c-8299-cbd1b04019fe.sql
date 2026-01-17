-- Create a secure view for public form branding that only exposes minimal fields
CREATE OR REPLACE VIEW public.organization_public_branding
WITH (security_invoker = false, security_barrier = true) AS
SELECT 
  organization_id,
  company_name,
  logo_url,
  square_logo_url,
  website_url
FROM organization_settings os
WHERE EXISTS (
  SELECT 1 
  FROM case_request_forms crf
  WHERE crf.organization_id = os.organization_id
    AND crf.is_active = true 
    AND crf.is_public = true
);

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.organization_public_branding TO anon;
GRANT SELECT ON public.organization_public_branding TO authenticated;

-- Drop the overly permissive policy on organization_settings
DROP POLICY IF EXISTS "Public can read org settings for public forms" ON organization_settings;
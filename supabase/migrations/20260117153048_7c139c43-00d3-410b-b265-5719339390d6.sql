-- Create a secure public view for case request forms that excludes sensitive notification emails
CREATE OR REPLACE VIEW public.case_request_forms_public
WITH (security_invoker = false, security_barrier = true) AS
SELECT 
  id,
  organization_id,
  form_name,
  form_slug,
  is_active,
  is_public,
  logo_url,
  organization_display_name,
  organization_phone,
  organization_website,
  header_instructions,
  primary_color,
  success_message,
  field_config,
  created_at,
  updated_at
  -- Intentionally EXCLUDED for security:
  -- staff_notification_emails (exposes internal staff emails for phishing)
  -- notify_staff_on_submission (internal workflow detail)
  -- send_confirmation_email (internal workflow detail)
  -- confirmation_email_subject (internal content)
  -- confirmation_email_body (internal content)
FROM case_request_forms
WHERE is_active = true AND is_public = true;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.case_request_forms_public TO anon;
GRANT SELECT ON public.case_request_forms_public TO authenticated;

-- Drop the overly permissive policy on case_request_forms base table
DROP POLICY IF EXISTS "Public can read active public forms" ON case_request_forms;
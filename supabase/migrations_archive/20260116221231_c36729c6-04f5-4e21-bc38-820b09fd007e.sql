-- Add policy for public access to organization branding via public forms
-- This allows unauthenticated users to see org branding when viewing public case request forms
CREATE POLICY "Public can read org settings for public forms"
  ON organization_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM case_request_forms 
      WHERE case_request_forms.organization_id = organization_settings.organization_id
        AND case_request_forms.is_active = true 
        AND case_request_forms.is_public = true
    )
  );
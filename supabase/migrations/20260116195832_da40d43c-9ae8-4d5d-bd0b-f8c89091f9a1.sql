-- Add approve_case_requests permission for all roles
INSERT INTO permissions (role, feature_key, allowed)
VALUES 
  ('admin', 'approve_case_requests', true),
  ('manager', 'approve_case_requests', true),
  ('investigator', 'approve_case_requests', false),
  ('vendor', 'approve_case_requests', false),
  ('member', 'approve_case_requests', false)
ON CONFLICT (role, feature_key) DO NOTHING;

-- Add manage_case_request_forms permission for all roles
INSERT INTO permissions (role, feature_key, allowed)
VALUES 
  ('admin', 'manage_case_request_forms', true),
  ('manager', 'manage_case_request_forms', false),
  ('investigator', 'manage_case_request_forms', false),
  ('vendor', 'manage_case_request_forms', false),
  ('member', 'manage_case_request_forms', false)
ON CONFLICT (role, feature_key) DO NOTHING;

-- Add case request settings columns to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS case_request_default_instructions text,
ADD COLUMN IF NOT EXISTS case_request_notification_emails text[];
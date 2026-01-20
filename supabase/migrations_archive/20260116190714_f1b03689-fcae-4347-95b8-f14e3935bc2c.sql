-- Add case request permissions for all roles
INSERT INTO permissions (role, feature_key, allowed) VALUES
  ('admin', 'view_case_requests', true),
  ('manager', 'view_case_requests', true),
  ('investigator', 'view_case_requests', false),
  ('vendor', 'view_case_requests', false),
  ('admin', 'edit_case_requests', true),
  ('manager', 'edit_case_requests', true),
  ('investigator', 'edit_case_requests', false),
  ('vendor', 'edit_case_requests', false),
  ('admin', 'delete_case_requests', true),
  ('manager', 'delete_case_requests', false),
  ('investigator', 'delete_case_requests', false),
  ('vendor', 'delete_case_requests', false)
ON CONFLICT (role, feature_key) DO NOTHING;
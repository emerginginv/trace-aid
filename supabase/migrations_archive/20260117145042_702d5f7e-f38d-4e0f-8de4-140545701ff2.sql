-- Add view_exact_status permission for role-based status visibility
-- Users without this permission will only see category names instead of exact status names

INSERT INTO permissions (role, feature_key, allowed)
VALUES 
  ('admin', 'view_exact_status', true),
  ('manager', 'view_exact_status', true),
  ('investigator', 'view_exact_status', false),
  ('vendor', 'view_exact_status', false)
ON CONFLICT (role, feature_key) DO NOTHING;
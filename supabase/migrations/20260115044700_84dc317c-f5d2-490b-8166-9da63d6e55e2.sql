-- Add ownership-based edit/delete permissions for updates
-- These allow investigators/vendors to edit/delete their own updates even without global edit_updates permission

INSERT INTO permissions (role, feature_key, allowed) VALUES
  ('admin', 'edit_own_updates', true),
  ('manager', 'edit_own_updates', true),
  ('investigator', 'edit_own_updates', true),
  ('vendor', 'edit_own_updates', true),
  ('admin', 'delete_own_updates', true),
  ('manager', 'delete_own_updates', true),
  ('investigator', 'delete_own_updates', false),
  ('vendor', 'delete_own_updates', false)
ON CONFLICT (role, feature_key) DO NOTHING;
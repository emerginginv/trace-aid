-- Add permissions for Activities
INSERT INTO permissions (role, feature_key, allowed) VALUES
  ('admin', 'view_activities', true), ('admin', 'add_activities', true), 
  ('admin', 'edit_activities', true), ('admin', 'delete_activities', true),
  ('manager', 'view_activities', true), ('manager', 'add_activities', true),
  ('manager', 'edit_activities', true), ('manager', 'delete_activities', true),
  ('investigator', 'view_activities', true), ('investigator', 'add_activities', true),
  ('investigator', 'edit_activities', false), ('investigator', 'delete_activities', false),
  ('vendor', 'view_activities', true), ('vendor', 'add_activities', false),
  ('vendor', 'edit_activities', false), ('vendor', 'delete_activities', false)
ON CONFLICT (role, feature_key) DO NOTHING;

-- Add permissions for Attachments
INSERT INTO permissions (role, feature_key, allowed) VALUES
  ('admin', 'view_attachments', true), ('admin', 'add_attachments', true),
  ('admin', 'edit_attachments', true), ('admin', 'delete_attachments', true),
  ('manager', 'view_attachments', true), ('manager', 'add_attachments', true),
  ('manager', 'edit_attachments', true), ('manager', 'delete_attachments', true),
  ('investigator', 'view_attachments', true), ('investigator', 'add_attachments', true),
  ('investigator', 'edit_attachments', false), ('investigator', 'delete_attachments', false),
  ('vendor', 'view_attachments', true), ('vendor', 'add_attachments', true),
  ('vendor', 'edit_attachments', false), ('vendor', 'delete_attachments', false)
ON CONFLICT (role, feature_key) DO NOTHING;

-- Add permissions for Subjects
INSERT INTO permissions (role, feature_key, allowed) VALUES
  ('admin', 'view_subjects', true), ('admin', 'add_subjects', true),
  ('admin', 'edit_subjects', true), ('admin', 'delete_subjects', true),
  ('manager', 'view_subjects', true), ('manager', 'add_subjects', true),
  ('manager', 'edit_subjects', true), ('manager', 'delete_subjects', true),
  ('investigator', 'view_subjects', true), ('investigator', 'add_subjects', true),
  ('investigator', 'edit_subjects', false), ('investigator', 'delete_subjects', false),
  ('vendor', 'view_subjects', true), ('vendor', 'add_subjects', false),
  ('vendor', 'edit_subjects', false), ('vendor', 'delete_subjects', false)
ON CONFLICT (role, feature_key) DO NOTHING;

-- Add permissions for Updates
INSERT INTO permissions (role, feature_key, allowed) VALUES
  ('admin', 'view_updates', true), ('admin', 'add_updates', true),
  ('admin', 'edit_updates', true), ('admin', 'delete_updates', true),
  ('manager', 'view_updates', true), ('manager', 'add_updates', true),
  ('manager', 'edit_updates', true), ('manager', 'delete_updates', true),
  ('investigator', 'view_updates', true), ('investigator', 'add_updates', true),
  ('investigator', 'edit_updates', false), ('investigator', 'delete_updates', false),
  ('vendor', 'view_updates', true), ('vendor', 'add_updates', true),
  ('vendor', 'edit_updates', false), ('vendor', 'delete_updates', false)
ON CONFLICT (role, feature_key) DO NOTHING;
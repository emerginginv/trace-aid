-- Add missing finance permissions: add_finances and delete_finances for all roles
INSERT INTO public.permissions (role, feature_key, allowed)
VALUES 
  ('admin', 'add_finances', true),
  ('admin', 'delete_finances', true),
  ('manager', 'add_finances', true),
  ('manager', 'delete_finances', true),
  ('investigator', 'add_finances', false),
  ('investigator', 'delete_finances', false),
  ('vendor', 'add_finances', false),
  ('vendor', 'delete_finances', false)
ON CONFLICT DO NOTHING;
-- Add the new add_cases permission for all roles
INSERT INTO public.permissions (role, feature_key, allowed)
VALUES
  ('admin', 'add_cases', true),
  ('manager', 'add_cases', true),
  ('investigator', 'add_cases', false),
  ('vendor', 'add_cases', false)
ON CONFLICT (role, feature_key) DO NOTHING;
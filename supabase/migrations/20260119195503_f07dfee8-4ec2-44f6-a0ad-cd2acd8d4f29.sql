-- Add 'owner' to app_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'owner'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'owner';
  END IF;
END $$;

-- Update trigger to handle roles and permissions correctly
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_subdomain TEXT;
BEGIN
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'full_name',
    'My Organization'
  );
  org_subdomain := generate_org_subdomain(org_name);

  INSERT INTO public.organizations (
    name, billing_email, subdomain, subscription_status, plan_key, plan_features
  )
  VALUES (
    org_name, NEW.email, org_subdomain, 'pending_payment', 'solo', '{}'::jsonb
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner member
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Also add admin role for system permissions
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
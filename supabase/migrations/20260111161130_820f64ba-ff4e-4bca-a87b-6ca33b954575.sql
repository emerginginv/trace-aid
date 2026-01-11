-- Update handle_new_user_org to set subscription_status to pending_payment
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_subdomain TEXT;
BEGIN
  -- Generate a unique subdomain from user email or name
  org_subdomain := LOWER(REGEXP_REPLACE(
    COALESCE(
      SPLIT_PART(NEW.email, '@', 1),
      NEW.raw_user_meta_data->>'full_name',
      'org'
    ),
    '[^a-z0-9]', '', 'g'
  )) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
  
  -- Create a new organization for the user with pending_payment status
  INSERT INTO public.organizations (
    name,
    billing_email,
    subdomain,
    subscription_status,
    plan_key,
    plan_features
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Organization'),
    NEW.email,
    org_subdomain,
    'pending_payment',
    'solo',
    '{}'::jsonb
  )
  RETURNING id INTO new_org_id;
  
  -- Add user as admin member of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');
  
  -- Add admin role to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;
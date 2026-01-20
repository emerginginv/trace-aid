-- Fix signup 500: handle_new_user_org was inserting into profiles with username NULL.
-- Rely on handle_new_user() to create the profile + username, and only handle org creation/membership here.

CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_subdomain TEXT;
BEGIN
  -- Get organization name from user metadata, fallback to full name or "My Organization"
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'full_name',
    'My Organization'
  );

  -- Generate unique subdomain from organization name (sanitized)
  org_subdomain := generate_org_subdomain(org_name);

  -- Create organization
  INSERT INTO public.organizations (
    name,
    billing_email,
    subdomain,
    subscription_status,
    plan_key,
    plan_features
  )
  VALUES (
    org_name,
    NEW.email,
    org_subdomain,
    'pending_payment',
    'solo',
    '{}'::jsonb
  )
  RETURNING id INTO new_org_id;

  -- Add user as admin/owner member of their organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
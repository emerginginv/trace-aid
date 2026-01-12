-- Create helper function to generate unique subdomain from organization name
CREATE OR REPLACE FUNCTION public.generate_org_subdomain(p_org_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_subdomain text;
  v_subdomain text;
  v_counter int := 1;
BEGIN
  -- Sanitize: lowercase, remove special chars, take first 8 chars
  v_base_subdomain := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]', '', 'g'));
  v_base_subdomain := substring(v_base_subdomain, 1, 8);
  
  -- Ensure minimum length (fallback to 'org')
  IF length(v_base_subdomain) < 2 THEN
    v_base_subdomain := 'org';
  END IF;
  
  v_subdomain := v_base_subdomain;
  
  -- Find unique subdomain by appending numbers if needed
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE subdomain = v_subdomain)
     OR EXISTS (SELECT 1 FROM public.reserved_subdomains WHERE subdomain = v_subdomain) LOOP
    v_subdomain := v_base_subdomain || v_counter::text;
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_subdomain;
END;
$$;

-- Update handle_new_user_org to use organization name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Generate unique subdomain from organization name (first 8 chars, sanitized)
  org_subdomain := generate_org_subdomain(org_name);
  
  -- Create organization with the proper name and subdomain
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
  
  -- Create profile for the new user
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', NULL)
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  -- Add user as admin member of their organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;
-- Update handle_new_user_org function to support custom subdomain and expanded profile info
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  base_subdomain text;
  final_subdomain text;
  company_name_val text;
  provided_subdomain text;
  counter integer := 0;
  first_word text;
BEGIN
  -- Create profile with expanded info
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    username,
    mobile_phone,
    company_name,
    address,
    city,
    state,
    zip_code
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'company_name'),
    NEW.raw_user_meta_data->>'billing_address',
    NEW.raw_user_meta_data->>'billing_city',
    NEW.raw_user_meta_data->>'billing_state',
    NEW.raw_user_meta_data->>'billing_zip'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Get company name and provided subdomain from metadata
  company_name_val := COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'company_name');
  provided_subdomain := NEW.raw_user_meta_data->>'subdomain';
  
  -- Generate or use provided subdomain
  IF provided_subdomain IS NOT NULL AND length(provided_subdomain) > 0 THEN
      base_subdomain := lower(regexp_replace(provided_subdomain, '[^a-z0-9-]', '', 'g'));
  ELSIF company_name_val IS NOT NULL AND length(company_name_val) > 0 THEN
      first_word := split_part(company_name_val, ' ', 1);
      base_subdomain := lower(regexp_replace(first_word, '[^a-zA-Z0-9]', '', 'g'));
      
      IF length(base_subdomain) = 0 THEN
         base_subdomain := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
      END IF;
  ELSE
      base_subdomain := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  END IF;

  IF length(base_subdomain) < 3 THEN
    base_subdomain := base_subdomain || 'org';
  END IF;
  
  final_subdomain := base_subdomain;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE subdomain = final_subdomain) LOOP
    counter := counter + 1;
    final_subdomain := base_subdomain || counter::text;
  END LOOP;

  -- Create organization
  INSERT INTO public.organizations (name, subdomain)
  VALUES (
    COALESCE(company_name_val, split_part(NEW.email, '@', 1) || '''s Organization'),
    final_subdomain
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Add admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  -- UPDATE user metadata with the final subdomain
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('subdomain', final_subdomain)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

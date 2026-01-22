-- Update handle_new_user_org function to derive subdomain from organization name
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
  company_name text;
  counter integer := 0;
  first_word text;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Get company name from metadata
  -- Auth.tsx sends 'organization_name', but previously we also looked for 'company_name'
  company_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'company_name');
  
  -- Generate unique subdomain
  IF company_name IS NOT NULL AND length(company_name) > 0 THEN
      -- Use first word of organization name
      first_word := split_part(company_name, ' ', 1);
      base_subdomain := lower(regexp_replace(first_word, '[^a-zA-Z0-9]', '', 'g'));
      
      -- If the first word results in empty string (e.g. only symbols), fall back
      IF length(base_subdomain) = 0 THEN
         base_subdomain := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
      END IF;
  ELSE
      -- Fallback to email username if no organization name
      base_subdomain := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  END IF;

  -- Ensure minimum length
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
    COALESCE(company_name, split_part(NEW.email, '@', 1) || '''s Organization'),
    final_subdomain
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Add admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

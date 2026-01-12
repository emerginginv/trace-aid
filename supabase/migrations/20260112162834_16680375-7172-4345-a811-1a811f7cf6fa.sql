-- Fix search_path for generate_org_subdomain function
CREATE OR REPLACE FUNCTION public.generate_org_subdomain(p_org_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
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
-- Update the is_enterprise_org function to include 'pro' tier
CREATE OR REPLACE FUNCTION public.is_enterprise_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT subscription_tier IN ('enterprise', 'professional', 'pro') 
     FROM organizations WHERE id = p_org_id),
    false
  );
$$;
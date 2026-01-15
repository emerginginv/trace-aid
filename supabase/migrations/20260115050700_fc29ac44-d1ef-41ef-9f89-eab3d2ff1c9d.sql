-- Fix: Organization Details Exposed Through Subdomain Lookup
-- The current policy allows ANY authenticated user to view ANY organization by subdomain
-- This exposes sensitive data: stripe_customer_id, billing_email, subscription_tier, etc.

-- Drop the overly permissive subdomain lookup policy
DROP POLICY IF EXISTS "Users can view organizations by subdomain lookup" ON organizations;

-- The remaining SELECT policies are:
-- 1. "Users can view their organization" - USING: is_org_member(auth.uid(), id)
-- 2. "Admins can view all organizations" - for platform-level admin roles
-- These are sufficient for normal operations.

-- Create a secure RPC function for subdomain resolution that returns ONLY public/safe data
-- This function is SECURITY DEFINER to bypass RLS for the lookup, but only returns minimal safe data
CREATE OR REPLACE FUNCTION public.resolve_organization_by_subdomain(p_subdomain text)
RETURNS TABLE(
  organization_id uuid,
  organization_name text,
  subdomain text,
  logo_url text,
  is_active boolean,
  login_branding_enabled boolean,
  login_logo_url text,
  login_brand_name text,
  login_accent_color text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return only safe/public fields needed for subdomain resolution and branding
  -- Never return: stripe_customer_id, billing_email, stripe_subscription_id, etc.
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.subdomain,
    o.logo_url,
    o.is_active,
    o.login_branding_enabled,
    o.login_logo_url,
    o.login_brand_name,
    o.login_accent_color
  FROM organizations o
  WHERE lower(o.subdomain) = lower(p_subdomain)
    AND o.status = 'active'
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users and anon (for login page branding)
GRANT EXECUTE ON FUNCTION public.resolve_organization_by_subdomain(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_organization_by_subdomain(text) TO anon;

-- Add comment explaining the security design
COMMENT ON FUNCTION public.resolve_organization_by_subdomain IS 
'Secure subdomain resolution that returns only public/safe organization data. 
Used for initial tenant detection and login branding. Does NOT expose sensitive 
billing/subscription data. Uses SECURITY DEFINER to bypass RLS for lookup only.';
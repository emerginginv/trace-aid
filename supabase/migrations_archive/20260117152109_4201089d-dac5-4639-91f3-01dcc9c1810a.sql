-- Fix the security definer view issue by recreating with security_invoker
DROP VIEW IF EXISTS public.profiles_secure;

-- Recreate with security_invoker = true (runs with caller's permissions, not definer's)
CREATE VIEW public.profiles_secure 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  p.username,
  p.department,
  p.is_active,
  p.color,
  p.company_name,
  -- Only show email to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.email
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.email
    ELSE NULL
  END AS email,
  -- Only show notification_email to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.notification_email
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.notification_email
    ELSE NULL
  END AS notification_email,
  -- Only show mobile_phone to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.mobile_phone
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.mobile_phone
    ELSE NULL
  END AS mobile_phone,
  -- Only show office_phone to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.office_phone
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.office_phone
    ELSE NULL
  END AS office_phone,
  -- Only show address info to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.address
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.address
    ELSE NULL
  END AS address,
  CASE 
    WHEN p.id = auth.uid() THEN p.city
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.city
    ELSE NULL
  END AS city,
  CASE 
    WHEN p.id = auth.uid() THEN p.state
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.state
    ELSE NULL
  END AS state,
  CASE 
    WHEN p.id = auth.uid() THEN p.zip_code
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.zip_code
    ELSE NULL
  END AS zip_code,
  p.notification_sms,
  p.notification_push,
  CASE 
    WHEN p.id = auth.uid() THEN p.deactivated_at
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.deactivated_at
    ELSE NULL
  END AS deactivated_at,
  CASE 
    WHEN p.id = auth.uid() THEN p.deactivated_by
    WHEN public.is_admin_or_manager(auth.uid()) THEN p.deactivated_by
    ELSE NULL
  END AS deactivated_by,
  p.allowed_regions
FROM public.profiles p;

-- Grant access to the view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Add comment explaining the view
COMMENT ON VIEW public.profiles_secure IS 'Secure view of profiles that masks email, phone numbers, and address for non-admin users. Use this view instead of the profiles table when displaying user lists to prevent contact info harvesting.';
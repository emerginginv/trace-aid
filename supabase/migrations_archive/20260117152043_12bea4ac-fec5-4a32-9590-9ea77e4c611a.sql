-- Create a secure view that masks sensitive profile data for non-admin users
-- This implements field-level access control for the profiles table

-- First, create a helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = p_user_id 
      AND role IN ('admin', 'manager')
  )
$$;

-- Create a secure view that masks contact info for non-privileged users
CREATE OR REPLACE VIEW public.profiles_secure AS
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
    WHEN is_admin_or_manager(auth.uid()) THEN p.email
    ELSE NULL
  END AS email,
  -- Only show notification_email to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.notification_email
    WHEN is_admin_or_manager(auth.uid()) THEN p.notification_email
    ELSE NULL
  END AS notification_email,
  -- Only show mobile_phone to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.mobile_phone
    WHEN is_admin_or_manager(auth.uid()) THEN p.mobile_phone
    ELSE NULL
  END AS mobile_phone,
  -- Only show office_phone to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.office_phone
    WHEN is_admin_or_manager(auth.uid()) THEN p.office_phone
    ELSE NULL
  END AS office_phone,
  -- Only show address info to the user themselves, admins, or managers
  CASE 
    WHEN p.id = auth.uid() THEN p.address
    WHEN is_admin_or_manager(auth.uid()) THEN p.address
    ELSE NULL
  END AS address,
  CASE 
    WHEN p.id = auth.uid() THEN p.city
    WHEN is_admin_or_manager(auth.uid()) THEN p.city
    ELSE NULL
  END AS city,
  CASE 
    WHEN p.id = auth.uid() THEN p.state
    WHEN is_admin_or_manager(auth.uid()) THEN p.state
    ELSE NULL
  END AS state,
  CASE 
    WHEN p.id = auth.uid() THEN p.zip_code
    WHEN is_admin_or_manager(auth.uid()) THEN p.zip_code
    ELSE NULL
  END AS zip_code,
  -- These are user preferences, keep them accessible to the user
  p.notification_sms,
  p.notification_push,
  -- Admin-only fields
  CASE 
    WHEN p.id = auth.uid() THEN p.deactivated_at
    WHEN is_admin_or_manager(auth.uid()) THEN p.deactivated_at
    ELSE NULL
  END AS deactivated_at,
  CASE 
    WHEN p.id = auth.uid() THEN p.deactivated_by
    WHEN is_admin_or_manager(auth.uid()) THEN p.deactivated_by
    ELSE NULL
  END AS deactivated_by,
  p.allowed_regions
FROM public.profiles p;

-- Grant access to the view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Add comment explaining the view
COMMENT ON VIEW public.profiles_secure IS 'Secure view of profiles that masks email, phone numbers, and address for non-admin users. Use this view instead of the profiles table when displaying user lists to prevent contact info harvesting.';
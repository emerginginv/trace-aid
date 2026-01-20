-- Fix token exposure in email_change_requests and password_reset_requests
-- Tokens should NEVER be exposed via API - only validated server-side

-- =====================================================
-- Step 1: Revoke SELECT on email_change_requests
-- =====================================================
REVOKE SELECT ON public.email_change_requests FROM authenticated;
-- (anon already revoked in previous migration)

-- =====================================================
-- Step 2: Fix password_reset_requests security
-- =====================================================
-- Revoke all access from anon and authenticated
REVOKE ALL ON public.password_reset_requests FROM anon;
REVOKE SELECT ON public.password_reset_requests FROM authenticated;

-- Grant INSERT to authenticated (needed for creating reset requests)
GRANT INSERT ON public.password_reset_requests TO authenticated;

-- =====================================================
-- Step 3: Create secure function for password reset requests
-- Returns user's own requests WITHOUT token
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_password_reset_requests()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  expires_at timestamptz,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return requests for the authenticated user
  -- Token is intentionally excluded for security
  RETURN QUERY
  SELECT 
    prr.id,
    prr.email,
    prr.created_at,
    prr.expires_at,
    prr.completed_at
  FROM password_reset_requests prr
  WHERE prr.user_id = auth.uid();
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.get_my_password_reset_requests() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_password_reset_requests() TO authenticated;

-- =====================================================
-- Step 4: Verify get_my_email_change_requests exists and is secure
-- (created in previous migration, just ensure it's correct)
-- =====================================================
-- Already created with token excluded
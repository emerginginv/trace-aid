-- Fix email_change_requests_safe view security
-- Issue: View has no RLS and is publicly accessible

-- Step 1: Drop the existing view
DROP VIEW IF EXISTS public.email_change_requests_safe;

-- Step 2: Revoke any existing grants on the base table from anon
REVOKE ALL ON public.email_change_requests FROM anon;

-- Step 3: Grant only INSERT to authenticated (needed for creating requests)
GRANT INSERT ON public.email_change_requests TO authenticated;
GRANT SELECT ON public.email_change_requests TO authenticated;

-- Step 4: Create a secure function to get user's own email change requests
-- Using SECURITY DEFINER with explicit search_path for safety
CREATE OR REPLACE FUNCTION public.get_my_email_change_requests()
RETURNS TABLE (
  id uuid,
  old_email text,
  new_email text,
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
    ecr.id,
    ecr.old_email,
    ecr.new_email,
    ecr.created_at,
    ecr.expires_at,
    ecr.completed_at
  FROM email_change_requests ecr
  WHERE ecr.user_id = auth.uid();
END;
$$;

-- Step 5: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.get_my_email_change_requests() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_email_change_requests() TO authenticated;
-- Create a secure function to update user roles
-- This function runs with elevated privileges to bypass RLS
CREATE OR REPLACE FUNCTION public.update_user_role(
  _user_id uuid,
  _new_role app_role,
  _org_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin in the organization
  IF NOT (
    SELECT EXISTS (
      SELECT 1 
      FROM public.organization_members om
      JOIN public.user_roles ur ON ur.user_id = om.user_id
      WHERE om.organization_id = _org_id
        AND om.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  -- Update organization_members role
  UPDATE public.organization_members
  SET role = _new_role
  WHERE user_id = _user_id 
    AND organization_id = _org_id;

  -- Delete existing user_roles entry
  DELETE FROM public.user_roles
  WHERE user_id = _user_id;

  -- Insert new user_roles entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _new_role);
END;
$$;
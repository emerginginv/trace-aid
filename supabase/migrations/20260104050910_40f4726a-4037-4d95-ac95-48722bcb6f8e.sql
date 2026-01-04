-- Fix has_permission() to use organization_members instead of user_roles
-- This aligns with how the UI determines roles and fixes the silent update failures

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _feature_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT p.allowed
      FROM public.permissions p
      JOIN public.organization_members om ON om.role = p.role
      WHERE om.user_id = _user_id
        AND p.feature_key = _feature_key
      ORDER BY om.created_at ASC
      LIMIT 1
    ),
    false
  )
$function$;
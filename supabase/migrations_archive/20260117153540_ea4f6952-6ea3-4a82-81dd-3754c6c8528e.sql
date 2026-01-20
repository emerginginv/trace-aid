-- Fix all functions missing search_path parameter
-- SECURITY DEFINER functions (highest priority - 8 functions)

ALTER FUNCTION public.fix_status_history_timestamps(p_organization_id uuid, p_user_id uuid, p_dry_run boolean)
SET search_path = public;

ALTER FUNCTION public.get_status_id_from_legacy(p_organization_id uuid, p_legacy_status text)
SET search_path = public;

ALTER FUNCTION public.migrate_case_status_data(p_organization_id uuid, p_user_id uuid, p_dry_run boolean)
SET search_path = public;

ALTER FUNCTION public.rollback_status_migration(p_log_id uuid)
SET search_path = public;

ALTER FUNCTION public.sync_case_active_services()
SET search_path = public;

ALTER FUNCTION public.sync_case_category_transitions(p_organization_id uuid, p_override_existing boolean, p_user_id uuid)
SET search_path = public;

ALTER FUNCTION public.toggle_legacy_status_lock(p_enable boolean)
SET search_path = public;

ALTER FUNCTION public.validate_status_migration(p_organization_id uuid)
SET search_path = public;

-- Non-SECURITY DEFINER functions (lower priority but still fixing - 1 function)
ALTER FUNCTION public.prevent_legacy_status_update()
SET search_path = public;
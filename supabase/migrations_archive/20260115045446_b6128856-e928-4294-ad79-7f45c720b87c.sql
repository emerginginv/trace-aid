-- Fix Function Search Path Mutable security warnings
-- Set search_path = public on all functions missing this setting

-- 1. enforce_pricing_rules (SECURITY DEFINER - critical to fix)
ALTER FUNCTION public.enforce_pricing_rules() SET search_path = public;

-- 2. is_service_available_for_case_type
ALTER FUNCTION public.is_service_available_for_case_type(p_service_case_types text[], p_case_type_tag text) SET search_path = public;

-- 3. log_budget_adjustment (SECURITY DEFINER - critical to fix)
ALTER FUNCTION public.log_budget_adjustment() SET search_path = public;

-- 4. prevent_locked_activity_edit
ALTER FUNCTION public.prevent_locked_activity_edit() SET search_path = public;

-- 5. prevent_locked_record_delete
ALTER FUNCTION public.prevent_locked_record_delete() SET search_path = public;

-- 6. prevent_locked_service_edit
ALTER FUNCTION public.prevent_locked_service_edit() SET search_path = public;

-- 7. validate_invoice_status_transition
ALTER FUNCTION public.validate_invoice_status_transition(p_current_status text, p_new_status text) SET search_path = public;
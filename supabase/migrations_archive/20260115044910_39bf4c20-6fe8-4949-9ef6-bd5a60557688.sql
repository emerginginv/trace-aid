-- Fix security definer issue on case_enforcement_summary view
-- Set security_invoker=true so RLS policies of the querying user are enforced

ALTER VIEW public.case_enforcement_summary SET (security_invoker = true);
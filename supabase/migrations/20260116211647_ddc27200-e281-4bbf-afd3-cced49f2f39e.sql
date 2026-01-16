-- Fix security definer on the new view by explicitly setting SECURITY INVOKER
-- This ensures RLS policies are applied based on the querying user, not the view creator
ALTER VIEW public.case_finances_view SET (security_invoker = true);
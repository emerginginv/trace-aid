-- Fix the set_vulnerability_sla function by adding a fixed search_path
-- This prevents search_path injection attacks where a malicious user could
-- create objects in their schema that shadow public schema objects

CREATE OR REPLACE FUNCTION public.set_vulnerability_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := public.calculate_vulnerability_sla(NEW.severity::text);
  END IF;
  RETURN NEW;
END;
$function$;
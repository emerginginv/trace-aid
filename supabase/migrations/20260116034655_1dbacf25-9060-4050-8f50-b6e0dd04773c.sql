-- Fix security: Add search_path to functions that are missing it
-- This prevents potential search path manipulation attacks

CREATE OR REPLACE FUNCTION public.validate_expense_entry_rate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.rate IS NULL THEN
    RAISE EXCEPTION 'Expense entry requires a pay rate. Configure rate in User Profile > Compensation.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_time_entry_rate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.rate IS NULL THEN
    RAISE EXCEPTION 'Time entry requires a pay rate. Configure rate in User Profile > Compensation.';
  END IF;
  RETURN NEW;
END;
$function$;
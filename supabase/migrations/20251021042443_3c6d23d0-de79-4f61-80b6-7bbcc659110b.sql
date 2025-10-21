-- Add hours and hourly_rate columns to case_finances table for time tracking
ALTER TABLE public.case_finances 
ADD COLUMN hours numeric,
ADD COLUMN hourly_rate numeric;
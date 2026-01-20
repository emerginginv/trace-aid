-- Add reference_number_2 and reference_number_3 columns to cases table
ALTER TABLE public.cases
ADD COLUMN reference_number_2 TEXT,
ADD COLUMN reference_number_3 TEXT;
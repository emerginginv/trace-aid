-- Remove priority column from cases table
ALTER TABLE public.cases DROP COLUMN IF EXISTS priority;
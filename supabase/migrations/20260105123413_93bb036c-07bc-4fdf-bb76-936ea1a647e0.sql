-- Drop the received column from cases table (using created_at instead)
ALTER TABLE public.cases DROP COLUMN IF EXISTS received;
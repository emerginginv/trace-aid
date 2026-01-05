-- Rename start_date column to received in cases table
ALTER TABLE public.cases RENAME COLUMN start_date TO received;

-- Add a comment to document the column's purpose
COMMENT ON COLUMN public.cases.received IS 'The date the case was entered into the system. Automatically set on creation.';
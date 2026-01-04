-- Add structured case variables columns to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS claim_number text,
ADD COLUMN IF NOT EXISTS surveillance_start_date date,
ADD COLUMN IF NOT EXISTS surveillance_end_date date;
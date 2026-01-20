-- Drop the global unique constraint on case_number
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_case_number_key;

-- Add a unique constraint per organization instead
ALTER TABLE cases ADD CONSTRAINT cases_org_case_number_key 
  UNIQUE (organization_id, case_number);
-- Add unique constraint for case_number per organization
-- This ensures no duplicate case numbers within the same organization
ALTER TABLE cases 
ADD CONSTRAINT unique_case_number_per_org UNIQUE (organization_id, case_number);
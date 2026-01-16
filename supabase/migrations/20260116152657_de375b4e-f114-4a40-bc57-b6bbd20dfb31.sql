-- Make cases.title nullable to support deferred title generation until Step 3
-- Title will be set when primary subject is designated in Step 3

ALTER TABLE cases ALTER COLUMN title DROP NOT NULL;

-- Add comment explaining the business rule
COMMENT ON COLUMN cases.title IS 'Case title - derived from primary subject name. Can be null until primary subject is assigned in wizard Step 3.';
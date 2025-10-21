-- Add update_type column to case_updates table
ALTER TABLE case_updates 
ADD COLUMN update_type text NOT NULL DEFAULT 'Other';

-- Add a check constraint to ensure valid update types
ALTER TABLE case_updates
ADD CONSTRAINT valid_update_type CHECK (
  update_type IN (
    'Surveillance',
    'Case Update',
    'Accounting',
    'Client Contact',
    '3rd Party Contact',
    'Review',
    'Other'
  )
);
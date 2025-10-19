-- Enhance case_finances table with additional fields
ALTER TABLE case_finances
ADD COLUMN subject_id uuid REFERENCES case_subjects(id) ON DELETE SET NULL,
ADD COLUMN activity_id uuid REFERENCES case_activities(id) ON DELETE SET NULL,
ADD COLUMN category text,
ADD COLUMN start_date date,
ADD COLUMN end_date date,
ADD COLUMN billing_frequency text,
ADD COLUMN invoice_number text,
ADD COLUMN notes text;

-- Add index for better query performance
CREATE INDEX idx_case_finances_subject_id ON case_finances(subject_id);
CREATE INDEX idx_case_finances_activity_id ON case_finances(activity_id);
CREATE INDEX idx_case_finances_invoice_number ON case_finances(invoice_number);
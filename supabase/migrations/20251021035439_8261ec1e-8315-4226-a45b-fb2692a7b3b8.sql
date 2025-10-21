-- Add metadata columns to case_attachments table
ALTER TABLE public.case_attachments
ADD COLUMN name TEXT,
ADD COLUMN description TEXT,
ADD COLUMN tags TEXT[];

-- Set default name to file_name for existing records
UPDATE public.case_attachments
SET name = file_name
WHERE name IS NULL;
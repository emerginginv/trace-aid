-- Add is_primary column to case_subjects table
ALTER TABLE public.case_subjects ADD COLUMN is_primary boolean DEFAULT false;

-- Create an index for faster lookups
CREATE INDEX idx_case_subjects_is_primary ON public.case_subjects(case_id, is_primary) WHERE is_primary = true;

-- Function to ensure only one primary subject per case
CREATE OR REPLACE FUNCTION public.ensure_single_primary_subject()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this subject as primary, unset all other primaries for this case
  IF NEW.is_primary = true THEN
    UPDATE public.case_subjects 
    SET is_primary = false 
    WHERE case_id = NEW.case_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to run the function before insert or update
CREATE TRIGGER ensure_single_primary_subject_trigger
BEFORE INSERT OR UPDATE ON public.case_subjects
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_primary_subject();
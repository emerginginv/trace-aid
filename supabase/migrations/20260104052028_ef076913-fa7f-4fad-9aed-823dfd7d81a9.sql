-- Add column to track if case title should sync with primary subject
ALTER TABLE cases 
ADD COLUMN use_primary_subject_as_title boolean DEFAULT false;

-- Create function to sync case title with primary subject name
CREATE OR REPLACE FUNCTION sync_case_title_with_primary_subject()
RETURNS TRIGGER AS $$
BEGIN
  -- When a subject is set as primary
  IF NEW.is_primary = true THEN
    -- Update the case title if the case is configured to use primary subject as title
    UPDATE cases 
    SET title = NEW.name, updated_at = NOW()
    WHERE id = NEW.case_id 
      AND use_primary_subject_as_title = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update case title when primary subject changes
CREATE TRIGGER sync_case_title_on_primary_subject
AFTER INSERT OR UPDATE ON case_subjects
FOR EACH ROW
EXECUTE FUNCTION sync_case_title_with_primary_subject();
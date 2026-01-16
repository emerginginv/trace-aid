-- Create trigger to auto-set first subject as primary
CREATE OR REPLACE FUNCTION auto_set_first_subject_primary()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first subject for the case and not already set as primary
  IF NEW.is_primary IS NULL OR NEW.is_primary = false THEN
    IF NOT EXISTS (
      SELECT 1 FROM case_subjects 
      WHERE case_id = NEW.case_id AND id != NEW.id AND archived_at IS NULL
    ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on insert
DROP TRIGGER IF EXISTS auto_set_first_subject_primary_trigger ON case_subjects;
CREATE TRIGGER auto_set_first_subject_primary_trigger
  BEFORE INSERT ON case_subjects
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_first_subject_primary();

-- Create trigger to auto-promote next subject when primary is deleted/archived
CREATE OR REPLACE FUNCTION auto_promote_next_subject()
RETURNS TRIGGER AS $$
DECLARE
  next_subject_id uuid;
  next_subject_name text;
BEGIN
  -- Only act if we're deleting/archiving a primary subject
  IF OLD.is_primary = true THEN
    -- Find the next oldest active subject
    SELECT id, name INTO next_subject_id, next_subject_name
    FROM case_subjects
    WHERE case_id = OLD.case_id 
      AND id != OLD.id 
      AND archived_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF next_subject_id IS NOT NULL THEN
      -- Promote the next subject
      UPDATE case_subjects
      SET is_primary = true, updated_at = NOW()
      WHERE id = next_subject_id;
      
      -- Update case title with new primary
      UPDATE cases
      SET title = next_subject_name, updated_at = NOW()
      WHERE id = OLD.case_id AND use_primary_subject_as_title = true;
    ELSE
      -- No more subjects, clear the case title
      UPDATE cases
      SET title = '', updated_at = NOW()
      WHERE id = OLD.case_id AND use_primary_subject_as_title = true;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on delete
DROP TRIGGER IF EXISTS auto_promote_next_subject_delete_trigger ON case_subjects;
CREATE TRIGGER auto_promote_next_subject_delete_trigger
  BEFORE DELETE ON case_subjects
  FOR EACH ROW
  EXECUTE FUNCTION auto_promote_next_subject();

-- Create trigger for when subject is archived (soft delete)
CREATE OR REPLACE FUNCTION auto_promote_on_archive()
RETURNS TRIGGER AS $$
DECLARE
  next_subject_id uuid;
  next_subject_name text;
BEGIN
  -- Only act if the subject was just archived and was primary
  IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL AND OLD.is_primary = true THEN
    -- Unset primary on archived subject
    NEW.is_primary := false;
    
    -- Find the next oldest active subject
    SELECT id, name INTO next_subject_id, next_subject_name
    FROM case_subjects
    WHERE case_id = NEW.case_id 
      AND id != NEW.id 
      AND archived_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF next_subject_id IS NOT NULL THEN
      -- Promote the next subject
      UPDATE case_subjects
      SET is_primary = true, updated_at = NOW()
      WHERE id = next_subject_id;
      
      -- Update case title with new primary
      UPDATE cases
      SET title = next_subject_name, updated_at = NOW()
      WHERE id = NEW.case_id AND use_primary_subject_as_title = true;
    ELSE
      -- No more subjects, clear the case title
      UPDATE cases
      SET title = '', updated_at = NOW()
      WHERE id = NEW.case_id AND use_primary_subject_as_title = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on update (for archive)
DROP TRIGGER IF EXISTS auto_promote_on_archive_trigger ON case_subjects;
CREATE TRIGGER auto_promote_on_archive_trigger
  BEFORE UPDATE ON case_subjects
  FOR EACH ROW
  EXECUTE FUNCTION auto_promote_on_archive();

-- Enhanced trigger: sync case title when primary subject name changes
CREATE OR REPLACE FUNCTION sync_case_title_with_primary_subject()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync title when:
  -- 1. Subject becomes primary
  -- 2. Primary subject's name changes
  IF NEW.is_primary = true AND NEW.archived_at IS NULL THEN
    IF OLD.is_primary = false OR OLD.is_primary IS NULL OR NEW.name != OLD.name THEN
      UPDATE cases
      SET title = NEW.name, updated_at = NOW()
      WHERE id = NEW.case_id AND use_primary_subject_as_title = true;
    END IF;
    
    -- Auto-unset previous primary if setting a new one
    IF OLD.is_primary = false OR OLD.is_primary IS NULL THEN
      UPDATE case_subjects
      SET is_primary = false, updated_at = NOW()
      WHERE case_id = NEW.case_id 
        AND id != NEW.id 
        AND is_primary = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace existing trigger
DROP TRIGGER IF EXISTS sync_case_title_on_primary_subject ON case_subjects;
CREATE TRIGGER sync_case_title_on_primary_subject
  AFTER UPDATE ON case_subjects
  FOR EACH ROW
  EXECUTE FUNCTION sync_case_title_with_primary_subject();

-- Also sync on insert when is_primary is true
DROP TRIGGER IF EXISTS sync_case_title_on_primary_subject_insert ON case_subjects;
CREATE TRIGGER sync_case_title_on_primary_subject_insert
  AFTER INSERT ON case_subjects
  FOR EACH ROW
  EXECUTE FUNCTION sync_case_title_with_primary_subject();
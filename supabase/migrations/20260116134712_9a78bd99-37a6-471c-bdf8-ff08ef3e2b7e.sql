-- Trigger to enforce case type rules on cases table
CREATE OR REPLACE FUNCTION public.enforce_case_type_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_case_type RECORD;
BEGIN
  -- Skip if no case_type_id
  IF NEW.case_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch the case type configuration
  SELECT * INTO v_case_type 
  FROM public.case_types 
  WHERE id = NEW.case_type_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid case_type_id: %', NEW.case_type_id;
  END IF;
  
  -- Enforce due_date_required (only on non-draft cases)
  IF v_case_type.due_date_required = true 
     AND NEW.is_draft = false 
     AND NEW.due_date IS NULL THEN
    RAISE EXCEPTION 'Due date is required for case type: %', v_case_type.name;
  END IF;
  
  -- Enforce budget_required based on strategy (only on non-draft cases)
  IF v_case_type.budget_required = true AND NEW.is_draft = false THEN
    IF v_case_type.budget_strategy = 'hours_only' AND (NEW.budget_hours IS NULL OR NEW.budget_hours <= 0) THEN
      RAISE EXCEPTION 'Budget hours are required for case type: %', v_case_type.name;
    ELSIF v_case_type.budget_strategy = 'money_only' AND (NEW.budget_dollars IS NULL OR NEW.budget_dollars <= 0) THEN
      RAISE EXCEPTION 'Budget dollars are required for case type: %', v_case_type.name;
    ELSIF v_case_type.budget_strategy = 'both' AND 
          (NEW.budget_hours IS NULL OR NEW.budget_hours <= 0) AND 
          (NEW.budget_dollars IS NULL OR NEW.budget_dollars <= 0) THEN
      RAISE EXCEPTION 'Budget (hours or dollars) is required for case type: %', v_case_type.name;
    END IF;
  END IF;
  
  -- If budget is disabled, clear any budget values
  IF v_case_type.budget_strategy = 'disabled' THEN
    NEW.budget_hours := NULL;
    NEW.budget_dollars := NULL;
  END IF;
  
  -- Sync case_type_tag with the case type
  NEW.case_type_tag := v_case_type.tag;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on cases table
DROP TRIGGER IF EXISTS trg_enforce_case_type_rules ON public.cases;
CREATE TRIGGER trg_enforce_case_type_rules
  BEFORE INSERT OR UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_case_type_rules();

-- Trigger to validate case service instances against allowed_service_ids
CREATE OR REPLACE FUNCTION public.validate_case_service_allowed()
RETURNS TRIGGER AS $$
DECLARE
  v_case_type RECORD;
BEGIN
  -- Get the case type for this case
  SELECT ct.* INTO v_case_type 
  FROM public.cases c 
  JOIN public.case_types ct ON ct.id = c.case_type_id 
  WHERE c.id = NEW.case_id;
  
  -- If no case type found, allow (case might not have type yet)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- If allowed_service_ids is set and not empty, validate
  IF v_case_type.allowed_service_ids IS NOT NULL 
     AND array_length(v_case_type.allowed_service_ids, 1) > 0 
     AND NOT (NEW.case_service_id = ANY(v_case_type.allowed_service_ids)) THEN
    RAISE EXCEPTION 'Service not allowed for case type: %', v_case_type.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on case_service_instances table
DROP TRIGGER IF EXISTS trg_validate_case_service ON public.case_service_instances;
CREATE TRIGGER trg_validate_case_service
  BEFORE INSERT ON public.case_service_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_case_service_allowed();

-- Trigger to validate subject types against allowed_subject_types
CREATE OR REPLACE FUNCTION public.validate_subject_type_allowed()
RETURNS TRIGGER AS $$
DECLARE
  v_case_type RECORD;
BEGIN
  -- Get the case type for this case
  SELECT ct.* INTO v_case_type 
  FROM public.cases c 
  JOIN public.case_types ct ON ct.id = c.case_type_id 
  WHERE c.id = NEW.case_id;
  
  -- If no case type found, allow (case might not have type yet)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- If allowed_subject_types is set and not empty, validate
  IF v_case_type.allowed_subject_types IS NOT NULL 
     AND array_length(v_case_type.allowed_subject_types, 1) > 0 
     AND NOT (NEW.subject_type = ANY(v_case_type.allowed_subject_types)) THEN
    RAISE EXCEPTION 'Subject type "%" not allowed for case type: %', NEW.subject_type, v_case_type.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on case_subjects table
DROP TRIGGER IF EXISTS trg_validate_subject_type ON public.case_subjects;
CREATE TRIGGER trg_validate_subject_type
  BEFORE INSERT ON public.case_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subject_type_allowed();
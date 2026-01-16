-- Fix function search_path security warnings
CREATE OR REPLACE FUNCTION public.set_primary_investigator(
  p_case_id UUID,
  p_investigator_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.case_investigators 
  SET role = 'support' 
  WHERE case_id = p_case_id AND role = 'primary';
  
  UPDATE public.case_investigators 
  SET role = 'primary' 
  WHERE case_id = p_case_id AND investigator_id = p_investigator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_promote_next_investigator()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'primary' THEN
    UPDATE public.case_investigators
    SET role = 'primary'
    WHERE case_id = OLD.case_id
      AND id = (
        SELECT id FROM public.case_investigators
        WHERE case_id = OLD.case_id
        ORDER BY assigned_at ASC
        LIMIT 1
      );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.first_investigator_is_primary()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.case_investigators 
    WHERE case_id = NEW.case_id AND id != NEW.id
  ) THEN
    NEW.role := 'primary';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
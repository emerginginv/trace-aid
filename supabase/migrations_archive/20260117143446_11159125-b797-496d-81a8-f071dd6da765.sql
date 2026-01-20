-- Create enum for trigger event types
CREATE TYPE public.case_status_trigger_event AS ENUM (
  'investigator_assigned',
  'investigator_confirmed',
  'invoice_created',
  'all_invoices_paid',
  'report_uploaded',
  'case_approved'
);

-- Create case_status_triggers table
CREATE TABLE public.case_status_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type public.case_status_trigger_event NOT NULL,
  target_status_id UUID NOT NULL REFERENCES public.case_statuses(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  allow_override_manual BOOLEAN NOT NULL DEFAULT false,
  workflow TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_event_workflow UNIQUE (organization_id, event_type, workflow)
);

-- Create case_status_trigger_log table for execution logging
CREATE TABLE public.case_status_trigger_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.case_status_triggers(id) ON DELETE SET NULL,
  event_type public.case_status_trigger_event NOT NULL,
  from_status_id UUID REFERENCES public.case_statuses(id) ON DELETE SET NULL,
  to_status_id UUID REFERENCES public.case_statuses(id) ON DELETE SET NULL,
  result TEXT NOT NULL,
  reason TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Add confirmed_at column to case_investigators for investigator_confirmed event
ALTER TABLE public.case_investigators ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Add manual_override column to case_status_history to track manual vs automatic changes
ALTER TABLE public.case_status_history ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;
ALTER TABLE public.case_status_history ADD COLUMN IF NOT EXISTS trigger_id UUID REFERENCES public.case_status_triggers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.case_status_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_trigger_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_status_triggers
CREATE POLICY "Users can view triggers for their organization"
ON public.case_status_triggers FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage triggers"
ON public.case_status_triggers FOR ALL
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- RLS Policies for case_status_trigger_log
CREATE POLICY "Users can view trigger logs for their organization"
ON public.case_status_trigger_log FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert trigger logs"
ON public.case_status_trigger_log FOR INSERT
WITH CHECK (true);

-- Function to check if case has already reached or passed a status
CREATE OR REPLACE FUNCTION public.has_case_reached_status(
  p_case_id UUID,
  p_target_status_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_target_rank INTEGER;
  v_current_rank INTEGER;
  v_has_reached BOOLEAN;
BEGIN
  -- Get target status rank
  SELECT rank_order INTO v_target_rank 
  FROM public.case_statuses WHERE id = p_target_status_id;
  
  IF v_target_rank IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get current status rank
  SELECT cs.rank_order INTO v_current_rank
  FROM public.cases c
  JOIN public.case_statuses cs ON cs.id = c.current_status_id
  WHERE c.id = p_case_id;
  
  -- If current rank >= target, already passed
  IF v_current_rank IS NOT NULL AND v_current_rank >= v_target_rank THEN
    RETURN TRUE;
  END IF;
  
  -- Also check history for previous visits to this or higher status
  SELECT EXISTS(
    SELECT 1 FROM public.case_status_history csh
    JOIN public.case_statuses cs ON cs.id = csh.status_id
    WHERE csh.case_id = p_case_id
      AND cs.rank_order >= v_target_rank
  ) INTO v_has_reached;
  
  RETURN COALESCE(v_has_reached, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Main function to fire status triggers
CREATE OR REPLACE FUNCTION public.fire_status_trigger(
  p_case_id UUID,
  p_event_type public.case_status_trigger_event,
  p_triggered_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_trigger RECORD;
  v_case RECORD;
  v_current_status RECORD;
  v_already_reached BOOLEAN;
  v_is_manual_override BOOLEAN;
BEGIN
  -- Get case details
  SELECT * INTO v_case FROM public.cases WHERE id = p_case_id;
  
  IF v_case IS NULL THEN
    RETURN jsonb_build_object('fired', false, 'reason', 'Case not found');
  END IF;
  
  -- Find matching trigger for this org/event/workflow
  SELECT * INTO v_trigger 
  FROM public.case_status_triggers 
  WHERE organization_id = v_case.organization_id
    AND event_type = p_event_type
    AND enabled = true
    AND workflow = COALESCE(v_case.workflow, 'standard');
  
  IF v_trigger IS NULL THEN
    RETURN jsonb_build_object('fired', false, 'reason', 'No matching trigger configured');
  END IF;
  
  -- Check if already reached/passed target status
  v_already_reached := public.has_case_reached_status(p_case_id, v_trigger.target_status_id);
  IF v_already_reached THEN
    -- Log skip
    INSERT INTO public.case_status_trigger_log (organization_id, case_id, trigger_id, event_type, 
      from_status_id, to_status_id, result, reason, triggered_by)
    VALUES (v_case.organization_id, p_case_id, v_trigger.id, p_event_type,
      v_case.current_status_id, v_trigger.target_status_id, 
      'skipped_already_passed', 'Case has already reached or passed target status', p_triggered_by);
    
    RETURN jsonb_build_object('fired', false, 'reason', 'Already reached target status');
  END IF;
  
  -- Check for manual override (last change was manual)
  SELECT manual_override INTO v_is_manual_override
  FROM public.case_status_history 
  WHERE case_id = p_case_id AND exited_at IS NULL
  ORDER BY entered_at DESC LIMIT 1;
  
  IF v_is_manual_override IS TRUE AND NOT v_trigger.allow_override_manual THEN
    INSERT INTO public.case_status_trigger_log (organization_id, case_id, trigger_id, event_type,
      from_status_id, to_status_id, result, reason, triggered_by)
    VALUES (v_case.organization_id, p_case_id, v_trigger.id, p_event_type,
      v_case.current_status_id, v_trigger.target_status_id,
      'skipped_manual_override', 'Current status was set manually', p_triggered_by);
    
    RETURN jsonb_build_object('fired', false, 'reason', 'Manual override in effect');
  END IF;
  
  -- Check if current status is read-only
  SELECT * INTO v_current_status FROM public.case_statuses WHERE id = v_case.current_status_id;
  IF v_current_status.is_read_only IS TRUE THEN
    INSERT INTO public.case_status_trigger_log (organization_id, case_id, trigger_id, event_type,
      from_status_id, to_status_id, result, reason, triggered_by)
    VALUES (v_case.organization_id, p_case_id, v_trigger.id, p_event_type,
      v_case.current_status_id, v_trigger.target_status_id,
      'skipped_read_only', 'Current status is read-only', p_triggered_by);
    
    RETURN jsonb_build_object('fired', false, 'reason', 'Current status is read-only');
  END IF;
  
  -- Log success BEFORE the update (to capture original status)
  INSERT INTO public.case_status_trigger_log (organization_id, case_id, trigger_id, event_type,
    from_status_id, to_status_id, result, reason, triggered_by)
  VALUES (v_case.organization_id, p_case_id, v_trigger.id, p_event_type,
    v_case.current_status_id, v_trigger.target_status_id,
    'success', 'Trigger executed successfully', p_triggered_by);
  
  -- Execute the transition (this will fire the track_case_status_change_v2 trigger)
  UPDATE public.cases SET current_status_id = v_trigger.target_status_id WHERE id = p_case_id;
  
  RETURN jsonb_build_object('fired', true, 'new_status_id', v_trigger.target_status_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for investigator_assigned event
CREATE OR REPLACE FUNCTION public.trigger_on_investigator_assigned()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.fire_status_trigger(NEW.case_id, 'investigator_assigned', NEW.assigned_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER fire_investigator_assigned_trigger
AFTER INSERT ON public.case_investigators
FOR EACH ROW EXECUTE FUNCTION public.trigger_on_investigator_assigned();

-- Trigger function for investigator_confirmed event
CREATE OR REPLACE FUNCTION public.trigger_on_investigator_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    PERFORM public.fire_status_trigger(NEW.case_id, 'investigator_confirmed', auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER fire_investigator_confirmed_trigger
AFTER UPDATE ON public.case_investigators
FOR EACH ROW EXECUTE FUNCTION public.trigger_on_investigator_confirmed();

-- Trigger function for invoice_created event
CREATE OR REPLACE FUNCTION public.trigger_on_invoice_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_id IS NOT NULL THEN
    PERFORM public.fire_status_trigger(NEW.case_id, 'invoice_created', NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER fire_invoice_created_trigger
AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trigger_on_invoice_created();

-- Trigger function for all_invoices_paid event
CREATE OR REPLACE FUNCTION public.trigger_on_all_invoices_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_unpaid_count INTEGER;
BEGIN
  IF NEW.case_id IS NOT NULL AND NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Check if ALL invoices for this case are now paid
    SELECT COUNT(*) INTO v_unpaid_count
    FROM public.invoices 
    WHERE case_id = NEW.case_id AND status NOT IN ('paid', 'void', 'cancelled');
    
    IF v_unpaid_count = 0 THEN
      PERFORM public.fire_status_trigger(NEW.case_id, 'all_invoices_paid', auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER fire_all_invoices_paid_trigger
AFTER UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trigger_on_all_invoices_paid();

-- Trigger function for report_uploaded event
CREATE OR REPLACE FUNCTION public.trigger_on_report_uploaded()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tags IS NOT NULL AND 'report' = ANY(NEW.tags) THEN
    PERFORM public.fire_status_trigger(NEW.case_id, 'report_uploaded', NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER fire_report_uploaded_trigger
AFTER INSERT ON public.case_attachments
FOR EACH ROW EXECUTE FUNCTION public.trigger_on_report_uploaded();

-- Trigger function for case_approved event (when case is created from approved request)
CREATE OR REPLACE FUNCTION public.trigger_on_case_approved()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire trigger when a case is created (case_approved means request was approved and case created)
  IF NEW.organization_id IS NOT NULL THEN
    PERFORM public.fire_status_trigger(NEW.id, 'case_approved', NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER fire_case_approved_trigger
AFTER INSERT ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.trigger_on_case_approved();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_status_triggers_org_event ON public.case_status_triggers(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_case_status_trigger_log_case ON public.case_status_trigger_log(case_id);
CREATE INDEX IF NOT EXISTS idx_case_status_trigger_log_org ON public.case_status_trigger_log(organization_id);

-- Update trigger for updated_at
CREATE TRIGGER update_case_status_triggers_updated_at
BEFORE UPDATE ON public.case_status_triggers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
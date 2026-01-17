-- =============================================
-- TIME-IN-STATUS TRACKING SYSTEM
-- =============================================

-- 1. Create case_status_history table
CREATE TABLE public.case_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Status transition
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_status_key TEXT,
  to_status_key TEXT,
  
  -- Attribution
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Duration tracking
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Metadata
  change_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create case_request_status_history table
CREATE TABLE public.case_request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_request_id UUID NOT NULL REFERENCES public.case_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_status_key TEXT,
  to_status_key TEXT,
  
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  change_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX idx_case_status_history_case_id ON public.case_status_history(case_id);
CREATE INDEX idx_case_status_history_org_id ON public.case_status_history(organization_id);
CREATE INDEX idx_case_status_history_changed_at ON public.case_status_history(changed_at DESC);
CREATE INDEX idx_case_status_history_to_status ON public.case_status_history(to_status_key);
CREATE INDEX idx_case_status_history_current ON public.case_status_history(case_id) WHERE exited_at IS NULL;

CREATE INDEX idx_case_request_status_history_request_id ON public.case_request_status_history(case_request_id);
CREATE INDEX idx_case_request_status_history_org_id ON public.case_request_status_history(organization_id);
CREATE INDEX idx_case_request_status_history_changed_at ON public.case_request_status_history(changed_at DESC);
CREATE INDEX idx_case_request_status_history_current ON public.case_request_status_history(case_request_id) WHERE exited_at IS NULL;

-- 4. Create trigger function for case status changes
CREATE OR REPLACE FUNCTION public.track_case_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status OR 
     OLD.status_key IS DISTINCT FROM NEW.status_key THEN
    
    -- Get current user
    v_user_id := COALESCE(
      auth.uid(),
      NEW.closed_by_user_id,
      NEW.case_manager_id
    );
    
    -- Close the previous status record (calculate duration)
    UPDATE public.case_status_history
    SET 
      exited_at = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - entered_at))::INTEGER
    WHERE case_id = NEW.id
      AND exited_at IS NULL;
    
    -- Create new status record
    INSERT INTO public.case_status_history (
      case_id,
      organization_id,
      from_status,
      to_status,
      from_status_key,
      to_status_key,
      changed_by,
      changed_at,
      entered_at
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      OLD.status_key,
      NEW.status_key,
      v_user_id,
      now(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create trigger function for initial case status
CREATE OR REPLACE FUNCTION public.track_case_initial_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.case_status_history (
    case_id,
    organization_id,
    from_status,
    to_status,
    from_status_key,
    to_status_key,
    changed_by,
    changed_at,
    entered_at
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    NULL,
    NEW.status,
    NULL,
    NEW.status_key,
    COALESCE(auth.uid(), NEW.case_manager_id, NEW.user_id),
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create trigger function for case request status changes
CREATE OR REPLACE FUNCTION public.track_case_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR 
     OLD.status_key IS DISTINCT FROM NEW.status_key THEN
    
    v_user_id := COALESCE(auth.uid(), NEW.reviewed_by, NEW.created_by);
    
    UPDATE public.case_request_status_history
    SET 
      exited_at = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - entered_at))::INTEGER
    WHERE case_request_id = NEW.id
      AND exited_at IS NULL;
    
    INSERT INTO public.case_request_status_history (
      case_request_id,
      organization_id,
      from_status,
      to_status,
      from_status_key,
      to_status_key,
      changed_by,
      changed_at,
      entered_at
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      OLD.status_key,
      NEW.status_key,
      v_user_id,
      now(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create trigger function for initial case request status
CREATE OR REPLACE FUNCTION public.track_case_request_initial_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.case_request_status_history (
    case_request_id,
    organization_id,
    from_status,
    to_status,
    from_status_key,
    to_status_key,
    changed_by,
    changed_at,
    entered_at
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    NULL,
    NEW.status,
    NULL,
    NEW.status_key,
    COALESCE(auth.uid(), NEW.created_by),
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Create triggers
CREATE TRIGGER trigger_track_case_status
  AFTER UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.track_case_status_change();

CREATE TRIGGER trigger_track_case_initial_status
  AFTER INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.track_case_initial_status();

CREATE TRIGGER trigger_track_case_request_status
  AFTER UPDATE ON public.case_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.track_case_request_status_change();

CREATE TRIGGER trigger_track_case_request_initial_status
  AFTER INSERT ON public.case_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.track_case_request_initial_status();

-- 9. Enable RLS
ALTER TABLE public.case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_status_history ENABLE ROW LEVEL SECURITY;

-- 10. RLS policies for case_status_history
CREATE POLICY "org_members_view_case_status_history"
  ON public.case_status_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "system_insert_case_status_history"
  ON public.case_status_history FOR INSERT
  WITH CHECK (true);

-- 11. RLS policies for case_request_status_history
CREATE POLICY "org_members_view_case_request_status_history"
  ON public.case_request_status_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "system_insert_case_request_status_history"
  ON public.case_request_status_history FOR INSERT
  WITH CHECK (true);

-- 12. Backfill existing cases with initial history records
INSERT INTO public.case_status_history (
  case_id,
  organization_id,
  from_status,
  to_status,
  from_status_key,
  to_status_key,
  changed_by,
  changed_at,
  entered_at
)
SELECT 
  c.id,
  c.organization_id,
  NULL,
  c.status,
  NULL,
  c.status_key,
  COALESCE(c.case_manager_id, c.user_id),
  c.created_at,
  c.created_at
FROM public.cases c
WHERE NOT EXISTS (
  SELECT 1 FROM public.case_status_history h WHERE h.case_id = c.id
);

-- 13. Backfill existing case requests with initial history records
INSERT INTO public.case_request_status_history (
  case_request_id,
  organization_id,
  from_status,
  to_status,
  from_status_key,
  to_status_key,
  changed_by,
  changed_at,
  entered_at
)
SELECT 
  cr.id,
  cr.organization_id,
  NULL,
  cr.status,
  NULL,
  cr.status_key,
  cr.created_by,
  cr.created_at,
  cr.created_at
FROM public.case_requests cr
WHERE NOT EXISTS (
  SELECT 1 FROM public.case_request_status_history h WHERE h.case_request_id = cr.id
);
-- =====================================================
-- CANONICAL CASE STATUS DATA MODEL FOR CASEWISE
-- Phase 1: Database Schema - Core Tables
-- =====================================================

-- 1. Create case_status_categories table
CREATE TABLE public.case_status_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (name IN ('New', 'Open', 'Complete', 'Closed')),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.case_status_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_status_categories
CREATE POLICY "Users can view categories in their organization"
ON public.case_status_categories FOR SELECT
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage categories"
ON public.case_status_categories FOR ALL
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om 
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- 2. Create case_statuses table (new canonical design)
CREATE TABLE public.case_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.case_status_categories(id) ON DELETE RESTRICT,
  
  -- Display
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  notes TEXT,
  
  -- Ordering
  rank_order INTEGER NOT NULL DEFAULT 0,
  
  -- Behavioral flags
  monitor_due_date BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_reopenable BOOLEAN DEFAULT true,
  is_read_only BOOLEAN DEFAULT false,
  is_first_status BOOLEAN DEFAULT false,
  
  -- Workflows
  workflows TEXT[] DEFAULT ARRAY['standard'],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.case_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_statuses
CREATE POLICY "Users can view statuses in their organization"
ON public.case_statuses FOR SELECT
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage statuses"
ON public.case_statuses FOR ALL
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om 
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- 3. Create case_category_transition_log table
CREATE TABLE public.case_category_transition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_category_id UUID REFERENCES public.case_status_categories(id),
  to_category_id UUID NOT NULL REFERENCES public.case_status_categories(id),
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transitioned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_category_transition_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_category_transition_log
CREATE POLICY "Users can view category transitions in their organization"
ON public.case_category_transition_log FOR SELECT
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert category transitions for their cases"
ON public.case_category_transition_log FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  )
);

-- 4. Augment case_status_history with new columns
ALTER TABLE public.case_status_history 
ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES public.case_statuses(id),
ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;

-- 5. Augment cases table with new status tracking columns
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS current_status_id UUID REFERENCES public.case_statuses(id),
ADD COLUMN IF NOT EXISTS current_category_id UUID REFERENCES public.case_status_categories(id),
ADD COLUMN IF NOT EXISTS status_entered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS category_entered_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_statuses_org_category ON public.case_statuses(organization_id, category_id);
CREATE INDEX IF NOT EXISTS idx_case_statuses_org_rank ON public.case_statuses(organization_id, rank_order);
CREATE INDEX IF NOT EXISTS idx_case_statuses_first ON public.case_statuses(organization_id, is_first_status) WHERE is_first_status = true;
CREATE INDEX IF NOT EXISTS idx_cases_current_status ON public.cases(current_status_id);
CREATE INDEX IF NOT EXISTS idx_cases_current_category ON public.cases(current_category_id);
CREATE INDEX IF NOT EXISTS idx_case_category_transition_log_case ON public.case_category_transition_log(case_id);

-- =====================================================
-- Phase 2: Database Triggers
-- =====================================================

-- Function to auto-assign first status on case creation
CREATE OR REPLACE FUNCTION public.assign_first_status_on_case_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_first_status RECORD;
BEGIN
  -- Only assign if current_status_id is not already set
  IF NEW.current_status_id IS NULL THEN
    -- Find the first status for this organization
    SELECT cs.id, cs.category_id INTO v_first_status
    FROM public.case_statuses cs
    WHERE cs.organization_id = NEW.organization_id
      AND cs.is_first_status = true
      AND cs.is_active = true
    LIMIT 1;
    
    IF v_first_status.id IS NOT NULL THEN
      NEW.current_status_id := v_first_status.id;
      NEW.current_category_id := v_first_status.category_id;
      NEW.status_entered_at := now();
      NEW.category_entered_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for first status assignment
DROP TRIGGER IF EXISTS trigger_assign_first_status ON public.cases;
CREATE TRIGGER trigger_assign_first_status
BEFORE INSERT ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.assign_first_status_on_case_creation();

-- Function to track status changes (append-only)
CREATE OR REPLACE FUNCTION public.track_case_status_change_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_old_category_id UUID;
  v_new_category_id UUID;
  v_old_status_name TEXT;
  v_new_status_name TEXT;
BEGIN
  IF OLD.current_status_id IS DISTINCT FROM NEW.current_status_id AND NEW.current_status_id IS NOT NULL THEN
    -- Get old and new status info
    SELECT category_id, name INTO v_old_category_id, v_old_status_name 
    FROM public.case_statuses WHERE id = OLD.current_status_id;
    
    SELECT category_id, name INTO v_new_category_id, v_new_status_name 
    FROM public.case_statuses WHERE id = NEW.current_status_id;
    
    -- Close previous status history record
    UPDATE public.case_status_history
    SET exited_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - entered_at))::INTEGER
    WHERE case_id = NEW.id AND exited_at IS NULL;
    
    -- Insert new status history record
    INSERT INTO public.case_status_history (
      case_id, organization_id, status_id,
      from_status, to_status,
      changed_by, entered_at
    ) VALUES (
      NEW.id, NEW.organization_id, NEW.current_status_id,
      v_old_status_name, v_new_status_name,
      auth.uid(), now()
    );
    
    -- Update status_entered_at
    NEW.status_entered_at := now();
    
    -- Check if category changed
    IF v_old_category_id IS DISTINCT FROM v_new_category_id THEN
      -- Log category transition
      INSERT INTO public.case_category_transition_log (
        case_id, organization_id, from_category_id, to_category_id, transitioned_by
      ) VALUES (
        NEW.id, NEW.organization_id, v_old_category_id, v_new_category_id, auth.uid()
      );
      
      NEW.current_category_id := v_new_category_id;
      NEW.category_entered_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status change tracking
DROP TRIGGER IF EXISTS trigger_track_status_change_v2 ON public.cases;
CREATE TRIGGER trigger_track_status_change_v2
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.track_case_status_change_v2();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_case_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_case_statuses_updated_at ON public.case_statuses;
CREATE TRIGGER trigger_case_statuses_updated_at
BEFORE UPDATE ON public.case_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_case_statuses_updated_at();

DROP TRIGGER IF EXISTS trigger_case_status_categories_updated_at ON public.case_status_categories;
CREATE TRIGGER trigger_case_status_categories_updated_at
BEFORE UPDATE ON public.case_status_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_case_statuses_updated_at();

-- Ensure only one status can be is_first_status per org
CREATE OR REPLACE FUNCTION public.ensure_single_first_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_first_status = true THEN
    -- Unset is_first_status on all other statuses for this org
    UPDATE public.case_statuses
    SET is_first_status = false
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_first_status = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_ensure_single_first_status ON public.case_statuses;
CREATE TRIGGER trigger_ensure_single_first_status
BEFORE INSERT OR UPDATE ON public.case_statuses
FOR EACH ROW
WHEN (NEW.is_first_status = true)
EXECUTE FUNCTION public.ensure_single_first_status();
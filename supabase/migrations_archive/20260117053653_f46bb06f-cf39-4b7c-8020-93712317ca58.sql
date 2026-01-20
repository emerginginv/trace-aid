-- =====================================================
-- UNIFIED CASE LIFECYCLE SYSTEM
-- =====================================================

-- 1. Create case_lifecycle_statuses table
CREATE TABLE public.case_lifecycle_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  status_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('intake', 'execution')),
  phase_order INTEGER NOT NULL,
  status_type TEXT NOT NULL DEFAULT 'open' CHECK (status_type IN ('open', 'closed')),
  color TEXT DEFAULT '#6366f1',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, status_key)
);

-- 2. Create case_status_transitions table (documentation only)
CREATE TABLE public.case_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_status_key TEXT NOT NULL,
  to_status_key TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, from_status_key, to_status_key)
);

-- 3. Enable RLS
ALTER TABLE public.case_lifecycle_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_transitions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for case_lifecycle_statuses
CREATE POLICY "Users can view lifecycle statuses for their organization"
ON public.case_lifecycle_statuses
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage lifecycle statuses for their organization"
ON public.case_lifecycle_statuses
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 5. RLS Policies for case_status_transitions
CREATE POLICY "Users can view transitions for their organization"
ON public.case_status_transitions
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage transitions for their organization"
ON public.case_status_transitions
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 6. Create function to seed default statuses for an organization
CREATE OR REPLACE FUNCTION public.seed_case_lifecycle_statuses(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- INTAKE PHASE STATUSES
  INSERT INTO case_lifecycle_statuses (organization_id, status_key, display_name, phase, phase_order, status_type, color, description, is_system)
  VALUES
    (org_id, 'requested', 'Requested', 'intake', 0, 'open', '#f59e0b', 'Initial submission of a case request', true),
    (org_id, 'under_review', 'Under Review', 'intake', 1, 'open', '#3b82f6', 'Request is being evaluated by staff', true),
    (org_id, 'approved', 'Approved', 'intake', 2, 'closed', '#22c55e', 'Request approved; case created', true),
    (org_id, 'declined', 'Declined', 'intake', 3, 'closed', '#ef4444', 'Request declined; no case created', true),
    
    -- EXECUTION PHASE STATUSES
    (org_id, 'new', 'New', 'execution', 0, 'open', '#8b5cf6', 'Newly created case, not yet assigned', true),
    (org_id, 'assigned', 'Assigned', 'execution', 1, 'open', '#6366f1', 'Case assigned to investigator(s)', true),
    (org_id, 'active', 'Active', 'execution', 2, 'open', '#22c55e', 'Work is actively in progress', true),
    (org_id, 'on_hold', 'On Hold', 'execution', 3, 'open', '#f59e0b', 'Temporarily paused', true),
    (org_id, 'awaiting_client', 'Awaiting Client', 'execution', 4, 'open', '#eab308', 'Waiting for client response/action', true),
    (org_id, 'awaiting_records', 'Awaiting Records', 'execution', 5, 'open', '#f97316', 'Waiting for external records', true),
    (org_id, 'completed', 'Completed', 'execution', 6, 'closed', '#14b8a6', 'Work complete, pending final review', true),
    (org_id, 'closed', 'Closed', 'execution', 7, 'closed', '#64748b', 'Case fully resolved', true),
    (org_id, 'cancelled', 'Cancelled', 'execution', 8, 'closed', '#ef4444', 'Case terminated before completion', true)
  ON CONFLICT (organization_id, status_key) DO NOTHING;
END;
$$;

-- 7. Create function to seed default transitions for an organization
CREATE OR REPLACE FUNCTION public.seed_case_status_transitions(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- INTAKE PHASE TRANSITIONS
  INSERT INTO case_status_transitions (organization_id, from_status_key, to_status_key, description)
  VALUES
    (org_id, 'requested', 'under_review', 'Staff begins review'),
    (org_id, 'requested', 'declined', 'Quick decline'),
    (org_id, 'under_review', 'approved', 'Promote to case'),
    (org_id, 'under_review', 'declined', 'Reject after review'),
    (org_id, 'under_review', 'requested', 'Return for more info'),
    
    -- EXECUTION PHASE TRANSITIONS
    (org_id, 'new', 'assigned', 'Investigator assigned'),
    (org_id, 'new', 'active', 'Skip assignment, work begins'),
    (org_id, 'new', 'cancelled', 'Cancel before work starts'),
    (org_id, 'assigned', 'active', 'Work begins'),
    (org_id, 'assigned', 'on_hold', 'Delay before start'),
    (org_id, 'assigned', 'cancelled', 'Cancel after assignment'),
    (org_id, 'active', 'on_hold', 'Pause work'),
    (org_id, 'active', 'awaiting_client', 'Need client input'),
    (org_id, 'active', 'awaiting_records', 'Need external data'),
    (org_id, 'active', 'completed', 'Work finished'),
    (org_id, 'active', 'cancelled', 'Cancel mid-work'),
    (org_id, 'on_hold', 'active', 'Resume work'),
    (org_id, 'on_hold', 'cancelled', 'Cancel while paused'),
    (org_id, 'awaiting_client', 'active', 'Client responded'),
    (org_id, 'awaiting_client', 'on_hold', 'Extended wait'),
    (org_id, 'awaiting_client', 'cancelled', 'Client unresponsive'),
    (org_id, 'awaiting_records', 'active', 'Records received'),
    (org_id, 'awaiting_records', 'on_hold', 'Extended wait'),
    (org_id, 'awaiting_records', 'cancelled', 'Records unavailable'),
    (org_id, 'completed', 'closed', 'Final review done'),
    (org_id, 'completed', 'active', 'Reopened for revisions'),
    (org_id, 'closed', 'active', 'Reopened case')
  ON CONFLICT (organization_id, from_status_key, to_status_key) DO NOTHING;
END;
$$;

-- 8. Seed statuses for all existing organizations
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_case_lifecycle_statuses(org.id);
    PERFORM public.seed_case_status_transitions(org.id);
  END LOOP;
END;
$$;

-- 9. Create trigger to auto-seed new organizations
CREATE OR REPLACE FUNCTION public.auto_seed_lifecycle_statuses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_case_lifecycle_statuses(NEW.id);
  PERFORM public.seed_case_status_transitions(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_seed_lifecycle_statuses
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.auto_seed_lifecycle_statuses();

-- 10. Add status_key columns to cases and case_requests for future migration
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS status_key TEXT;
ALTER TABLE public.case_requests ADD COLUMN IF NOT EXISTS status_key TEXT;

-- 11. Create updated_at trigger for case_lifecycle_statuses
CREATE TRIGGER update_case_lifecycle_statuses_updated_at
BEFORE UPDATE ON public.case_lifecycle_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
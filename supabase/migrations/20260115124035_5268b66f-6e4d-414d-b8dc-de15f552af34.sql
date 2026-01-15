-- Create status enum for time/expense entries
CREATE TYPE public.entry_status AS ENUM ('draft', 'pending_review', 'approved', 'declined', 'billed');

-- =============================================
-- TIME_ENTRIES TABLE
-- =============================================
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.case_activities(id) ON DELETE SET NULL,
  update_id UUID REFERENCES public.case_updates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  notes TEXT,
  hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
  rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) GENERATED ALWAYS AS (hours * rate) STORED,
  status public.entry_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for common lookups
CREATE INDEX idx_time_entries_case_id ON public.time_entries(case_id);
CREATE INDEX idx_time_entries_event_id ON public.time_entries(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_time_entries_update_id ON public.time_entries(update_id) WHERE update_id IS NOT NULL;
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_organization_id ON public.time_entries(organization_id);
CREATE INDEX idx_time_entries_status ON public.time_entries(status);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- EXPENSE_ENTRIES TABLE
-- =============================================
CREATE TABLE public.expense_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.case_activities(id) ON DELETE SET NULL,
  update_id UUID REFERENCES public.case_updates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  notes TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * rate) STORED,
  receipt_url TEXT,
  status public.entry_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for common lookups
CREATE INDEX idx_expense_entries_case_id ON public.expense_entries(case_id);
CREATE INDEX idx_expense_entries_event_id ON public.expense_entries(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_expense_entries_update_id ON public.expense_entries(update_id) WHERE update_id IS NOT NULL;
CREATE INDEX idx_expense_entries_user_id ON public.expense_entries(user_id);
CREATE INDEX idx_expense_entries_organization_id ON public.expense_entries(organization_id);
CREATE INDEX idx_expense_entries_status ON public.expense_entries(status);

-- Enable RLS
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TIME_ENTRIES RLS POLICIES
-- =============================================

-- Investigators can view their own entries OR all entries if admin/manager
CREATE POLICY "Users can view time entries in their organization"
ON public.time_entries
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- Own entries
    user_id = auth.uid()
    -- OR admin/manager can see all
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND organization_id = time_entries.organization_id
      AND role IN ('admin', 'manager')
    )
  )
);

-- Investigators can create their own entries
CREATE POLICY "Users can create their own time entries"
ON public.time_entries
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Investigators can update their own draft/pending entries; admins can update any
CREATE POLICY "Users can update time entries"
ON public.time_entries
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- Own entries that are draft or pending_review
    (user_id = auth.uid() AND status IN ('draft', 'pending_review'))
    -- OR admin can update any
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND organization_id = time_entries.organization_id
      AND role = 'admin'
    )
  )
);

-- Only admins can delete time entries
CREATE POLICY "Admins can delete time entries"
ON public.time_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND organization_id = time_entries.organization_id
    AND role = 'admin'
  )
);

-- =============================================
-- EXPENSE_ENTRIES RLS POLICIES
-- =============================================

-- Investigators can view their own entries OR all entries if admin/manager
CREATE POLICY "Users can view expense entries in their organization"
ON public.expense_entries
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- Own entries
    user_id = auth.uid()
    -- OR admin/manager can see all
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND organization_id = expense_entries.organization_id
      AND role IN ('admin', 'manager')
    )
  )
);

-- Investigators can create their own entries
CREATE POLICY "Users can create their own expense entries"
ON public.expense_entries
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Investigators can update their own draft/pending entries; admins can update any
CREATE POLICY "Users can update expense entries"
ON public.expense_entries
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- Own entries that are draft or pending_review
    (user_id = auth.uid() AND status IN ('draft', 'pending_review'))
    -- OR admin can update any
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND organization_id = expense_entries.organization_id
      AND role = 'admin'
    )
  )
);

-- Only admins can delete expense entries
CREATE POLICY "Admins can delete expense entries"
ON public.expense_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND organization_id = expense_entries.organization_id
    AND role = 'admin'
  )
);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_entries_updated_at
BEFORE UPDATE ON public.expense_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.time_entries IS 'Tracks time logged by investigators against cases, events, and updates';
COMMENT ON TABLE public.expense_entries IS 'Tracks expenses logged by investigators against cases, events, and updates';
COMMENT ON COLUMN public.time_entries.total IS 'Auto-calculated as hours × rate';
COMMENT ON COLUMN public.expense_entries.total IS 'Auto-calculated as quantity × rate';
COMMENT ON COLUMN public.expense_entries.receipt_url IS 'Storage path for uploaded receipt image/PDF';
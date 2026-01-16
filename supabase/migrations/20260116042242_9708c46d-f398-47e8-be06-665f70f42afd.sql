-- Create case_investigators junction table
CREATE TABLE public.case_investigators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  investigator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'support' CHECK (role IN ('primary', 'support')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  
  UNIQUE(case_id, investigator_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_case_investigators_case_id ON public.case_investigators(case_id);
CREATE INDEX idx_case_investigators_investigator_id ON public.case_investigators(investigator_id);
CREATE INDEX idx_case_investigators_org_id ON public.case_investigators(organization_id);

-- Enforce exactly one primary investigator per case
CREATE UNIQUE INDEX idx_case_investigators_single_primary 
ON public.case_investigators(case_id) 
WHERE role = 'primary';

-- Function: Atomic role change (demote current primary, promote new one)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-promote next investigator when primary is removed
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_promote_primary
AFTER DELETE ON public.case_investigators
FOR EACH ROW
EXECUTE FUNCTION public.auto_promote_next_investigator();

-- Trigger: First investigator on a case is automatically primary
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_first_investigator_primary
BEFORE INSERT ON public.case_investigators
FOR EACH ROW
EXECUTE FUNCTION public.first_investigator_is_primary();

-- Enable RLS
ALTER TABLE public.case_investigators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view case investigators in their org"
ON public.case_investigators FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can add investigators to cases"
ON public.case_investigators FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update case investigators"
ON public.case_investigators FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can remove investigators from cases"
ON public.case_investigators FOR DELETE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

-- Migrate existing data from cases.investigator_ids
INSERT INTO public.case_investigators (case_id, investigator_id, organization_id, role, assigned_at)
SELECT 
  c.id AS case_id,
  inv_id AS investigator_id,
  c.organization_id,
  CASE 
    WHEN ord = 1 THEN 'primary'
    ELSE 'support'
  END AS role,
  c.created_at AS assigned_at
FROM public.cases c,
LATERAL unnest(c.investigator_ids) WITH ORDINALITY AS t(inv_id, ord)
WHERE c.investigator_ids IS NOT NULL 
  AND array_length(c.investigator_ids, 1) > 0
ON CONFLICT (case_id, investigator_id) DO NOTHING;
-- Create case_services table for managing service definitions
CREATE TABLE public.case_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  case_types TEXT[] DEFAULT '{}',
  requires_scheduling BOOLEAN DEFAULT false,
  default_duration_minutes INTEGER,
  allow_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for organization lookups
CREATE INDEX idx_case_services_organization_id ON public.case_services(organization_id);

-- Enable RLS
ALTER TABLE public.case_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view services in their organization"
  ON public.case_services FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins and managers can insert services"
  ON public.case_services FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins and managers can update services"
  ON public.case_services FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins and managers can delete services"
  ON public.case_services FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_case_services_updated_at
  BEFORE UPDATE ON public.case_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
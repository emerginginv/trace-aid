-- Create case_services table
CREATE TABLE IF NOT EXISTS public.case_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  code text,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_billable boolean DEFAULT true,
  default_rate numeric(10,2),
  billing_code text,
  billing_description_template text,
  track_duration boolean DEFAULT false,
  track_outcomes boolean DEFAULT false,
  requires_scheduling boolean DEFAULT false,
  schedule_mode text NOT NULL DEFAULT 'none',
  case_types text[],
  budget_category text,
  budget_unit text,
  default_budget_amount numeric(10,2),
  default_duration_minutes integer,
  allow_recurring boolean DEFAULT false,
  analytics_category text,
  report_section_id uuid,
  report_section_order integer,
  report_template_fields jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Create case_service_instances table
CREATE TABLE IF NOT EXISTS public.case_service_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  case_service_id uuid NOT NULL REFERENCES case_services(id) ON DELETE CASCADE,
  assigned_investigator_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending',
  quantity_estimated numeric(8,2),
  quantity_actual numeric(8,2) DEFAULT 0,
  billable boolean DEFAULT true,
  notes text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completion_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  billed_at timestamptz,
  locked_at timestamptz,
  locked_reason text,
  invoice_line_item_id uuid,
  scheduled_at timestamptz,
  unscheduled_at timestamptz,
  unscheduled_by uuid,
  unscheduled_reason text
);

-- Enable RLS
ALTER TABLE public.case_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_service_instances ENABLE ROW LEVEL SECURITY;

-- Initial Policies
CREATE POLICY "Users can view services in their organization"
  ON public.case_services FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage services in their organization"
  ON public.case_services FOR ALL
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view service instances in their organization"
  ON public.case_service_instances FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage service instances in their organization"
  ON public.case_service_instances FOR ALL
  USING (is_org_member(auth.uid(), organization_id));

-- Create report_templates table
CREATE TABLE public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_system_template boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create template_sections table
CREATE TABLE public.template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  section_type text NOT NULL CHECK (section_type IN ('static_text', 'case_variable_block', 'event_collection', 'update_collection')),
  display_order integer NOT NULL DEFAULT 0,
  content text,
  variable_config jsonb,
  collection_config jsonb,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_report_templates_org ON public.report_templates(organization_id);
CREATE INDEX idx_report_templates_system ON public.report_templates(is_system_template) WHERE is_system_template = true;
CREATE INDEX idx_template_sections_template ON public.template_sections(template_id);
CREATE INDEX idx_template_sections_order ON public.template_sections(template_id, display_order);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_templates
CREATE POLICY "Users can view templates in their org or system templates"
ON public.report_templates FOR SELECT
USING (
  is_system_template = true 
  OR organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create templates in their org"
ON public.report_templates FOR INSERT
WITH CHECK (
  is_system_template = false
  AND organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update templates in their org"
ON public.report_templates FOR UPDATE
USING (
  is_system_template = false
  AND organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete templates in their org"
ON public.report_templates FOR DELETE
USING (
  is_system_template = false
  AND organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- RLS policies for template_sections
CREATE POLICY "Users can view sections of accessible templates"
ON public.template_sections FOR SELECT
USING (
  template_id IN (
    SELECT id FROM public.report_templates 
    WHERE is_system_template = true 
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create sections for their org templates"
ON public.template_sections FOR INSERT
WITH CHECK (
  template_id IN (
    SELECT id FROM public.report_templates 
    WHERE is_system_template = false
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update sections of their org templates"
ON public.template_sections FOR UPDATE
USING (
  template_id IN (
    SELECT id FROM public.report_templates 
    WHERE is_system_template = false
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete sections of their org templates"
ON public.template_sections FOR DELETE
USING (
  template_id IN (
    SELECT id FROM public.report_templates 
    WHERE is_system_template = false
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_template_sections_updated_at
  BEFORE UPDATE ON public.template_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
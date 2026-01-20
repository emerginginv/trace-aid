-- Create template_header_footer_config table for header/footer customization
CREATE TABLE public.template_header_footer_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.report_templates(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Header Configuration
  header_show_logo boolean DEFAULT true,
  header_show_org_name boolean DEFAULT true,
  header_show_org_address boolean DEFAULT false,
  header_show_org_phone boolean DEFAULT false,
  header_show_org_email boolean DEFAULT false,
  header_show_report_title boolean DEFAULT true,
  header_show_case_number boolean DEFAULT true,
  header_show_report_date boolean DEFAULT true,
  
  -- Footer Configuration
  footer_show_org_name boolean DEFAULT true,
  footer_show_page_number boolean DEFAULT true,
  footer_show_confidentiality boolean DEFAULT true,
  footer_show_website boolean DEFAULT false,
  footer_show_phone boolean DEFAULT false,
  footer_show_generated_date boolean DEFAULT false,
  footer_confidentiality_text text DEFAULT 'CONFIDENTIAL - This report contains privileged information intended solely for the recipient.',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(template_id)
);

-- Enable RLS
ALTER TABLE public.template_header_footer_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage header/footer config for their org templates
CREATE POLICY "Users can manage header/footer config for their org templates"
  ON public.template_header_footer_config
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_template_header_footer_config_updated_at
  BEFORE UPDATE ON public.template_header_footer_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
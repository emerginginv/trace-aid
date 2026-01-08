-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing structured report tables (in dependency order)
DROP TABLE IF EXISTS public.template_sections CASCADE;
DROP TABLE IF EXISTS public.report_templates CASCADE;
DROP TABLE IF EXISTS public.report_instances CASCADE;

-- Create docx_templates table
CREATE TABLE public.docx_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  filename_template TEXT,
  case_types TEXT[],
  role_restriction TEXT,
  detected_variables TEXT[],
  uses_merge_fields BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create generated_reports table
CREATE TABLE public.generated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.docx_templates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  output_file_path TEXT NOT NULL,
  variables_used JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.docx_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for docx_templates
CREATE POLICY "Users can view templates in their organization"
ON public.docx_templates FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create templates in their organization"
ON public.docx_templates FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update templates in their organization"
ON public.docx_templates FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete templates in their organization"
ON public.docx_templates FOR DELETE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

-- RLS policies for generated_reports
CREATE POLICY "Users can view generated reports in their organization"
ON public.generated_reports FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create generated reports in their organization"
ON public.generated_reports FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete generated reports in their organization"
ON public.generated_reports FOR DELETE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

-- Create updated_at trigger for docx_templates
CREATE TRIGGER update_docx_templates_updated_at
BEFORE UPDATE ON public.docx_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_docx_templates_org ON public.docx_templates(organization_id);
CREATE INDEX idx_docx_templates_active ON public.docx_templates(is_active);
CREATE INDEX idx_generated_reports_case ON public.generated_reports(case_id);
CREATE INDEX idx_generated_reports_org ON public.generated_reports(organization_id);

-- Create storage buckets for DOCX templates and generated reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('docx-templates', 'docx-templates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-reports', 'generated-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for docx-templates bucket
CREATE POLICY "Users can upload docx templates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'docx-templates' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view docx templates in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'docx-templates' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete docx templates in their org"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'docx-templates' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Storage policies for generated-reports bucket
CREATE POLICY "Users can upload generated reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-reports' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view generated reports in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generated-reports' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete generated reports in their org"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-reports' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
  )
);
-- Create document_templates table for Letters & Documents
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'letter',
  body TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create document_instances table for generated documents
CREATE TABLE public.document_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  rendered_html TEXT NOT NULL,
  org_profile_snapshot JSONB,
  case_variables_snapshot JSONB,
  export_format TEXT,
  exported_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_templates
CREATE POLICY "Users can view templates in their organization"
ON public.document_templates FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create templates in their organization"
ON public.document_templates FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id) AND user_id = auth.uid());

CREATE POLICY "Users can update templates in their organization"
ON public.document_templates FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete templates in their organization"
ON public.document_templates FOR DELETE
USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for document_instances
CREATE POLICY "Users can view documents in their organization"
ON public.document_instances FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create documents in their organization"
ON public.document_instances FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id) AND user_id = auth.uid());

CREATE POLICY "Users can update documents in their organization"
ON public.document_instances FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete documents in their organization"
ON public.document_instances FOR DELETE
USING (is_org_member(auth.uid(), organization_id));

-- Create indexes for performance
CREATE INDEX idx_document_templates_org ON public.document_templates(organization_id);
CREATE INDEX idx_document_instances_case ON public.document_instances(case_id);
CREATE INDEX idx_document_instances_org ON public.document_instances(organization_id);
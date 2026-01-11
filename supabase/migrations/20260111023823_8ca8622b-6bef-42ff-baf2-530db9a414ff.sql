-- Create table for social media and external links for People subjects
CREATE TABLE public.subject_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.case_subjects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'snapchat', 'youtube', 'reddit', 'whatsapp', 'telegram', 'other')),
  label TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_subject_social_links_subject_id ON public.subject_social_links(subject_id);
CREATE INDEX idx_subject_social_links_organization_id ON public.subject_social_links(organization_id);

-- Enable RLS
ALTER TABLE public.subject_social_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization-based access
CREATE POLICY "Users can view social links in their organization"
  ON public.subject_social_links
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create social links in their organization"
  ON public.subject_social_links
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update social links in their organization"
  ON public.subject_social_links
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete social links in their organization"
  ON public.subject_social_links
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Phase 1: Add new columns to case_subjects table
-- Add status for archiving (soft delete)
ALTER TABLE public.case_subjects 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add constraint for status values
ALTER TABLE public.case_subjects 
ADD CONSTRAINT case_subjects_status_check CHECK (status IN ('active', 'archived'));

-- Add display_name for more descriptive naming
ALTER TABLE public.case_subjects 
ADD COLUMN IF NOT EXISTS display_name text;

-- Add archived tracking
ALTER TABLE public.case_subjects 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

ALTER TABLE public.case_subjects 
ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id);

-- Add role for people category
ALTER TABLE public.case_subjects 
ADD COLUMN IF NOT EXISTS role text;

-- Create subject_links table for cross-references between subjects
CREATE TABLE IF NOT EXISTS public.subject_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  source_subject_id uuid NOT NULL REFERENCES public.case_subjects(id) ON DELETE CASCADE,
  target_subject_id uuid NOT NULL REFERENCES public.case_subjects(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE(source_subject_id, target_subject_id, link_type)
);

-- Enable RLS on subject_links
ALTER TABLE public.subject_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for subject_links
CREATE POLICY "Users can view subject links in their org"
ON public.subject_links FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert subject links in their org"
ON public.subject_links FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update subject links in their org"
ON public.subject_links FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete subject links in their org"
ON public.subject_links FOR DELETE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

-- Create subject_references table for tracking where subjects are used
CREATE TABLE IF NOT EXISTS public.subject_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.case_subjects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  reference_table text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on subject_references
ALTER TABLE public.subject_references ENABLE ROW LEVEL SECURITY;

-- RLS policies for subject_references
CREATE POLICY "Users can view subject references in their org"
ON public.subject_references FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert subject references in their org"
ON public.subject_references FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete subject references in their org"
ON public.subject_references FOR DELETE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid()
));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_case_subjects_status ON public.case_subjects(status);
CREATE INDEX IF NOT EXISTS idx_case_subjects_subject_type ON public.case_subjects(subject_type);
CREATE INDEX IF NOT EXISTS idx_subject_links_source ON public.subject_links(source_subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_links_target ON public.subject_links(target_subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_references_subject ON public.subject_references(subject_id);
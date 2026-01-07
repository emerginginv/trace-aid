-- Create attachment_folders table
CREATE TABLE public.attachment_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  parent_folder_id UUID REFERENCES public.attachment_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create unique index that handles nulls properly
CREATE UNIQUE INDEX idx_attachment_folders_unique_name 
  ON public.attachment_folders (case_id, name, (COALESCE(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid)));

-- Add folder_id to case_attachments
ALTER TABLE public.case_attachments 
ADD COLUMN folder_id UUID REFERENCES public.attachment_folders(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_attachment_folders_case_id ON public.attachment_folders(case_id);
CREATE INDEX idx_case_attachments_folder_id ON public.case_attachments(folder_id);

-- Enable RLS
ALTER TABLE public.attachment_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachment_folders
CREATE POLICY "Users can view folders in their org"
  ON public.attachment_folders FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create folders in their org"
  ON public.attachment_folders FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update folders in their org"
  ON public.attachment_folders FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete folders in their org"
  ON public.attachment_folders FOR DELETE
  USING (is_org_member(auth.uid(), organization_id));

-- Enable realtime for folders
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachment_folders;
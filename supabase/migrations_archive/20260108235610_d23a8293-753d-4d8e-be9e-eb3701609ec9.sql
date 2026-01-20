-- Create junction table to link updates to existing case attachments
CREATE TABLE public.update_attachment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES public.case_updates(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL REFERENCES public.case_attachments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_by_user_id UUID REFERENCES public.profiles(id),
  UNIQUE(update_id, attachment_id)
);

-- Enable RLS
ALTER TABLE public.update_attachment_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization isolation
CREATE POLICY "Users can view attachment links in their organization"
ON public.update_attachment_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = update_attachment_links.organization_id
  )
);

CREATE POLICY "Users can create attachment links in their organization"
ON public.update_attachment_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = update_attachment_links.organization_id
  )
);

CREATE POLICY "Users can delete attachment links in their organization"
ON public.update_attachment_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = update_attachment_links.organization_id
  )
);

-- Add index for performance
CREATE INDEX idx_update_attachment_links_update_id ON public.update_attachment_links(update_id);
CREATE INDEX idx_update_attachment_links_attachment_id ON public.update_attachment_links(attachment_id);
CREATE INDEX idx_update_attachment_links_org_id ON public.update_attachment_links(organization_id);
-- Add file_hash column for deduplication
ALTER TABLE public.case_attachments 
ADD COLUMN file_hash TEXT;

-- Index for fast duplicate lookup within a case
CREATE INDEX idx_case_attachments_case_hash 
ON public.case_attachments(case_id, file_hash) 
WHERE file_hash IS NOT NULL;

-- Index for cross-case deduplication within organization
CREATE INDEX idx_case_attachments_org_hash 
ON public.case_attachments(organization_id, file_hash) 
WHERE file_hash IS NOT NULL;
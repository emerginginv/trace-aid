-- Add draft status support to cases table
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;

ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS draft_created_by uuid REFERENCES auth.users(id);

ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS draft_approved_at timestamptz;

ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS draft_approved_by uuid REFERENCES auth.users(id);

-- Add index for efficient draft filtering
CREATE INDEX IF NOT EXISTS idx_cases_is_draft ON public.cases(is_draft) WHERE is_draft = true;

-- Add index for finding user's drafts
CREATE INDEX IF NOT EXISTS idx_cases_draft_created_by ON public.cases(draft_created_by) WHERE is_draft = true;
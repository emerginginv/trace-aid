-- Add AI summary columns to case_updates table
ALTER TABLE public.case_updates
  ADD COLUMN IF NOT EXISTS is_ai_summary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_source_update_ids uuid[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_approved_by uuid DEFAULT NULL;

-- Add foreign key constraint for ai_approved_by
ALTER TABLE public.case_updates
  ADD CONSTRAINT case_updates_ai_approved_by_fkey 
  FOREIGN KEY (ai_approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index on is_ai_summary for efficient filtering
CREATE INDEX IF NOT EXISTS idx_case_updates_is_ai_summary ON public.case_updates(is_ai_summary) WHERE is_ai_summary = true;
-- Create subject_attachments table
CREATE TABLE IF NOT EXISTS public.subject_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.case_subjects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT,
  name TEXT,
  tags TEXT[]
);

-- Enable RLS
ALTER TABLE public.subject_attachments ENABLE ROW LEVEL SECURITY;

-- Initial RLS policy
CREATE POLICY "Users can manage own subject attachments"
ON public.subject_attachments
FOR ALL
USING (auth.uid() = user_id);

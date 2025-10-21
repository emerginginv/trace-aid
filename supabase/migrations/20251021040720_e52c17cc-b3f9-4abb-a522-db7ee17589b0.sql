-- Create subject_attachments table
CREATE TABLE public.subject_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.case_subjects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  name TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  tags TEXT[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subject_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage own subject attachments"
ON public.subject_attachments
FOR ALL
USING (auth.uid() = user_id);

-- Create storage bucket for subject attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-attachments', 'subject-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for subject attachments
CREATE POLICY "Users can view their own subject attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'subject-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own subject attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'subject-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own subject attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'subject-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own subject attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'subject-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
-- Create storage bucket for case attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('case-attachments', 'case-attachments', false);

-- Create case_attachments table
CREATE TABLE public.case_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policy for case attachments
CREATE POLICY "Users can manage own case attachments"
ON public.case_attachments
FOR ALL
USING (auth.uid() = user_id);

-- Storage policies for case-attachments bucket
CREATE POLICY "Users can view their own case attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own case attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own case attachments"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own case attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
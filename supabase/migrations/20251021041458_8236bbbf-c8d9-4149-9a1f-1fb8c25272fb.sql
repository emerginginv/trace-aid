-- Add profile_image_url column to case_subjects table
ALTER TABLE public.case_subjects
ADD COLUMN profile_image_url text;

-- Create storage bucket for subject profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-profile-images', 'subject-profile-images', true);

-- Create policies for subject profile images
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'subject-profile-images');

CREATE POLICY "Users can upload their own subject profile images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'subject-profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own subject profile images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'subject-profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own subject profile images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'subject-profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
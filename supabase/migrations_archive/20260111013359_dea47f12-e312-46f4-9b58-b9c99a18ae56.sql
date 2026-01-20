-- Add self-access SELECT policy for subject-profile-images
-- This allows uploaders to read their own files immediately after upload
-- Matches the pattern used by case-attachments bucket which works correctly

CREATE POLICY "Users can view their own uploaded subject profile images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'subject-profile-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
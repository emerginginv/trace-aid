-- Allow organization members to upload preview thumbnails
-- Preview path format: previews/{organization_id}/{attachment_id}.jpg

CREATE POLICY "Organization members can upload preview thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'case-attachments'
  AND (storage.foldername(name))[1] = 'previews'
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id::text = (storage.foldername(name))[2]
  )
);

-- Also allow update for upsert operations
CREATE POLICY "Organization members can update preview thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'case-attachments'
  AND (storage.foldername(name))[1] = 'previews'
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id::text = (storage.foldername(name))[2]
  )
);
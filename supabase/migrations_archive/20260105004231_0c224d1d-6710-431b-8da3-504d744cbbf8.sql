-- Allow organization members to read attachments uploaded by other org members
-- This enables preview/download of files for all users in the same organization

-- Create a security definer function to check if user is in the same org as the attachment
CREATE OR REPLACE FUNCTION public.can_access_case_attachment(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.case_attachments ca
    JOIN public.organization_members om ON ca.organization_id = om.organization_id
    WHERE ca.file_path = file_path
      AND om.user_id = auth.uid()
  )
$$;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can view case attachments" ON storage.objects;

-- Create new policy allowing org members to read any attachment in their org
CREATE POLICY "Organization members can view case attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'case-attachments' 
  AND public.can_access_case_attachment(name)
);

-- Ensure upload policy exists (users can upload to their own folder)
DROP POLICY IF EXISTS "Users can upload case attachments" ON storage.objects;
CREATE POLICY "Users can upload case attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'case-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Ensure update policy exists
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
CREATE POLICY "Users can update their own uploads"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'case-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Ensure delete policy exists
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
CREATE POLICY "Users can delete their own uploads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'case-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
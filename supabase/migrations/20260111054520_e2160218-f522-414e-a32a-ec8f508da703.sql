-- Drop existing incorrect policies that check user_id in path
DROP POLICY IF EXISTS "Users can upload their organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their organization logos" ON storage.objects;

-- Create corrected policies that check organization membership
CREATE POLICY "Organization members can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);
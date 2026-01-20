-- Create a security definer function to check if user can access subject profile images
CREATE OR REPLACE FUNCTION public.can_access_subject_profile_image(file_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.case_subjects cs
    JOIN public.organization_members om ON cs.organization_id = om.organization_id
    WHERE cs.profile_image_url LIKE '%' || file_path || '%'
      AND om.user_id = auth.uid()
  )
$$;

-- Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'subject-profile-images';

-- Drop the old public SELECT policy
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;

-- Create new SELECT policy requiring authentication and org membership
CREATE POLICY "Authenticated users can view subject profile images in their org"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'subject-profile-images' 
  AND public.can_access_subject_profile_image(name)
);

-- Update the existing INSERT/UPDATE/DELETE policies to use authenticated role
DROP POLICY IF EXISTS "Users can upload their own subject profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own subject profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own subject profile images" ON storage.objects;

CREATE POLICY "Users can upload subject profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subject-profile-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update subject profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'subject-profile-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete subject profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'subject-profile-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
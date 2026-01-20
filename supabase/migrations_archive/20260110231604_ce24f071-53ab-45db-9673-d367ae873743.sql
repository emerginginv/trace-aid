-- Fix subject-profile-images storage policies
-- Remove the TO authenticated clause to match working bucket patterns

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload subject profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update subject profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete subject profile images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view subject profile images in their org" ON storage.objects;

-- Recreate INSERT policy without TO authenticated
CREATE POLICY "Users can upload subject profile images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'subject-profile-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Recreate UPDATE policy without TO authenticated  
CREATE POLICY "Users can update subject profile images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'subject-profile-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Recreate DELETE policy without TO authenticated
CREATE POLICY "Users can delete subject profile images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'subject-profile-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Recreate SELECT policy without TO authenticated
CREATE POLICY "Authenticated users can view subject profile images in their org"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'subject-profile-images' 
  AND public.can_access_subject_profile_image(name)
);
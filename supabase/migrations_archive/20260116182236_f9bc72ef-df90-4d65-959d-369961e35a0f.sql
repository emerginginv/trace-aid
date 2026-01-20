-- Create case-request-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-request-files', 'case-request-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous uploads to case-request-files bucket
CREATE POLICY "Allow anonymous uploads to case-request-files"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'case-request-files');

-- Allow public read access to case-request-files
CREATE POLICY "Allow public read access to case-request-files"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'case-request-files');

-- Allow authenticated users to manage case-request-files
CREATE POLICY "Allow authenticated users to manage case-request-files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'case-request-files')
WITH CHECK (bucket_id = 'case-request-files');
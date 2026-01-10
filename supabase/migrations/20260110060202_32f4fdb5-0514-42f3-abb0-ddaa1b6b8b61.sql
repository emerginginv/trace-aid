-- Enable RLS on reserved_subdomains table and add public read policy
ALTER TABLE reserved_subdomains ENABLE ROW LEVEL SECURITY;

-- Everyone can read reserved subdomains (needed for validation)
CREATE POLICY "Anyone can view reserved subdomains"
ON reserved_subdomains FOR SELECT
USING (true);

-- Only system can modify reserved subdomains (no user policies for insert/update/delete)
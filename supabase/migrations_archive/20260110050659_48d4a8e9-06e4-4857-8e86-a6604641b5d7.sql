-- Add subdomain column to organizations table for multi-tenant routing
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS subdomain text UNIQUE,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create index for fast subdomain lookups
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON public.organizations(subdomain) WHERE subdomain IS NOT NULL;

-- Add a policy to allow reading organization by subdomain (for authenticated users only, read-only)
-- This allows any authenticated user to find an organization by subdomain during login flow
CREATE POLICY "Authenticated users can view organizations by subdomain"
ON public.organizations
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND subdomain IS NOT NULL
);
-- Revoke anonymous access to the accounts table
-- The accounts table contains sensitive customer business information
-- and should only be accessible to authenticated organization members

REVOKE ALL ON public.accounts FROM anon;

-- Ensure authenticated users still have the necessary privileges
-- (RLS policies will further restrict access to organization members)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;

-- Add a comment documenting the security decision
COMMENT ON TABLE public.accounts IS 'Customer accounts - RLS restricts to organization members with appropriate permissions. Anonymous access revoked for security.';
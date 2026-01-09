-- Revoke unnecessary grants on attachment_access from anon
-- The edge function uses service role, so anon never needs direct table access

REVOKE ALL ON public.attachment_access FROM anon;

-- Authenticated users need access for managing sharing links
-- Grants are already correct for authenticated, just verify RLS is enforced
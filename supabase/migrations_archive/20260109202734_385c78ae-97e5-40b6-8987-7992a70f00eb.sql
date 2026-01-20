-- Revoke unnecessary anon access from sensitive business tables
-- These tables have RLS policies requiring auth.uid() so anon access is useless
-- but grants should be removed for defense in depth

-- Revoke from contacts
REVOKE ALL ON public.contacts FROM anon;

-- Revoke from cases
REVOKE ALL ON public.cases FROM anon;

-- Revoke from invoices
REVOKE ALL ON public.invoices FROM anon;

-- Revoke from case_attachments
REVOKE ALL ON public.case_attachments FROM anon;
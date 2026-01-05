-- Remove legacy policies without TO authenticated clause on contacts table
DROP POLICY IF EXISTS "Admins can manage contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Vendors cannot access contacts" ON public.contacts;

-- The secure policies with TO authenticated already exist and are properly configured
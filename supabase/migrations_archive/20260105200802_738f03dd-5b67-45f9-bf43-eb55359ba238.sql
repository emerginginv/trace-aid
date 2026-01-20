-- Remove legacy policies without TO authenticated clause on accounts table
DROP POLICY IF EXISTS "Admins can manage accounts in their organization" ON public.accounts;
DROP POLICY IF EXISTS "Vendors cannot access accounts" ON public.accounts;

-- The secure policies with TO authenticated already exist and are properly configured
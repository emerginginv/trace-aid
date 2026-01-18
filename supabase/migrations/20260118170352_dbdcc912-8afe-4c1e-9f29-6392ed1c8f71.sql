-- Fix invoice_payments security: Revoke anon access and restrict to authorized billing staff

-- Step 1: Revoke ALL privileges from anon role
REVOKE ALL ON public.invoice_payments FROM anon;

-- Step 2: Ensure authenticated role has necessary privileges (through RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO authenticated;

-- Step 3: Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view invoice payments in their organization" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can manage invoice payments in their organization" ON public.invoice_payments;
DROP POLICY IF EXISTS "Admins can view all invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Admins can insert all invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Admins can update all invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Admins can delete all invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Admins can delete invoice payments in their organization" ON public.invoice_payments;
DROP POLICY IF EXISTS "Admins can insert invoice payments in their organization" ON public.invoice_payments;
DROP POLICY IF EXISTS "Admins can update invoice payments in their organization" ON public.invoice_payments;

-- Step 4: Create proper restrictive policies for billing staff only

-- Admins can view all invoice payments in their organization
CREATE POLICY "invoice_payments_select_admin"
ON public.invoice_payments FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Managers can view invoice payments in their organization
CREATE POLICY "invoice_payments_select_manager"
ON public.invoice_payments FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Users can view their own invoice payments (ones they created)
CREATE POLICY "invoice_payments_select_own"
ON public.invoice_payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can insert invoice payments
CREATE POLICY "invoice_payments_insert_admin"
ON public.invoice_payments FOR INSERT
TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Managers can insert invoice payments
CREATE POLICY "invoice_payments_insert_manager"
ON public.invoice_payments FOR INSERT
TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Admins can update invoice payments
CREATE POLICY "invoice_payments_update_admin"
ON public.invoice_payments FOR UPDATE
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete invoice payments
CREATE POLICY "invoice_payments_delete_admin"
ON public.invoice_payments FOR DELETE
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);
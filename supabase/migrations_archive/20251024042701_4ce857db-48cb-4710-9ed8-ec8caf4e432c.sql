-- Add admin RLS policies to main data tables
-- This allows administrators to view and manage all records across the organization

-- Accounts table: Add admin access policies
CREATE POLICY "Admins can view all accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all accounts"
ON public.accounts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all accounts"
ON public.accounts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Contacts table: Add admin access policies
CREATE POLICY "Admins can view all contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all contacts"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Cases table: Add admin access policies
CREATE POLICY "Admins can view all cases"
ON public.cases
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all cases"
ON public.cases
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all cases"
ON public.cases
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all cases"
ON public.cases
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Case activities: Add admin access policies
CREATE POLICY "Admins can view all case activities"
ON public.case_activities
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all case activities"
ON public.case_activities
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all case activities"
ON public.case_activities
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all case activities"
ON public.case_activities
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Case finances: Add admin access policies
CREATE POLICY "Admins can view all case finances"
ON public.case_finances
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all case finances"
ON public.case_finances
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all case finances"
ON public.case_finances
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all case finances"
ON public.case_finances
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Case subjects: Add admin access policies
CREATE POLICY "Admins can view all case subjects"
ON public.case_subjects
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all case subjects"
ON public.case_subjects
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all case subjects"
ON public.case_subjects
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all case subjects"
ON public.case_subjects
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Case updates: Add admin access policies
CREATE POLICY "Admins can view all case updates"
ON public.case_updates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all case updates"
ON public.case_updates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all case updates"
ON public.case_updates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all case updates"
ON public.case_updates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Case attachments: Add admin access policies
CREATE POLICY "Admins can view all case attachments"
ON public.case_attachments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all case attachments"
ON public.case_attachments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all case attachments"
ON public.case_attachments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all case attachments"
ON public.case_attachments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Invoices: Add admin access policies
CREATE POLICY "Admins can view all invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Invoice payments: Add admin access policies
CREATE POLICY "Admins can view all invoice payments"
ON public.invoice_payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all invoice payments"
ON public.invoice_payments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all invoice payments"
ON public.invoice_payments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all invoice payments"
ON public.invoice_payments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Retainer funds: Add admin access policies
CREATE POLICY "Admins can view all retainer funds"
ON public.retainer_funds
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all retainer funds"
ON public.retainer_funds
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all retainer funds"
ON public.retainer_funds
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all retainer funds"
ON public.retainer_funds
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Subject attachments: Add admin access policies
CREATE POLICY "Admins can view all subject attachments"
ON public.subject_attachments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all subject attachments"
ON public.subject_attachments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all subject attachments"
ON public.subject_attachments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all subject attachments"
ON public.subject_attachments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Picklists: Add admin access policies
CREATE POLICY "Admins can view all picklists"
ON public.picklists
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all picklists"
ON public.picklists
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all picklists"
ON public.picklists
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all picklists"
ON public.picklists
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
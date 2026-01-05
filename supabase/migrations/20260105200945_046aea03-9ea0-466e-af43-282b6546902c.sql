-- Remove legacy policies without TO authenticated clause on import_batches table
DROP POLICY IF EXISTS "Admins can manage import batches" ON public.import_batches;
DROP POLICY IF EXISTS "Users can view import batches in their organization" ON public.import_batches;

-- Create secure policies with TO authenticated clause
CREATE POLICY "Admins can manage import batches"
ON public.import_batches
FOR ALL
TO authenticated
USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view import batches in their organization"
ON public.import_batches
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), organization_id));
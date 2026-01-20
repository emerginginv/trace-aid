-- Add organization_id to notifications table
ALTER TABLE public.notifications 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Create index for faster queries
CREATE INDEX idx_notifications_org_id ON public.notifications(organization_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- Create new RLS policies with organization scoping
CREATE POLICY "Users can view notifications in their organization"
ON public.notifications
FOR SELECT
USING (
  auth.uid() = user_id 
  AND is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Users can update own notifications in their organization"
ON public.notifications
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Users can delete own notifications in their organization"
ON public.notifications
FOR DELETE
USING (
  auth.uid() = user_id 
  AND is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Users can insert notifications in their organization"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND is_org_member(auth.uid(), organization_id)
);
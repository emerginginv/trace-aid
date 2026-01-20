-- Drop the restrictive check constraint on update_type
-- This allows dynamic update types from picklists
ALTER TABLE public.case_updates DROP CONSTRAINT IF EXISTS valid_update_type;

-- Ensure notifications table has proper RLS policy for inserts
-- First drop existing insert policy if any
DROP POLICY IF EXISTS "Users can create notifications for their organization" ON public.notifications;

-- Create policy allowing users to insert notifications for their organization
CREATE POLICY "Users can create notifications for their organization" 
ON public.notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);
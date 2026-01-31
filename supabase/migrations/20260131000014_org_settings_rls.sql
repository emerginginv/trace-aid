-- Migration to add RLS policies for organization_settings
-- Allows users to manage their own settings or organization-wide settings

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own or org settings" ON public.organization_settings;
CREATE POLICY "Users can view their own or org settings" ON public.organization_settings
  FOR SELECT USING (
    (user_id = auth.uid()) OR 
    is_org_member(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Users can manage their own or org settings" ON public.organization_settings;
CREATE POLICY "Users can manage their own or org settings" ON public.organization_settings
  FOR ALL USING (
    (user_id = auth.uid()) OR 
    (is_org_member(auth.uid(), organization_id) AND 
     EXISTS (
       SELECT 1 FROM organization_members 
       WHERE user_id = auth.uid() 
       AND organization_id = organization_settings.organization_id 
       AND (role IN ('admin', 'owner', 'manager'))
     ))
  );

COMMENT ON POLICY "Users can view their own or org settings" ON public.organization_settings IS 'Allows users to view settings they created or settings for organizations they belong to.';

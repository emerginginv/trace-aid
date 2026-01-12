-- Create a function to trigger welcome email after organization member creation
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger AS $$
DECLARE
  org_subdomain text;
BEGIN
  -- Only send for owner role (the initial signup)
  IF NEW.role = 'owner' THEN
    -- Get the organization subdomain
    SELECT subdomain INTO org_subdomain
    FROM public.organizations
    WHERE id = NEW.organization_id;
    
    -- Log the welcome email trigger (actual email will be sent via edge function)
    -- The edge function will be called from the client after successful signup
    INSERT INTO public.audit_events (
      action,
      actor_user_id,
      organization_id,
      metadata
    ) VALUES (
      'welcome_email_triggered',
      NEW.user_id,
      NEW.organization_id,
      jsonb_build_object('subdomain', org_subdomain)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on organization_members
DROP TRIGGER IF EXISTS on_new_org_owner_welcome ON public.organization_members;
CREATE TRIGGER on_new_org_owner_welcome
  AFTER INSERT ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();
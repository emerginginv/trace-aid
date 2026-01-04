-- Sync user_roles table with organization_members to ensure data consistency
-- This cleans up duplicate entries and ensures each user has the correct role

-- Step 1: Delete all existing user_roles entries that don't match organization_members
DELETE FROM public.user_roles
WHERE id NOT IN (
  SELECT DISTINCT ON (ur.user_id) ur.id
  FROM public.user_roles ur
  INNER JOIN public.organization_members om ON ur.user_id = om.user_id AND ur.role = om.role
  ORDER BY ur.user_id, ur.created_at ASC
);

-- Step 2: Insert missing roles from organization_members into user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT DISTINCT ON (om.user_id) om.user_id, om.role, om.created_at
FROM public.organization_members om
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = om.user_id
)
ORDER BY om.user_id, om.created_at ASC;

-- Step 3: Update existing user_roles entries to match their primary organization's role
UPDATE public.user_roles ur
SET role = (
  SELECT om.role
  FROM public.organization_members om
  WHERE om.user_id = ur.user_id
  ORDER BY om.created_at ASC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.organization_members om WHERE om.user_id = ur.user_id
);

-- Step 4: Create a trigger function to keep user_roles in sync with organization_members
CREATE OR REPLACE FUNCTION public.sync_user_role_on_org_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert or update user_role when a new org member is added
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    -- Update user_role when org member role changes
    -- First delete old role, then insert new one
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = OLD.role;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- When an org member is deleted, check if they have other memberships
    -- Only delete from user_roles if no other memberships exist with that role
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = OLD.user_id AND role = OLD.role AND id != OLD.id
    ) THEN
      DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = OLD.role;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Step 5: Create the trigger on organization_members
DROP TRIGGER IF EXISTS sync_user_role_trigger ON public.organization_members;
CREATE TRIGGER sync_user_role_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_on_org_member_change();
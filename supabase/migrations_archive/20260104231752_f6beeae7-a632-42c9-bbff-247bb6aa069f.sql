-- Create immutability trigger for attachment_access audit fields
CREATE OR REPLACE FUNCTION public.prevent_attachment_access_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent modification of immutable audit fields
  IF OLD.created_at IS DISTINCT FROM NEW.created_at OR
     OLD.created_by_user_id IS DISTINCT FROM NEW.created_by_user_id OR
     OLD.access_token IS DISTINCT FROM NEW.access_token OR
     OLD.attachment_id IS DISTINCT FROM NEW.attachment_id OR
     OLD.attachment_type IS DISTINCT FROM NEW.attachment_type THEN
    RAISE EXCEPTION 'Cannot modify immutable audit fields in attachment_access';
  END IF;
  
  -- Allow updates to operational fields:
  -- revoked_at, revoked_by_user_id, last_accessed_at, access_count, expires_at
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce immutability
CREATE TRIGGER enforce_attachment_access_immutability
  BEFORE UPDATE ON public.attachment_access
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_attachment_access_audit_modification();
-- Create attachment_access table for secure, auditable access links
CREATE TABLE public.attachment_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL,
  attachment_type text NOT NULL CHECK (attachment_type IN ('case', 'subject')),
  access_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  revoked_by_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  last_accessed_at timestamptz NULL,
  access_count integer NOT NULL DEFAULT 0
);

-- Create indexes for efficient lookups
CREATE INDEX idx_attachment_access_token ON public.attachment_access(access_token);
CREATE INDEX idx_attachment_access_attachment ON public.attachment_access(attachment_id, attachment_type);
CREATE INDEX idx_attachment_access_org ON public.attachment_access(organization_id);
CREATE INDEX idx_attachment_access_created_by ON public.attachment_access(created_by_user_id);

-- Enable RLS
ALTER TABLE public.attachment_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org attachment access links"
ON public.attachment_access FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create access links in their org"
ON public.attachment_access FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND created_by_user_id = auth.uid()
);

CREATE POLICY "Users can revoke access links in their org"
ON public.attachment_access FOR UPDATE
USING (is_org_member(auth.uid(), organization_id))
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Only admins can delete access links"
ON public.attachment_access FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = attachment_access.organization_id
    AND om.role = 'admin'
  )
);

-- Create validation function (SECURITY DEFINER for public access via edge function)
CREATE OR REPLACE FUNCTION public.validate_attachment_access(p_token uuid)
RETURNS TABLE(
  attachment_id uuid,
  attachment_type text,
  file_path text,
  file_name text,
  file_type text,
  is_valid boolean,
  denial_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_access_record attachment_access%ROWTYPE;
BEGIN
  -- Find the access record
  SELECT * INTO v_access_record
  FROM attachment_access aa
  WHERE aa.access_token = p_token;
  
  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text,
      false, 'Invalid token'::text;
    RETURN;
  END IF;
  
  -- Check if revoked
  IF v_access_record.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text,
      false, 'Access revoked'::text;
    RETURN;
  END IF;
  
  -- Check if expired
  IF v_access_record.expires_at IS NOT NULL 
     AND v_access_record.expires_at < now() THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text,
      false, 'Access expired'::text;
    RETURN;
  END IF;
  
  -- Update last accessed timestamp and count (audit trail)
  UPDATE attachment_access
  SET last_accessed_at = now(),
      access_count = access_count + 1
  WHERE id = v_access_record.id;
  
  -- Return attachment info based on type
  IF v_access_record.attachment_type = 'case' THEN
    RETURN QUERY SELECT 
      ca.id, 'case'::text, ca.file_path, ca.file_name, ca.file_type,
      true, NULL::text
    FROM case_attachments ca
    WHERE ca.id = v_access_record.attachment_id;
  ELSE
    RETURN QUERY SELECT 
      sa.id, 'subject'::text, sa.file_path, sa.file_name, sa.file_type,
      true, NULL::text
    FROM subject_attachments sa
    WHERE sa.id = v_access_record.attachment_id;
  END IF;
END;
$$;
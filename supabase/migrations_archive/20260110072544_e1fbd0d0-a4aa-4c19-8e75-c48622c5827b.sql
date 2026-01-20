-- Step 16: Contracting, DPAs & Legal Workflows

-- Create enums for contract management
CREATE TYPE contract_type AS ENUM ('msa', 'sow', 'order_form', 'dpa', 'nda', 'other');
CREATE TYPE contract_status AS ENUM ('draft', 'sent', 'pending_signature', 'signed', 'active', 'expired', 'terminated', 'superseded');

-- Contracts table
CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_type contract_type NOT NULL,
  title text NOT NULL,
  description text,
  status contract_status NOT NULL DEFAULT 'draft',
  version text,
  effective_date date,
  expiration_date date,
  auto_renews boolean NOT NULL DEFAULT false,
  renewal_term_days integer,
  renewal_notice_days integer DEFAULT 30,
  signed_at timestamptz,
  signed_by text,
  signer_email text,
  signer_title text,
  file_path text,
  supersedes_contract_id uuid REFERENCES contracts(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Contract renewal notifications tracking
CREATE TABLE contract_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- '90_day', '30_day', '7_day', 'expired'
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_to text[] NOT NULL
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_notifications ENABLE ROW LEVEL SECURITY;

-- Org admins can manage their organization's contracts
CREATE POLICY "contracts_org_admin_all" ON contracts
  FOR ALL TO authenticated
  USING (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Platform staff can manage all contracts
CREATE POLICY "contracts_platform_staff_all" ON contracts
  FOR ALL TO authenticated
  USING (is_platform_staff(auth.uid()));

-- Platform staff can view notifications
CREATE POLICY "contract_notifications_platform_staff" ON contract_notifications
  FOR ALL TO authenticated
  USING (is_platform_staff(auth.uid()));

-- Org admins can view their contract notifications
CREATE POLICY "contract_notifications_org_admin" ON contract_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id
      AND is_org_member(auth.uid(), c.organization_id)
      AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Function to create a contract
CREATE OR REPLACE FUNCTION create_contract(
  p_organization_id uuid,
  p_contract_type contract_type,
  p_title text,
  p_description text DEFAULT NULL,
  p_version text DEFAULT NULL,
  p_effective_date date DEFAULT NULL,
  p_expiration_date date DEFAULT NULL,
  p_auto_renews boolean DEFAULT false,
  p_renewal_term_days integer DEFAULT NULL,
  p_file_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  -- Verify access
  IF NOT (
    (is_org_member(auth.uid(), p_organization_id) AND has_role(auth.uid(), 'admin'::app_role))
    OR is_platform_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO contracts (
    organization_id, contract_type, title, description, version,
    effective_date, expiration_date, auto_renews, renewal_term_days,
    file_path, created_by
  )
  VALUES (
    p_organization_id, p_contract_type, p_title, p_description, p_version,
    p_effective_date, p_expiration_date, p_auto_renews, p_renewal_term_days,
    p_file_path, auth.uid()
  )
  RETURNING id INTO v_contract_id;

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, organization_id, metadata)
  VALUES (
    'CONTRACT_CREATED',
    auth.uid(),
    p_organization_id,
    jsonb_build_object(
      'contract_id', v_contract_id,
      'contract_type', p_contract_type,
      'title', p_title
    )
  );

  RETURN v_contract_id;
END;
$$;

-- Function to sign a contract
CREATE OR REPLACE FUNCTION sign_contract(
  p_contract_id uuid,
  p_signed_by text,
  p_signer_email text DEFAULT NULL,
  p_signer_title text DEFAULT NULL,
  p_file_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_contract_type contract_type;
  v_has_expiration boolean;
BEGIN
  -- Get contract details
  SELECT organization_id, contract_type, expiration_date IS NOT NULL
  INTO v_org_id, v_contract_type, v_has_expiration
  FROM contracts WHERE id = p_contract_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  -- Verify access
  IF NOT (
    (is_org_member(auth.uid(), v_org_id) AND has_role(auth.uid(), 'admin'::app_role))
    OR is_platform_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update contract
  UPDATE contracts
  SET 
    status = CASE WHEN v_has_expiration THEN 'active' ELSE 'signed' END,
    signed_at = now(),
    signed_by = p_signed_by,
    signer_email = p_signer_email,
    signer_title = p_signer_title,
    file_path = COALESCE(p_file_path, file_path),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = p_contract_id;

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, organization_id, metadata)
  VALUES (
    'CONTRACT_SIGNED',
    auth.uid(),
    v_org_id,
    jsonb_build_object(
      'contract_id', p_contract_id,
      'contract_type', v_contract_type,
      'signed_by', p_signed_by
    )
  );
END;
$$;

-- Function to update contract status
CREATE OR REPLACE FUNCTION update_contract_status(
  p_contract_id uuid,
  p_status contract_status,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_old_status contract_status;
BEGIN
  -- Get contract details
  SELECT organization_id, status INTO v_org_id, v_old_status
  FROM contracts WHERE id = p_contract_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  -- Verify access
  IF NOT (
    (is_org_member(auth.uid(), v_org_id) AND has_role(auth.uid(), 'admin'::app_role))
    OR is_platform_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update contract
  UPDATE contracts
  SET 
    status = p_status,
    notes = COALESCE(p_notes, notes),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = p_contract_id;

  -- Log appropriate audit event
  INSERT INTO audit_events (action, actor_user_id, organization_id, metadata)
  VALUES (
    CASE 
      WHEN p_status = 'expired' THEN 'CONTRACT_EXPIRED'
      WHEN p_status = 'terminated' THEN 'CONTRACT_TERMINATED'
      ELSE 'CONTRACT_UPDATED'
    END,
    auth.uid(),
    v_org_id,
    jsonb_build_object(
      'contract_id', p_contract_id,
      'old_status', v_old_status,
      'new_status', p_status
    )
  );
END;
$$;

-- Function to check if org has active DPA
CREATE OR REPLACE FUNCTION has_active_dpa(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contracts
    WHERE organization_id = p_organization_id
    AND contract_type = 'dpa'
    AND status IN ('signed', 'active')
    AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
  );
END;
$$;

-- Function to check for active contracts blocking deletion
CREATE OR REPLACE FUNCTION get_blocking_contracts(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contracts jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', contract_type,
      'title', title,
      'status', status,
      'expiration_date', expiration_date
    )
  ) INTO v_contracts
  FROM contracts
  WHERE organization_id = p_organization_id
  AND status IN ('signed', 'active')
  AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE);

  RETURN COALESCE(v_contracts, '[]'::jsonb);
END;
$$;

-- Function to get contracts for an organization
CREATE OR REPLACE FUNCTION get_organization_contracts(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contracts jsonb;
BEGIN
  -- Verify access
  IF NOT (
    (is_org_member(auth.uid(), p_organization_id) AND has_role(auth.uid(), 'admin'::app_role))
    OR is_platform_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'contract_type', contract_type,
      'title', title,
      'description', description,
      'status', status,
      'version', version,
      'effective_date', effective_date,
      'expiration_date', expiration_date,
      'auto_renews', auto_renews,
      'renewal_term_days', renewal_term_days,
      'signed_at', signed_at,
      'signed_by', signed_by,
      'signer_email', signer_email,
      'file_path', file_path,
      'created_at', created_at,
      'days_until_expiration', 
        CASE 
          WHEN expiration_date IS NOT NULL AND status IN ('signed', 'active')
          THEN expiration_date - CURRENT_DATE
          ELSE NULL
        END
    ) ORDER BY created_at DESC
  ) INTO v_contracts
  FROM contracts
  WHERE organization_id = p_organization_id;

  RETURN COALESCE(v_contracts, '[]'::jsonb);
END;
$$;

-- Function to get expiring contracts for notifications
CREATE OR REPLACE FUNCTION get_expiring_contracts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only platform staff can access this
  IF NOT is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'organization_id', c.organization_id,
        'organization_name', o.name,
        'contract_type', c.contract_type,
        'title', c.title,
        'expiration_date', c.expiration_date,
        'days_until_expiration', c.expiration_date - CURRENT_DATE,
        'auto_renews', c.auto_renews
      )
    )
    FROM contracts c
    JOIN organizations o ON o.id = c.organization_id
    WHERE c.status IN ('signed', 'active')
    AND c.expiration_date IS NOT NULL
    AND c.expiration_date <= CURRENT_DATE + interval '90 days'
    ORDER BY c.expiration_date ASC
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_contract TO authenticated;
GRANT EXECUTE ON FUNCTION sign_contract TO authenticated;
GRANT EXECUTE ON FUNCTION update_contract_status TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_dpa TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocking_contracts TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_contracts TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_contracts TO authenticated;
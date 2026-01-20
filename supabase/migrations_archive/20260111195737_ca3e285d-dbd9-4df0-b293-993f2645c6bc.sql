-- Drop and recreate get_organization_contracts to include account and contact info
DROP FUNCTION IF EXISTS get_organization_contracts(uuid);

CREATE OR REPLACE FUNCTION get_organization_contracts(p_organization_id uuid)
RETURNS TABLE (
  id uuid,
  contract_type contract_type,
  title text,
  description text,
  status contract_status,
  version text,
  effective_date date,
  expiration_date date,
  auto_renews boolean,
  renewal_term_days integer,
  signed_at timestamptz,
  signed_by text,
  signer_email text,
  file_path text,
  created_at timestamptz,
  days_until_expiration integer,
  account_id uuid,
  account_name text,
  contact_id uuid,
  contact_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify access
  IF NOT (
    is_org_member(auth.uid(), p_organization_id)
    OR is_platform_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.contract_type,
    c.title,
    c.description,
    c.status,
    c.version,
    c.effective_date,
    c.expiration_date,
    c.auto_renews,
    c.renewal_term_days,
    c.signed_at,
    c.signed_by,
    c.signer_email,
    c.file_path,
    c.created_at,
    CASE 
      WHEN c.expiration_date IS NOT NULL 
      THEN (c.expiration_date - CURRENT_DATE)::integer
      ELSE NULL
    END as days_until_expiration,
    c.account_id,
    a.name as account_name,
    c.contact_id,
    CASE 
      WHEN ct.id IS NOT NULL 
      THEN ct.first_name || ' ' || ct.last_name
      ELSE NULL
    END as contact_name
  FROM contracts c
  LEFT JOIN accounts a ON a.id = c.account_id
  LEFT JOIN contacts ct ON ct.id = c.contact_id
  WHERE c.organization_id = p_organization_id
  ORDER BY c.created_at DESC;
END;
$$;
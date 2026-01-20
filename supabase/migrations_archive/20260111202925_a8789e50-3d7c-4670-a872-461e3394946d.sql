-- Add agreement category to distinguish between client and vendor agreements
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS agreement_category text NOT NULL DEFAULT 'client'
CHECK (agreement_category IN ('client', 'vendor'));

-- Add vendor_user_id for vendor agreements (links to users with vendor role)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS vendor_user_id uuid REFERENCES auth.users(id);

-- Create index for vendor_user_id
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_user_id ON public.contracts(vendor_user_id);

-- Drop and recreate the create_contract function with new parameters
DROP FUNCTION IF EXISTS public.create_contract(uuid, text, text, text, text, date, date, boolean, integer, integer, text, text, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_contract(
  p_organization_id uuid,
  p_contract_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_version text DEFAULT NULL,
  p_effective_date date DEFAULT NULL,
  p_expiration_date date DEFAULT NULL,
  p_auto_renews boolean DEFAULT false,
  p_renewal_notice_days integer DEFAULT NULL,
  p_renewal_term_days integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_file_path text DEFAULT NULL,
  p_agreement_category text DEFAULT 'client',
  p_account_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL,
  p_vendor_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
  v_user_id uuid;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate agreement_category
  IF p_agreement_category NOT IN ('client', 'vendor') THEN
    RAISE EXCEPTION 'Invalid agreement category. Must be client or vendor.';
  END IF;

  -- Validate that vendor agreements have vendor_user_id
  IF p_agreement_category = 'vendor' AND p_vendor_user_id IS NULL THEN
    RAISE EXCEPTION 'Vendor agreements must have a vendor_user_id.';
  END IF;

  -- Insert the contract
  INSERT INTO public.contracts (
    organization_id,
    contract_type,
    title,
    description,
    version,
    effective_date,
    expiration_date,
    auto_renews,
    renewal_notice_days,
    renewal_term_days,
    notes,
    file_path,
    agreement_category,
    account_id,
    contact_id,
    vendor_user_id,
    created_by,
    status
  ) VALUES (
    p_organization_id,
    p_contract_type::contract_type,
    p_title,
    p_description,
    p_version,
    p_effective_date,
    p_expiration_date,
    p_auto_renews,
    p_renewal_notice_days,
    p_renewal_term_days,
    p_notes,
    p_file_path,
    p_agreement_category,
    CASE WHEN p_agreement_category = 'client' THEN p_account_id ELSE NULL END,
    CASE WHEN p_agreement_category = 'client' THEN p_contact_id ELSE NULL END,
    CASE WHEN p_agreement_category = 'vendor' THEN p_vendor_user_id ELSE NULL END,
    v_user_id,
    'draft'::contract_status
  )
  RETURNING id INTO v_contract_id;

  RETURN v_contract_id;
END;
$$;

-- Drop and recreate the get_organization_contracts function
DROP FUNCTION IF EXISTS public.get_organization_contracts(uuid);

CREATE OR REPLACE FUNCTION public.get_organization_contracts(p_organization_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  contract_type text,
  title text,
  description text,
  version text,
  status text,
  effective_date date,
  expiration_date date,
  auto_renews boolean,
  renewal_notice_days integer,
  renewal_term_days integer,
  signed_at timestamptz,
  signed_by uuid,
  signer_title text,
  signer_email text,
  notes text,
  file_path text,
  created_at timestamptz,
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  supersedes_contract_id uuid,
  agreement_category text,
  account_id uuid,
  contact_id uuid,
  vendor_user_id uuid,
  account_name text,
  contact_name text,
  vendor_name text,
  vendor_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.organization_id,
    c.contract_type::text,
    c.title,
    c.description,
    c.version,
    c.status::text,
    c.effective_date,
    c.expiration_date,
    c.auto_renews,
    c.renewal_notice_days,
    c.renewal_term_days,
    c.signed_at,
    c.signed_by,
    c.signer_title,
    c.signer_email,
    c.notes,
    c.file_path,
    c.created_at,
    c.created_by,
    c.updated_at,
    c.updated_by,
    c.supersedes_contract_id,
    c.agreement_category,
    c.account_id,
    c.contact_id,
    c.vendor_user_id,
    a.name as account_name,
    CASE WHEN ct.id IS NOT NULL THEN ct.first_name || ' ' || ct.last_name ELSE NULL END as contact_name,
    p.full_name as vendor_name,
    p.email as vendor_email
  FROM public.contracts c
  LEFT JOIN public.accounts a ON c.account_id = a.id
  LEFT JOIN public.contacts ct ON c.contact_id = ct.id
  LEFT JOIN public.profiles p ON c.vendor_user_id = p.id
  WHERE c.organization_id = p_organization_id
  ORDER BY c.created_at DESC;
END;
$$;
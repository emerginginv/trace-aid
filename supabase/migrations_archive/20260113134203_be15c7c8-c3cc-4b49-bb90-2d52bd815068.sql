-- ============================================
-- PHASE 1: PRICING PROFILES & SERVICE PRICING RULES
-- Core Principles:
-- 1. Services define work, not pricing
-- 2. Pricing is client-specific (via pricing profiles)
-- 3. Activities execute services
-- 4. Budgets constrain work, not invoices
-- 5. Invoices summarize completed work only
-- ============================================

-- Create pricing_profiles table
-- Represents "How this customer is billed for services"
-- Examples: "Insurance SIU - Standard", "Law Firm - Hourly", "Corporate - Flat Fee"
CREATE TABLE public.pricing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(organization_id, name)
);

-- Add comment to explain purpose
COMMENT ON TABLE public.pricing_profiles IS 'Client-specific pricing configurations. Pricing is NOT on services - it is assigned per client/account.';

-- Enable RLS
ALTER TABLE public.pricing_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_profiles
CREATE POLICY "Org members can view pricing profiles"
  ON public.pricing_profiles FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins and managers can create pricing profiles"
  ON public.pricing_profiles FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can update pricing profiles"
  ON public.pricing_profiles FOR UPDATE
  USING (
    is_org_member(auth.uid(), organization_id) 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins can delete pricing profiles"
  ON public.pricing_profiles FOR DELETE
  USING (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin')
  );

-- Create service_pricing_rules table
-- Defines how each service is billed within a pricing profile
CREATE TABLE public.service_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_profile_id UUID NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  case_service_id UUID NOT NULL REFERENCES case_services(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('flat_fee', 'hourly', 'daily', 'per_activity', 'per_unit')),
  rate NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
  minimum_units NUMERIC(8,2) CHECK (minimum_units IS NULL OR minimum_units >= 0),
  maximum_units NUMERIC(8,2) CHECK (maximum_units IS NULL OR maximum_units >= 0),
  is_billable BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(pricing_profile_id, case_service_id)
);

-- Add comment to explain purpose
COMMENT ON TABLE public.service_pricing_rules IS 'Per-service pricing rules within a pricing profile. Example: Surveillance @ $95/hr with 4hr minimum.';

-- Enable RLS
ALTER TABLE public.service_pricing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_pricing_rules
CREATE POLICY "Org members can view service pricing rules"
  ON public.service_pricing_rules FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins and managers can create service pricing rules"
  ON public.service_pricing_rules FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can update service pricing rules"
  ON public.service_pricing_rules FOR UPDATE
  USING (
    is_org_member(auth.uid(), organization_id) 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins can delete service pricing rules"
  ON public.service_pricing_rules FOR DELETE
  USING (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin')
  );

-- Add pricing_profile_id to cases table
-- This links a case to its pricing configuration
ALTER TABLE public.cases 
ADD COLUMN pricing_profile_id UUID REFERENCES pricing_profiles(id);

COMMENT ON COLUMN public.cases.pricing_profile_id IS 'The pricing profile used for billing this case. Allows same service, different client = different pricing.';

-- Add default_pricing_profile_id to accounts table
-- This allows setting a default pricing profile per client/account
ALTER TABLE public.accounts
ADD COLUMN default_pricing_profile_id UUID REFERENCES pricing_profiles(id);

COMMENT ON COLUMN public.accounts.default_pricing_profile_id IS 'Default pricing profile for cases created under this account.';

-- Create function to auto-assign pricing profile from account on case creation
CREATE OR REPLACE FUNCTION public.auto_assign_pricing_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If no pricing profile specified but account has a default, use it
  IF NEW.pricing_profile_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT default_pricing_profile_id INTO NEW.pricing_profile_id
    FROM accounts
    WHERE id = NEW.account_id;
  END IF;
  
  -- If still no pricing profile, use org default
  IF NEW.pricing_profile_id IS NULL AND NEW.organization_id IS NOT NULL THEN
    SELECT id INTO NEW.pricing_profile_id
    FROM pricing_profiles
    WHERE organization_id = NEW.organization_id 
      AND is_default = true 
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-assignment
CREATE TRIGGER tr_auto_assign_pricing_profile
  BEFORE INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_pricing_profile();

-- Create function to ensure only one default pricing profile per org
CREATE OR REPLACE FUNCTION public.ensure_single_default_pricing_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset any other defaults for this org
    UPDATE pricing_profiles
    SET is_default = false, updated_at = now()
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for single default
CREATE TRIGGER tr_ensure_single_default_pricing_profile
  BEFORE INSERT OR UPDATE ON public.pricing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_pricing_profile();

-- Create updated_at trigger for pricing_profiles
CREATE TRIGGER update_pricing_profiles_updated_at
  BEFORE UPDATE ON public.pricing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for service_pricing_rules
CREATE TRIGGER update_service_pricing_rules_updated_at
  BEFORE UPDATE ON public.service_pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_pricing_profiles_organization ON public.pricing_profiles(organization_id);
CREATE INDEX idx_pricing_profiles_is_default ON public.pricing_profiles(organization_id, is_default) WHERE is_default = true;
CREATE INDEX idx_service_pricing_rules_profile ON public.service_pricing_rules(pricing_profile_id);
CREATE INDEX idx_service_pricing_rules_service ON public.service_pricing_rules(case_service_id);
CREATE INDEX idx_cases_pricing_profile ON public.cases(pricing_profile_id);
CREATE INDEX idx_accounts_default_pricing_profile ON public.accounts(default_pricing_profile_id);
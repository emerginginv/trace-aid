-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stripe_customer_id TEXT UNIQUE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'standard', 'pro')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),
  max_users INTEGER DEFAULT 2,
  billing_email TEXT
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization_members table (replaces the need for direct org ownership)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create organization_invites table
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Enable RLS on organization_invites
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Add organization_id to existing tables
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.case_activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.case_attachments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.case_finances ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.case_subjects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.case_updates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.case_update_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invoice_payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.retainer_funds ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.subject_attachments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.picklists ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.organization_settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

-- Create function to check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = _user_id 
      AND organization_id = _org_id
  )
$$;

-- Create function to handle new user - create default organization
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create a new organization for the user
  INSERT INTO public.organizations (name, billing_email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Organization'),
    NEW.email
  )
  RETURNING id INTO new_org_id;
  
  -- Add user as admin member of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');
  
  -- Add admin role to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create organization on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (
    public.is_org_member(auth.uid(), id) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for organization_members
CREATE POLICY "Users can view members of their organization"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage organization members"
  ON public.organization_members FOR ALL
  USING (
    public.is_org_member(auth.uid(), organization_id) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for organization_invites
CREATE POLICY "Users can view invites for their organization"
  ON public.organization_invites FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage organization invites"
  ON public.organization_invites FOR ALL
  USING (
    public.is_org_member(auth.uid(), organization_id) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Update RLS policies for all existing tables to scope by organization
-- Accounts
DROP POLICY IF EXISTS "Admins can view all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can manage own accounts" ON public.accounts;
CREATE POLICY "Users can view accounts in their organization"
  ON public.accounts FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins can manage accounts in their organization"
  ON public.accounts FOR ALL
  USING (
    public.is_org_member(auth.uid(), organization_id) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Cases
DROP POLICY IF EXISTS "Admins can view all cases" ON public.cases;
DROP POLICY IF EXISTS "Users can manage own cases" ON public.cases;
CREATE POLICY "Users can view cases in their organization"
  ON public.cases FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage cases in their organization"
  ON public.cases FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Contacts
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
CREATE POLICY "Users can view contacts in their organization"
  ON public.contacts FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins can manage contacts in their organization"
  ON public.contacts FOR ALL
  USING (
    public.is_org_member(auth.uid(), organization_id) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Case Activities
DROP POLICY IF EXISTS "Admins can view all case activities" ON public.case_activities;
DROP POLICY IF EXISTS "Users can manage own case activities" ON public.case_activities;
CREATE POLICY "Users can view case activities in their organization"
  ON public.case_activities FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage case activities in their organization"
  ON public.case_activities FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Case Attachments
DROP POLICY IF EXISTS "Admins can view all case attachments" ON public.case_attachments;
DROP POLICY IF EXISTS "Users can manage own case attachments" ON public.case_attachments;
CREATE POLICY "Users can view case attachments in their organization"
  ON public.case_attachments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage case attachments in their organization"
  ON public.case_attachments FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Case Finances
DROP POLICY IF EXISTS "Admins can view all case finances" ON public.case_finances;
DROP POLICY IF EXISTS "Users can manage own case finances" ON public.case_finances;
CREATE POLICY "Users can view case finances in their organization"
  ON public.case_finances FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage case finances in their organization"
  ON public.case_finances FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Case Subjects
DROP POLICY IF EXISTS "Admins can view all case subjects" ON public.case_subjects;
DROP POLICY IF EXISTS "Users can manage own case subjects" ON public.case_subjects;
CREATE POLICY "Users can view case subjects in their organization"
  ON public.case_subjects FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage case subjects in their organization"
  ON public.case_subjects FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Case Updates
DROP POLICY IF EXISTS "Admins can view all case updates" ON public.case_updates;
DROP POLICY IF EXISTS "Users can manage own case updates" ON public.case_updates;
CREATE POLICY "Users can view case updates in their organization"
  ON public.case_updates FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage case updates in their organization"
  ON public.case_updates FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Case Update Templates
DROP POLICY IF EXISTS "Admins can view all templates" ON public.case_update_templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON public.case_update_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.case_update_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.case_update_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.case_update_templates;
CREATE POLICY "Users can view templates in their organization"
  ON public.case_update_templates FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage templates in their organization"
  ON public.case_update_templates FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Invoices
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;
CREATE POLICY "Users can view invoices in their organization"
  ON public.invoices FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage invoices in their organization"
  ON public.invoices FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Invoice Payments
DROP POLICY IF EXISTS "Admins can view all invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can manage own invoice payments" ON public.invoice_payments;
CREATE POLICY "Users can view invoice payments in their organization"
  ON public.invoice_payments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage invoice payments in their organization"
  ON public.invoice_payments FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Retainer Funds
DROP POLICY IF EXISTS "Admins can view all retainer funds" ON public.retainer_funds;
DROP POLICY IF EXISTS "Users can manage own retainer funds" ON public.retainer_funds;
CREATE POLICY "Users can view retainer funds in their organization"
  ON public.retainer_funds FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage retainer funds in their organization"
  ON public.retainer_funds FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Subject Attachments
DROP POLICY IF EXISTS "Admins can view all subject attachments" ON public.subject_attachments;
DROP POLICY IF EXISTS "Users can manage own subject attachments" ON public.subject_attachments;
CREATE POLICY "Users can view subject attachments in their organization"
  ON public.subject_attachments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can manage subject attachments in their organization"
  ON public.subject_attachments FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Picklists
DROP POLICY IF EXISTS "Admins can view all picklists" ON public.picklists;
DROP POLICY IF EXISTS "Users can manage own picklists" ON public.picklists;
CREATE POLICY "Users can view picklists in their organization"
  ON public.picklists FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins can manage picklists in their organization"
  ON public.picklists FOR ALL
  USING (
    public.is_org_member(auth.uid(), organization_id) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Organization Settings
DROP POLICY IF EXISTS "Users can view own organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can insert own organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can update own organization settings" ON public.organization_settings;
CREATE POLICY "Users can view organization settings in their organization"
  ON public.organization_settings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins can manage organization settings in their organization"
  ON public.organization_settings FOR ALL
  USING (
    public.is_org_member(auth.uid(), organization_id) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Create updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
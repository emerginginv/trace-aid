-- Create rate_type enum
DO $$ BEGIN
  CREATE TYPE finance_item_rate_type AS ENUM ('hourly', 'fixed', 'variable');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create finance_items table
CREATE TABLE public.finance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_expense_item BOOLEAN NOT NULL DEFAULT true,
  is_invoice_item BOOLEAN NOT NULL DEFAULT true,
  rate_type finance_item_rate_type DEFAULT 'hourly',
  default_expense_rate NUMERIC(10,2),
  default_invoice_rate NUMERIC(10,2),
  default_tax_rate_id UUID REFERENCES public.tax_rates(id) ON DELETE SET NULL,
  invoice_as_flat_rate BOOLEAN DEFAULT false,
  classification_code TEXT,
  reference_id TEXT,
  item_code_id UUID,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT finance_items_at_least_one_type CHECK (is_expense_item = true OR is_invoice_item = true)
);

-- Add indexes
CREATE INDEX idx_finance_items_org_id ON public.finance_items(organization_id);
CREATE INDEX idx_finance_items_active ON public.finance_items(organization_id, is_active);
CREATE INDEX idx_finance_items_expense ON public.finance_items(organization_id, is_expense_item) WHERE is_expense_item = true;
CREATE INDEX idx_finance_items_invoice ON public.finance_items(organization_id, is_invoice_item) WHERE is_invoice_item = true;

-- Enable RLS
ALTER TABLE public.finance_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view finance items in their organization"
ON public.finance_items FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and managers can insert finance items"
ON public.finance_items FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update finance items"
ON public.finance_items FOR UPDATE
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete finance items"
ON public.finance_items FOR DELETE
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.role = 'admin'
  )
);

-- Add finance_item_id to time_entries
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS finance_item_id UUID REFERENCES public.finance_items(id) ON DELETE SET NULL;

-- Add finance_item_id to expense_entries
ALTER TABLE public.expense_entries ADD COLUMN IF NOT EXISTS finance_item_id UUID REFERENCES public.finance_items(id) ON DELETE SET NULL;

-- Create updated_at trigger
CREATE TRIGGER update_finance_items_updated_at
BEFORE UPDATE ON public.finance_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
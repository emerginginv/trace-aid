-- ============================================
-- FINANCIAL ARCHITECTURE: Integration Readiness
-- ============================================

-- 1. Add integration readiness fields to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sync_error TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS posting_date DATE;

-- Add check constraint for sync_status
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_sync_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_sync_status_check 
  CHECK (sync_status IN ('pending', 'synced', 'failed', 'not_applicable'));

-- Update invoice status constraint to include all existing + new statuses
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'finalized', 'exported', 'voided'));

-- 2. Add integration readiness fields to invoice_payments
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'applied';
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Add check constraints
ALTER TABLE invoice_payments DROP CONSTRAINT IF EXISTS invoice_payments_payment_method_check;
ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_payment_method_check 
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'check', 'credit_card', 'bank_transfer', 'ach', 'wire', 'other'));

ALTER TABLE invoice_payments DROP CONSTRAINT IF EXISTS invoice_payments_sync_status_check;
ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_sync_status_check 
  CHECK (sync_status IN ('pending', 'synced', 'failed', 'not_applicable'));

ALTER TABLE invoice_payments DROP CONSTRAINT IF EXISTS invoice_payments_payment_status_check;
ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_payment_status_check 
  CHECK (payment_status IN ('pending', 'applied', 'reversed'));

-- Create unique index for idempotency_key (allows nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payments_idempotency_key 
  ON invoice_payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. Add tax fields to invoice_line_items
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS tax_code TEXT;
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS gl_account_code TEXT;

-- 4. Create tax_rates placeholder table
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Enable RLS on tax_rates
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tax rates in their organization" ON tax_rates;
CREATE POLICY "Users can view tax rates in their organization"
  ON tax_rates FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Managers can manage tax rates" ON tax_rates;
CREATE POLICY "Managers can manage tax rates"
  ON tax_rates FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- 5. Create credit_memos table for credits and adjustments
CREATE TABLE IF NOT EXISTS credit_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  original_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  applied_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  credit_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'applied', 'voided')),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  external_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'not_applicable')),
  synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on credit_memos
ALTER TABLE credit_memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view credit memos in their organization" ON credit_memos;
CREATE POLICY "Users can view credit memos in their organization"
  ON credit_memos FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Managers can manage credit memos" ON credit_memos;
CREATE POLICY "Managers can manage credit memos"
  ON credit_memos FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- 6. Create write_offs table for explicit write-off tracking
CREATE TABLE IF NOT EXISTS write_offs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  billing_item_id UUID REFERENCES case_finances(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  reason_code TEXT NOT NULL CHECK (reason_code IN ('uncollectible', 'dispute', 'goodwill', 'error', 'other')),
  reason_detail TEXT,
  written_off_by UUID REFERENCES profiles(id),
  written_off_at TIMESTAMPTZ DEFAULT now(),
  external_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'not_applicable')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on write_offs
ALTER TABLE write_offs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view write-offs in their organization" ON write_offs;
CREATE POLICY "Users can view write-offs in their organization"
  ON write_offs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Managers can manage write-offs" ON write_offs;
CREATE POLICY "Managers can manage write-offs"
  ON write_offs FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- 7. Create function to prevent modification of exported invoices
CREATE OR REPLACE FUNCTION prevent_exported_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow status changes to 'paid' even after export
  IF OLD.exported_at IS NOT NULL THEN
    -- Allow marking as paid after export
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
      RETURN NEW;
    END IF;
    
    -- Check if any financial fields changed
    IF OLD.subtotal IS DISTINCT FROM NEW.subtotal 
       OR OLD.total IS DISTINCT FROM NEW.total 
       OR OLD.tax_amount IS DISTINCT FROM NEW.tax_amount
       OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount THEN
      RAISE EXCEPTION 'Cannot modify financial data on an exported invoice. Void and recreate if needed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for exported invoice protection
DROP TRIGGER IF EXISTS tr_prevent_exported_invoice_mod ON invoices;
CREATE TRIGGER tr_prevent_exported_invoice_mod
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_exported_invoice_modification();

-- 8. Add indexes for integration queries
CREATE INDEX IF NOT EXISTS idx_invoices_sync_status ON invoices(sync_status) WHERE sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_invoices_external_id ON invoices(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_payments_sync_status ON invoice_payments(sync_status) WHERE sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_credit_memos_sync_status ON credit_memos(sync_status) WHERE sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_write_offs_sync_status ON write_offs(sync_status) WHERE sync_status != 'synced';

-- 9. Update timestamp triggers for new tables
DROP TRIGGER IF EXISTS update_tax_rates_updated_at ON tax_rates;
CREATE TRIGGER update_tax_rates_updated_at
  BEFORE UPDATE ON tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_memos_updated_at ON credit_memos;
CREATE TRIGGER update_credit_memos_updated_at
  BEFORE UPDATE ON credit_memos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
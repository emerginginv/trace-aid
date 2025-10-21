-- First, delete any existing invoice_payments records that don't have matching invoices
DELETE FROM invoice_payments 
WHERE invoice_id NOT IN (SELECT id FROM invoices);

-- Drop the old foreign key constraint
ALTER TABLE invoice_payments DROP CONSTRAINT IF EXISTS invoice_payments_invoice_id_fkey;

-- Add the correct foreign key constraint pointing to invoices table
ALTER TABLE invoice_payments 
ADD CONSTRAINT invoice_payments_invoice_id_fkey 
FOREIGN KEY (invoice_id) 
REFERENCES invoices(id) 
ON DELETE CASCADE;
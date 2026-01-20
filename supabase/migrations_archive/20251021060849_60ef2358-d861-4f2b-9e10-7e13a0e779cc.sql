-- First, delete any existing retainer_funds records that reference non-existent invoices
DELETE FROM retainer_funds 
WHERE invoice_id IS NOT NULL 
AND invoice_id NOT IN (SELECT id FROM invoices);

-- Drop the old foreign key constraint
ALTER TABLE retainer_funds DROP CONSTRAINT IF EXISTS retainer_funds_invoice_id_fkey;

-- Add the correct foreign key constraint pointing to invoices table
ALTER TABLE retainer_funds 
ADD CONSTRAINT retainer_funds_invoice_id_fkey 
FOREIGN KEY (invoice_id) 
REFERENCES invoices(id) 
ON DELETE SET NULL;
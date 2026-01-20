-- Add unit_price column to case_finances table
ALTER TABLE case_finances 
ADD COLUMN IF NOT EXISTS unit_price numeric;

COMMENT ON COLUMN case_finances.unit_price IS 'Price per unit for expense calculations';

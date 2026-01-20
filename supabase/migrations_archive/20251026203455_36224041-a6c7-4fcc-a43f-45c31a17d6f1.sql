-- Add quantity field to case_finances table for tracking units, hours, mileage, etc.
ALTER TABLE case_finances 
ADD COLUMN quantity numeric(10,2) NULL;

COMMENT ON COLUMN case_finances.quantity IS 'Quantity of units, hours, mileage, or items for the expense';
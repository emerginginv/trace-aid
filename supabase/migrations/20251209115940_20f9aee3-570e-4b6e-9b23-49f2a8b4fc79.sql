-- Fix the balance_due generated column formula
-- The current formula double-counts retainer because retainer is already included in total_paid
-- Old formula: total - retainer_applied - total_paid (wrong - subtracts retainer twice)
-- New formula: total - total_paid (correct - retainer is already in total_paid)

ALTER TABLE invoices DROP COLUMN balance_due;

ALTER TABLE invoices ADD COLUMN balance_due numeric GENERATED ALWAYS AS (
  total - COALESCE(total_paid, 0)
) STORED;
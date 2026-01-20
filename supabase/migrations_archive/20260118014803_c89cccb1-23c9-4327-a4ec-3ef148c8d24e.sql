-- Backfill status_key for existing cases based on legacy status column
UPDATE cases
SET status_key = CASE 
  WHEN LOWER(status) IN ('new', 'draft') THEN 'new'
  WHEN LOWER(status) = 'assigned' THEN 'assigned'
  WHEN LOWER(status) = 'active' THEN 'active'
  WHEN LOWER(status) IN ('on hold', 'pending', 'on_hold') THEN 'on_hold'
  WHEN LOWER(status) = 'completed' THEN 'completed'
  WHEN LOWER(status) = 'closed' THEN 'closed'
  WHEN LOWER(status) IN ('cancelled', 'canceled') THEN 'cancelled'
  ELSE 'new'
END
WHERE status_key IS NULL;
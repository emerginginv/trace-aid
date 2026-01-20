-- =====================================================
-- DATA MIGRATION: Seed categories and migrate statuses
-- =====================================================

-- Step 1: Seed case_status_categories for each organization
-- Insert "New" category
INSERT INTO case_status_categories (organization_id, name, description, sort_order, color)
SELECT DISTINCT 
  organization_id,
  'New',
  'Newly received cases that require review before they are opened',
  0,
  '#8b5cf6'
FROM case_lifecycle_statuses
WHERE organization_id IS NOT NULL
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert "Open" category
INSERT INTO case_status_categories (organization_id, name, description, sort_order, color)
SELECT DISTINCT 
  organization_id,
  'Open',
  'Cases actively being worked, deliverables still outstanding',
  1,
  '#22c55e'
FROM case_lifecycle_statuses
WHERE organization_id IS NOT NULL
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert "Complete" category
INSERT INTO case_status_categories (organization_id, name, description, sort_order, color)
SELECT DISTINCT 
  organization_id,
  'Complete',
  'All investigative work complete and delivered, but back office work may be required',
  2,
  '#14b8a6'
FROM case_lifecycle_statuses
WHERE organization_id IS NOT NULL
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert "Closed" category
INSERT INTO case_status_categories (organization_id, name, description, sort_order, color)
SELECT DISTINCT 
  organization_id,
  'Closed',
  'Case is closed and no additional work is required',
  3,
  '#64748b'
FROM case_lifecycle_statuses
WHERE organization_id IS NOT NULL
ON CONFLICT (organization_id, name) DO NOTHING;

-- Step 2: Migrate statuses from case_lifecycle_statuses to case_statuses
-- Map phases and status_types to categories
INSERT INTO case_statuses (
  organization_id, category_id, name, color, notes, rank_order,
  monitor_due_date, is_active, is_reopenable, is_read_only, 
  is_first_status, workflows
)
SELECT 
  cls.organization_id,
  csc.id as category_id,
  cls.display_name as name,
  COALESCE(cls.color, '#6366f1') as color,
  cls.description as notes,
  cls.phase_order as rank_order,
  true as monitor_due_date,
  COALESCE(cls.is_active, true) as is_active,
  CASE WHEN cls.status_key IN ('closed', 'cancelled') THEN false ELSE true END as is_reopenable,
  CASE WHEN cls.status_key IN ('closed', 'cancelled', 'completed') THEN true ELSE false END as is_read_only,
  CASE WHEN cls.phase_order = 0 AND cls.phase = 'execution' THEN true ELSE false END as is_first_status,
  ARRAY['standard'] as workflows
FROM case_lifecycle_statuses cls
JOIN case_status_categories csc 
  ON csc.organization_id = cls.organization_id
  AND csc.name = CASE 
    WHEN cls.phase = 'intake' THEN 'New'
    WHEN cls.status_key = 'completed' THEN 'Complete'
    WHEN cls.status_key IN ('closed', 'cancelled') THEN 'Closed'
    ELSE 'Open'
  END
ON CONFLICT (organization_id, name) DO NOTHING;

-- Step 3: Update cases to use new status IDs
-- Match by status_key first (more reliable), then by status display name
UPDATE cases c
SET 
  current_status_id = cs.id,
  current_category_id = cs.category_id,
  status_entered_at = COALESCE(c.updated_at, c.created_at),
  category_entered_at = COALESCE(c.updated_at, c.created_at)
FROM case_statuses cs
JOIN case_lifecycle_statuses cls ON cls.organization_id = cs.organization_id 
  AND cls.display_name = cs.name
WHERE cls.organization_id = c.organization_id
  AND (
    LOWER(cls.status_key) = LOWER(c.status_key)
    OR LOWER(cls.display_name) = LOWER(c.status)
  )
  AND c.current_status_id IS NULL;

-- Step 4: Ensure at least one status is marked as first_status per organization
-- If no first_status exists, mark the lowest rank_order status in "Open" category
UPDATE case_statuses cs
SET is_first_status = true
WHERE cs.id IN (
  SELECT DISTINCT ON (cs2.organization_id) cs2.id
  FROM case_statuses cs2
  JOIN case_status_categories csc ON csc.id = cs2.category_id
  WHERE csc.name = 'Open'
    AND cs2.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM case_statuses cs3 
      WHERE cs3.organization_id = cs2.organization_id 
      AND cs3.is_first_status = true
    )
  ORDER BY cs2.organization_id, cs2.rank_order ASC
);
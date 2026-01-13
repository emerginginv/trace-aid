-- Insert event_type items into case_type (skip duplicates)
INSERT INTO picklists (user_id, organization_id, type, value, color, display_order, is_active)
SELECT user_id, organization_id, 'case_type', value, color, 
       (SELECT COALESCE(MAX(display_order), 0) FROM picklists p2 
        WHERE p2.organization_id = picklists.organization_id AND p2.type = 'case_type') + display_order + 1,
       is_active
FROM picklists
WHERE type = 'event_type'
  AND NOT EXISTS (
    SELECT 1 FROM picklists p2 
    WHERE p2.organization_id = picklists.organization_id 
      AND p2.type = 'case_type' 
      AND p2.value = picklists.value
  );

-- Delete event_type picklist items after migration
DELETE FROM picklists WHERE type = 'event_type';
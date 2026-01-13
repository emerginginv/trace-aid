-- Fix: Convert SECURITY DEFINER view to regular view with RLS
DROP VIEW IF EXISTS public.case_enforcement_summary;

-- Recreate as a regular view (inherits caller's permissions)
CREATE VIEW public.case_enforcement_summary AS
SELECT 
  ea.case_id,
  ea.organization_id,
  COUNT(*) FILTER (WHERE ea.was_blocked = true) as blocked_actions_count,
  COUNT(*) FILTER (WHERE ea.was_blocked = false) as allowed_actions_count,
  COUNT(*) FILTER (WHERE ea.enforcement_type = 'budget') as budget_enforcements,
  COUNT(*) FILTER (WHERE ea.enforcement_type = 'tier') as tier_enforcements,
  COUNT(*) FILTER (WHERE ea.enforcement_type = 'pricing') as pricing_enforcements,
  COUNT(*) FILTER (WHERE ea.enforcement_type = 'lock') as lock_enforcements,
  MAX(ea.created_at) as last_enforcement_at
FROM enforcement_actions ea
GROUP BY ea.case_id, ea.organization_id;
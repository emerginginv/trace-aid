-- RLS Policies for picklists table
-- Allows organization members to view and manage picklists within their organization

-- Enable RLS (already enabled but good to be explicit in new migration)
ALTER TABLE public.picklists ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Users can view picklists in their organization" ON public.picklists
  FOR SELECT USING (
    organization_id IS NULL OR is_org_member(auth.uid(), organization_id)
  );

-- Insert policy
CREATE POLICY "Admins/Managers can manage picklists in their organization" ON public.picklists
  FOR ALL USING (
    is_org_member(auth.uid(), organization_id) AND (
      EXISTS (
        SELECT 1 FROM organization_members 
        WHERE user_id = auth.uid() 
        AND organization_id = picklists.organization_id 
        AND (role = 'admin' OR role = 'owner' OR role = 'manager')
      )
    )
  );

-- Function to validate status migration (Placeholder if not implemented)
-- This is called by useStatusMigration hook
CREATE OR REPLACE FUNCTION public.validate_status_migration(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_cases', (SELECT count(*) FROM cases WHERE organization_id = p_organization_id),
        'cases_with_status_id', 0,
        'cases_without_status_id', (SELECT count(*) FROM cases WHERE organization_id = p_organization_id),
        'total_history_entries', (SELECT count(*) FROM case_status_history WHERE organization_id = p_organization_id),
        'history_with_status_id', 0,
        'history_without_status_id', (SELECT count(*) FROM case_status_history WHERE organization_id = p_organization_id),
        'history_with_duration', (SELECT count(*) FROM case_status_history WHERE organization_id = p_organization_id AND duration_seconds IS NOT NULL),
        'category_transitions', (SELECT count(*) FROM case_category_transition_log WHERE organization_id = p_organization_id),
        'total_categories', (SELECT count(*) FROM case_status_categories WHERE organization_id = p_organization_id),
        'total_statuses', (SELECT count(*) FROM case_statuses WHERE organization_id = p_organization_id)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Placeholder for migrate_case_status_data
CREATE OR REPLACE FUNCTION public.migrate_case_status_data(p_organization_id uuid, p_user_id uuid, p_dry_run boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'success', true,
        'dry_run', p_dry_run,
        'updated', 0,
        'skipped', 0,
        'errors', 0
    );
END;
$$;

-- Placeholder for fix_status_history_timestamps
CREATE OR REPLACE FUNCTION public.fix_status_history_timestamps(p_organization_id uuid, p_user_id uuid, p_dry_run boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'success', true,
        'dry_run', p_dry_run,
        'entries_fixed', 0
    );
END;
$$;

-- Placeholder for sync_case_category_transitions
CREATE OR REPLACE FUNCTION public.sync_case_category_transitions(p_organization_id uuid, p_override_existing boolean, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'success', true
    );
END;
$$;

-- Placeholder for toggle_legacy_status_lock
CREATE OR REPLACE FUNCTION public.toggle_legacy_status_lock(p_enable boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN true;
END;
$$;

-- Placeholder for rollback_status_migration
CREATE OR REPLACE FUNCTION public.rollback_status_migration(p_log_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN true;
END;
$$;

-- Create missing table for logs if it doesn't exist
CREATE TABLE IF NOT EXISTS public.case_status_migration_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    migration_step text NOT NULL,
    records_affected integer DEFAULT 0,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    status text DEFAULT 'completed',
    details jsonb DEFAULT '{}'::jsonb,
    executed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.case_status_migration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs in their organization" ON public.case_status_migration_log
    FOR SELECT USING (is_org_member(auth.uid(), organization_id));

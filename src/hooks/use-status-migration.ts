import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface MigrationValidation {
  total_cases: number;
  cases_with_status_id: number;
  cases_without_status_id: number;
  total_history_entries: number;
  history_with_status_id: number;
  history_without_status_id: number;
  history_with_duration: number;
  category_transitions: number;
  total_categories: number;
  total_statuses: number;
}

export interface MigrationResult {
  success: boolean;
  dry_run: boolean;
  log_id?: string;
  updated?: number;
  skipped?: number;
  errors?: number;
  error_details?: Array<{
    history_id: string;
    to_status: string;
    error: string;
  }>;
  cases_processed?: number;
  entries_fixed?: number;
}

export interface MigrationLog {
  id: string;
  organization_id: string;
  migration_step: string;
  records_affected: number;
  started_at: string;
  completed_at: string | null;
  status: string;
  details: Record<string, unknown>;
  executed_by: string | null;
}

export function useStatusMigration() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch current validation state
  const validationQuery = useQuery({
    queryKey: ["status-migration-validation", organization?.id],
    queryFn: async (): Promise<MigrationValidation> => {
      if (!organization?.id) throw new Error("No organization");
      
      const { data, error } = await supabase.rpc("validate_status_migration", {
        p_organization_id: organization.id,
      });
      
      if (error) throw error;
      return data as unknown as MigrationValidation;
    },
    enabled: !!organization?.id,
  });

  // Fetch migration logs
  const logsQuery = useQuery({
    queryKey: ["status-migration-logs", organization?.id],
    queryFn: async (): Promise<MigrationLog[]> => {
      if (!organization?.id) throw new Error("No organization");
      
      const { data, error } = await supabase
        .from("case_status_migration_log")
        .select("*")
        .eq("organization_id", organization.id)
        .order("started_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as MigrationLog[];
    },
    enabled: !!organization?.id,
  });

  // Backfill status history mutation
  const backfillMutation = useMutation({
    mutationFn: async ({ dryRun }: { dryRun: boolean }): Promise<MigrationResult> => {
      if (!organization?.id) throw new Error("No organization");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc("migrate_case_status_data", {
        p_organization_id: organization.id,
        p_user_id: user?.id || null,
        p_dry_run: dryRun,
      });
      
      if (error) throw error;
      return data as unknown as MigrationResult;
    },
    onSuccess: (result) => {
      if (!result.dry_run) {
        queryClient.invalidateQueries({ queryKey: ["status-migration-validation"] });
        queryClient.invalidateQueries({ queryKey: ["status-migration-logs"] });
        queryClient.invalidateQueries({ queryKey: ["case-status-history"] });
        toast.success(`Backfilled ${result.updated} history entries`);
      }
    },
    onError: (error) => {
      toast.error(`Backfill failed: ${error.message}`);
    },
  });

  // Fix timestamps mutation
  const fixTimestampsMutation = useMutation({
    mutationFn: async ({ dryRun }: { dryRun: boolean }): Promise<MigrationResult> => {
      if (!organization?.id) throw new Error("No organization");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc("fix_status_history_timestamps", {
        p_organization_id: organization.id,
        p_user_id: user?.id || null,
        p_dry_run: dryRun,
      });
      
      if (error) throw error;
      return data as unknown as MigrationResult;
    },
    onSuccess: (result) => {
      if (!result.dry_run) {
        queryClient.invalidateQueries({ queryKey: ["status-migration-validation"] });
        queryClient.invalidateQueries({ queryKey: ["status-migration-logs"] });
        queryClient.invalidateQueries({ queryKey: ["case-status-history"] });
        toast.success(`Fixed timestamps for ${result.entries_fixed} entries`);
      }
    },
    onError: (error) => {
      toast.error(`Timestamp fix failed: ${error.message}`);
    },
  });

  // Sync category transitions (uses existing function)
  const syncTransitionsMutation = useMutation({
    mutationFn: async (): Promise<MigrationResult> => {
      if (!organization?.id) throw new Error("No organization");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc("sync_case_category_transitions", {
        p_organization_id: organization.id,
        p_override_existing: true,
        p_user_id: user?.id || null,
      });
      
      if (error) throw error;
      return data as unknown as MigrationResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["status-migration-validation"] });
      queryClient.invalidateQueries({ queryKey: ["status-migration-logs"] });
      queryClient.invalidateQueries({ queryKey: ["case-category-transitions"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Category transitions synced successfully");
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Toggle legacy lock mutation
  const toggleLockMutation = useMutation({
    mutationFn: async ({ enable }: { enable: boolean }) => {
      const { data, error } = await supabase.rpc("toggle_legacy_status_lock", {
        p_enable: enable,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Legacy status fields ${variables.enable ? 'locked' : 'unlocked'}`);
    },
    onError: (error) => {
      toast.error(`Toggle lock failed: ${error.message}`);
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async ({ logId }: { logId: string }) => {
      const { data, error } = await supabase.rpc("rollback_status_migration", {
        p_log_id: logId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["status-migration-validation"] });
      queryClient.invalidateQueries({ queryKey: ["status-migration-logs"] });
      queryClient.invalidateQueries({ queryKey: ["case-status-history"] });
      toast.success("Migration step rolled back");
    },
    onError: (error) => {
      toast.error(`Rollback failed: ${error.message}`);
    },
  });

  return {
    // Queries
    validation: validationQuery.data,
    isLoadingValidation: validationQuery.isLoading,
    logs: logsQuery.data || [],
    isLoadingLogs: logsQuery.isLoading,
    
    // Mutations
    backfill: backfillMutation.mutateAsync,
    isBackfilling: backfillMutation.isPending,
    backfillResult: backfillMutation.data,
    
    fixTimestamps: fixTimestampsMutation.mutateAsync,
    isFixingTimestamps: fixTimestampsMutation.isPending,
    fixTimestampsResult: fixTimestampsMutation.data,
    
    syncTransitions: syncTransitionsMutation.mutateAsync,
    isSyncingTransitions: syncTransitionsMutation.isPending,
    
    toggleLock: toggleLockMutation.mutateAsync,
    isTogglingLock: toggleLockMutation.isPending,
    
    rollback: rollbackMutation.mutateAsync,
    isRollingBack: rollbackMutation.isPending,
    
    // Helpers
    refetchValidation: validationQuery.refetch,
    refetchLogs: logsQuery.refetch,
  };
}

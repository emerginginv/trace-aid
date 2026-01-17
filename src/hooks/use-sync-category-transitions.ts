import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  cases_processed: number;
  transitions_created: number;
  transitions_deleted: number;
  override_mode: boolean;
}

export function useSyncCategoryTransitions() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async ({ overrideExisting }: { overrideExisting: boolean }): Promise<SyncResult> => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('sync_case_category_transitions', {
        p_organization_id: organization?.id,
        p_override_existing: overrideExisting,
        p_user_id: userData.user?.id
      });
      
      if (error) throw error;
      return data as unknown as SyncResult;
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['case-status-history'] });
      queryClient.invalidateQueries({ queryKey: ['case-category-transitions'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      
      toast.success(`Sync complete: ${result.transitions_created} transitions created`);
    },
    onError: (error) => {
      console.error('Sync failed:', error);
      toast.error('Failed to sync category transitions');
    }
  });

  return {
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    isLoading: syncMutation.isPending,
    result: syncMutation.data,
    error: syncMutation.error,
    reset: syncMutation.reset
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  CaseStatusHistoryEntry, 
  formatDuration, 
  formatDurationDetailed, 
  getElapsedSeconds 
} from "./use-case-status-history";

export interface CaseCategoryTransition {
  id: string;
  case_id: string;
  organization_id: string;
  from_category_id: string | null;
  to_category_id: string;
  transitioned_at: string;
  transitioned_by: string | null;
  from_category_name?: string;
  to_category_name?: string;
  transitioned_by_profile?: {
    full_name: string | null;
  } | null;
}

export function useCaseStatusHistoryWithTransitions(caseId: string | undefined) {
  const queryClient = useQueryClient();
  
  // Fetch status history
  const historyQuery = useQuery({
    queryKey: ['case-status-history', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      
      const { data, error } = await supabase
        .from('case_status_history')
        .select(`
          *,
          changed_by_profile:profiles!case_status_history_changed_by_fkey(
            full_name
          )
        `)
        .eq('case_id', caseId)
        .order('changed_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as CaseStatusHistoryEntry[];
    },
    enabled: !!caseId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch category transitions
  const transitionsQuery = useQuery({
    queryKey: ['case-category-transitions', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      
      const { data, error } = await supabase
        .from('case_category_transition_log')
        .select(`
          *,
          from_category:case_status_categories!case_category_transition_log_from_category_id_fkey(
            name
          ),
          to_category:case_status_categories!case_category_transition_log_to_category_id_fkey(
            name
          ),
          transitioned_by_profile:profiles!case_category_transition_log_transitioned_by_fkey(
            full_name
          )
        `)
        .eq('case_id', caseId)
        .order('transitioned_at', { ascending: true });
      
      if (error) throw error;
      
      // Transform the data to include category names
      return (data || []).map(transition => ({
        ...transition,
        from_category_name: (transition as any).from_category?.name || null,
        to_category_name: (transition as any).to_category?.name || 'Unknown',
      })) as CaseCategoryTransition[];
    },
    enabled: !!caseId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Mutation for updating dates
  const updateDatesMutation = useMutation({
    mutationFn: async ({ 
      historyId, 
      enteredAt, 
      exitedAt 
    }: { 
      historyId: string; 
      enteredAt?: Date; 
      exitedAt?: Date; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('update_status_history_dates', {
        p_history_id: historyId,
        p_entered_at: enteredAt?.toISOString() || null,
        p_exited_at: exitedAt?.toISOString() || null,
        p_user_id: user.id,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to update dates');
      }
      
      return result;
    },
    onSuccess: () => {
      // Invalidate the history query to refetch
      queryClient.invalidateQueries({ queryKey: ['case-status-history', caseId] });
    },
  });

  const history = historyQuery.data || [];
  const categoryTransitions = transitionsQuery.data || [];

  // Get the current (most recent) status entry
  const getCurrentStatusEntry = (): CaseStatusHistoryEntry | null => {
    if (history.length === 0) return null;
    const current = history.find(h => h.exited_at === null);
    return current || history[history.length - 1];
  };

  // Get current status key
  const getCurrentStatus = (): string | null => {
    const current = getCurrentStatusEntry();
    return current?.to_status_key || current?.to_status || null;
  };

  // Get time in current status (live calculation)
  const getTimeInCurrentStatus = (): number => {
    const current = getCurrentStatusEntry();
    if (!current || current.exited_at) return 0;
    return getElapsedSeconds(current.entered_at);
  };

  // Get total time spent in a specific status
  const getTotalTimeInStatus = (statusKey: string): number => {
    return history
      .filter(h => (h.to_status_key === statusKey || h.to_status === statusKey))
      .reduce((sum, h) => {
        if (h.duration_seconds !== null) {
          return sum + h.duration_seconds;
        }
        if (h.exited_at === null) {
          return sum + getElapsedSeconds(h.entered_at);
        }
        return sum;
      }, 0);
  };

  // Get count of times case entered a specific status
  const getStatusEntryCount = (statusKey: string): number => {
    return history.filter(h => 
      h.to_status_key === statusKey || h.to_status === statusKey
    ).length;
  };

  // Get the full status timeline with computed durations
  const getStatusTimeline = () => {
    return history.map(entry => ({
      ...entry,
      computed_duration_seconds: entry.duration_seconds ?? 
        (entry.exited_at === null ? getElapsedSeconds(entry.entered_at) : null),
      changed_by_name: entry.changed_by_profile?.full_name || null,
    }));
  };

  // Get average time in a specific status
  const getAverageTimeInStatus = (statusKey: string): number | null => {
    const statusEntries = history.filter(h => 
      (h.to_status_key === statusKey || h.to_status === statusKey) && 
      h.duration_seconds !== null
    );
    
    if (statusEntries.length === 0) return null;
    
    const total = statusEntries.reduce((sum, h) => sum + (h.duration_seconds || 0), 0);
    return Math.round(total / statusEntries.length);
  };

  // Get first time case entered a status
  const getFirstEntryTime = (statusKey: string): string | null => {
    const entry = history.find(h => 
      h.to_status_key === statusKey || h.to_status === statusKey
    );
    return entry?.entered_at || null;
  };

  // Get last time case exited a status
  const getLastExitTime = (statusKey: string): string | null => {
    const entries = history.filter(h => 
      (h.to_status_key === statusKey || h.to_status === statusKey) &&
      h.exited_at !== null
    );
    if (entries.length === 0) return null;
    return entries[entries.length - 1].exited_at;
  };

  // Merge category transitions with timeline for display
  const getTimelineWithCategories = () => {
    const statusTimeline = getStatusTimeline();
    
    const merged: Array<{
      type: 'status' | 'category';
      data: any;
      timestamp: string;
    }> = [];
    
    statusTimeline.forEach(entry => {
      merged.push({
        type: 'status',
        data: entry,
        timestamp: entry.entered_at,
      });
    });
    
    categoryTransitions.forEach(transition => {
      merged.push({
        type: 'category',
        data: transition,
        timestamp: transition.transitioned_at,
      });
    });
    
    // Sort by timestamp
    merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return merged;
  };

  return {
    history,
    categoryTransitions,
    isLoading: historyQuery.isLoading || transitionsQuery.isLoading,
    error: historyQuery.error || transitionsQuery.error,
    refetch: () => {
      historyQuery.refetch();
      transitionsQuery.refetch();
    },
    
    // Mutation
    updateEntryDates: updateDatesMutation.mutateAsync,
    isUpdating: updateDatesMutation.isPending,
    
    // Helpers
    getCurrentStatusEntry,
    getCurrentStatus,
    getTimeInCurrentStatus,
    getTotalTimeInStatus,
    getStatusEntryCount,
    getStatusTimeline,
    getAverageTimeInStatus,
    getFirstEntryTime,
    getLastExitTime,
    getTimelineWithCategories,
    formatDuration,
    formatDurationDetailed,
  };
}

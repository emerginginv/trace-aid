import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CaseStatusHistoryEntry {
  id: string;
  case_id: string;
  organization_id: string;
  from_status: string | null;
  to_status: string;
  from_status_key: string | null;
  to_status_key: string | null;
  changed_by: string | null;
  changed_at: string;
  entered_at: string;
  exited_at: string | null;
  duration_seconds: number | null;
  change_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined profile data
  changed_by_profile?: {
    full_name: string | null;
  } | null;
}

export interface CaseRequestStatusHistoryEntry {
  id: string;
  case_request_id: string;
  organization_id: string;
  from_status: string | null;
  to_status: string;
  from_status_key: string | null;
  to_status_key: string | null;
  changed_by: string | null;
  changed_at: string;
  entered_at: string;
  exited_at: string | null;
  duration_seconds: number | null;
  change_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  changed_by_profile?: {
    full_name: string | null;
  } | null;
}

// Format duration in human-readable format
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 0) return "—";
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

// Format duration with more detail for display
export function formatDurationDetailed(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 0) return "—";
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 && days === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
  
  return parts.length > 0 ? parts.join(', ') : '0 seconds';
}

// Calculate elapsed time since a date
export function getElapsedSeconds(fromDate: string): number {
  const from = new Date(fromDate);
  const now = new Date();
  return Math.floor((now.getTime() - from.getTime()) / 1000);
}

export function useCaseStatusHistory(caseId: string | undefined) {
  const query = useQuery({
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });

  const history = query.data || [];

  // Get the current (most recent) status entry
  const getCurrentStatusEntry = (): CaseStatusHistoryEntry | null => {
    if (history.length === 0) return null;
    // Current status has no exit time
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
        // For current status, calculate live duration
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

  return {
    history,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
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
    formatDuration,
    formatDurationDetailed,
  };
}

export function useCaseRequestStatusHistory(caseRequestId: string | undefined) {
  const query = useQuery({
    queryKey: ['case-request-status-history', caseRequestId],
    queryFn: async () => {
      if (!caseRequestId) return [];
      
      const { data, error } = await supabase
        .from('case_request_status_history')
        .select(`
          *,
          changed_by_profile:profiles!case_request_status_history_changed_by_fkey(
            full_name
          )
        `)
        .eq('case_request_id', caseRequestId)
        .order('changed_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as CaseRequestStatusHistoryEntry[];
    },
    enabled: !!caseRequestId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const history = query.data || [];

  const getCurrentStatusEntry = (): CaseRequestStatusHistoryEntry | null => {
    if (history.length === 0) return null;
    const current = history.find(h => h.exited_at === null);
    return current || history[history.length - 1];
  };

  const getCurrentStatus = (): string | null => {
    const current = getCurrentStatusEntry();
    return current?.to_status_key || current?.to_status || null;
  };

  const getTimeInCurrentStatus = (): number => {
    const current = getCurrentStatusEntry();
    if (!current || current.exited_at) return 0;
    return getElapsedSeconds(current.entered_at);
  };

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

  const getStatusTimeline = () => {
    return history.map(entry => ({
      ...entry,
      computed_duration_seconds: entry.duration_seconds ?? 
        (entry.exited_at === null ? getElapsedSeconds(entry.entered_at) : null),
      changed_by_name: entry.changed_by_profile?.full_name || null,
    }));
  };

  return {
    history,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    getCurrentStatusEntry,
    getCurrentStatus,
    getTimeInCurrentStatus,
    getTotalTimeInStatus,
    getStatusTimeline,
    formatDuration,
    formatDurationDetailed,
  };
}

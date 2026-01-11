import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * Shared picklist item interface for case statuses
 */
export interface CaseStatusPicklist {
  id: string;
  value: string;
  color: string | null;
  status_type: string | null;
  display_order?: number | null;
}

/**
 * Hook to fetch case status picklists for the current organization.
 * Uses TanStack Query for caching and automatic refetching.
 * 
 * @returns Object containing case statuses array, loading state, and error state
 */
export function useCaseStatusPicklists() {
  const { organization } = useOrganization();

  const { data: caseStatuses = [], isLoading, error, refetch } = useQuery({
    queryKey: ["case-status-picklists", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("picklists")
        .select("id, value, color, status_type, display_order")
        .eq("type", "case_status")
        .eq("is_active", true)
        .or(`organization_id.eq.${organization.id},organization_id.is.null`)
        .order("display_order");

      if (error) throw error;
      return (data || []) as CaseStatusPicklist[];
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Helper to get open statuses
  const openStatuses = caseStatuses.filter((s) => s.status_type !== "closed");

  // Helper to get closed statuses
  const closedStatuses = caseStatuses.filter((s) => s.status_type === "closed");

  // Helper to check if a status is closed
  const isClosedStatus = (status: string) => {
    const statusItem = caseStatuses.find((s) => s.value === status);
    return statusItem?.status_type === "closed";
  };

  // Helper to get status color
  const getStatusColor = (status: string) => {
    const statusItem = caseStatuses.find((s) => s.value === status);
    return statusItem?.color || null;
  };

  return {
    caseStatuses,
    openStatuses,
    closedStatuses,
    isClosedStatus,
    getStatusColor,
    isLoading,
    error,
    refetch,
  };
}

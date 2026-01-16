import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface PendingCaseRequest {
  id: string;
  request_number: string | null;
  submitted_at: string;
  submitted_client_name: string | null;
  primarySubjectName: string | null;
}

export function usePendingCaseRequests(limit: number = 5) {
  const { organization } = useOrganization();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-case-requests", organization?.id, limit],
    queryFn: async () => {
      if (!organization?.id) return { requests: [], count: 0 };

      // First get the count
      const { count, error: countError } = await supabase
        .from("case_requests")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("status", "pending");

      if (countError) throw countError;

      // Then get the limited list with primary subject info
      const { data: requests, error } = await supabase
        .from("case_requests")
        .select(`
          id,
          request_number,
          submitted_at,
          submitted_client_name,
          case_request_subjects!case_request_subjects_case_request_id_fkey (
            first_name,
            last_name,
            is_primary
          )
        `)
        .eq("organization_id", organization.id)
        .eq("status", "pending")
        .order("submitted_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform the data to include primary subject name
      const transformedRequests: PendingCaseRequest[] = (requests || []).map((req) => {
        const subjects = req.case_request_subjects || [];
        const primarySubject = subjects.find((s: any) => s.is_primary) || subjects[0];
        const primarySubjectName = primarySubject
          ? `${primarySubject.first_name || ""} ${primarySubject.last_name || ""}`.trim()
          : null;

        return {
          id: req.id,
          request_number: req.request_number,
          submitted_at: req.submitted_at,
          submitted_client_name: req.submitted_client_name,
          primarySubjectName: primarySubjectName || null,
        };
      });

      return {
        requests: transformedRequests,
        count: count || 0,
      };
    },
    enabled: !!organization?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    requests: data?.requests || [],
    count: data?.count || 0,
    isLoading,
    refetch,
  };
}

// Lightweight hook just for count (used in sidebar)
export function usePendingCaseRequestsCount() {
  const { organization } = useOrganization();

  const { data: count = 0 } = useQuery({
    queryKey: ["pending-case-requests-count", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return 0;

      const { count, error } = await supabase
        .from("case_requests")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!organization?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  return count;
}

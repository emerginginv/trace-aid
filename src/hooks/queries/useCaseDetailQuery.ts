import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "../useCurrentUser";

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  account_id: string | null;
  contact_id: string | null;
  due_date: string | null;
  created_at: string;
  case_manager_id: string | null;
  case_manager_2_id: string | null;
  investigator_ids: string[];
  closed_by_user_id: string | null;
  closed_at: string | null;
  parent_case_id: string | null;
  instance_number: number;
  reference_number?: string | null;
  reference_number_2?: string | null;
  reference_number_3?: string | null;
  case_type_id?: string | null;
  organization_id?: string | null;
  user_id: string;
}

interface Account {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

interface CaseManager {
  id: string;
  full_name: string | null;
  email: string;
}

interface CaseDetailData {
  caseData: Case;
  account: Account | null;
  contact: Contact | null;
  caseManager: CaseManager | null;
}

/**
 * React Query hook for fetching case detail data with related entities.
 * Replaces the legacy useEffect-based fetchCaseData pattern.
 * 
 * Cache settings:
 * - staleTime: 2 minutes
 * - gcTime: 10 minutes
 */
export function useCaseDetailQuery(caseId: string | undefined) {
  const { data: currentUser } = useCurrentUser();

  return useQuery<CaseDetailData | null>({
    queryKey: ['caseDetail', caseId],
    queryFn: async () => {
      if (!caseId || !currentUser) return null;

      // Get user's organizations
      const { data: userOrgs } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", currentUser.id);
      
      const userOrgIds = userOrgs?.map(o => o.organization_id) || [];

      // Fetch the case
      const { data: caseData, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId)
        .maybeSingle();
      
      if (error) throw error;
      if (!caseData) return null;

      // Check access
      const hasAccess = 
        caseData.user_id === currentUser.id || 
        caseData.investigator_ids?.includes(currentUser.id) ||
        (caseData.organization_id && userOrgIds.includes(caseData.organization_id));
      
      if (!hasAccess) {
        throw new Error("Access denied");
      }

      // Fetch related data in parallel
      const [accountResult, contactResult, managerResult] = await Promise.all([
        caseData.account_id 
          ? supabase.from("accounts").select("id, name").eq("id", caseData.account_id).maybeSingle()
          : Promise.resolve({ data: null }),
        caseData.contact_id 
          ? supabase.from("contacts").select("id, first_name, last_name").eq("id", caseData.contact_id).maybeSingle()
          : Promise.resolve({ data: null }),
        caseData.case_manager_id 
          ? supabase.from("profiles").select("id, full_name, email").eq("id", caseData.case_manager_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        caseData: caseData as Case,
        account: accountResult.data as Account | null,
        contact: contactResult.data as Contact | null,
        caseManager: managerResult.data as CaseManager | null,
      };
    },
    enabled: !!caseId && !!currentUser,
    staleTime: 1000 * 60 * 2,  // 2 minutes
    gcTime: 1000 * 60 * 10,    // 10 minutes
    retry: 1,
  });
}

/**
 * Hook for fetching case statuses picklist.
 * Cached for 10 minutes as statuses rarely change.
 */
export function useCaseStatusesQuery(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['caseStatuses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data } = await supabase
        .from("picklists")
        .select("id, value, color, status_type")
        .eq("type", "case_status")
        .eq("is_active", true)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .order("display_order");
      
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,  // 10 minutes
    gcTime: 1000 * 60 * 30,     // 30 minutes
  });
}

/**
 * Hook for fetching case updates for report generation.
 */
export function useCaseUpdatesQuery(caseId: string | undefined) {
  return useQuery({
    queryKey: ['caseUpdates', caseId],
    queryFn: async () => {
      if (!caseId) return [];

      const { data } = await supabase
        .from("case_updates")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      
      return data || [];
    },
    enabled: !!caseId,
    staleTime: 1000 * 60 * 2,  // 2 minutes
    gcTime: 1000 * 60 * 10,    // 10 minutes
  });
}

/**
 * Hook for fetching all user profiles (for report display).
 * Heavily cached as profiles rarely change.
 */
export function useProfilesMapQuery() {
  return useQuery({
    queryKey: ['profilesMap'],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      
      const profiles: Record<string, { id: string; full_name: string; email: string }> = {};
      (data || []).forEach(p => { profiles[p.id] = p; });
      return profiles;
    },
    staleTime: 1000 * 60 * 10,  // 10 minutes
    gcTime: 1000 * 60 * 30,     // 30 minutes
  });
}

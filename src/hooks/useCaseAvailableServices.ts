import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableService {
  id: string;
  name: string;
  code: string | null;
  pricing_model: string | null;
  is_billable: boolean;
}

/**
 * Fetches available services for a case.
 * Filters services based on the case's active_service_ids (if set), 
 * or falls back to the Case Type's allowed_service_ids.
 */
export function useCaseAvailableServices(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-available-services", caseId],
    queryFn: async () => {
      if (!caseId) return [];

      // Fetch the case with organization, active_service_ids, and case_type's allowed_service_ids
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select(`
          organization_id,
          case_type_id,
          active_service_ids,
          case_types!cases_case_type_id_fkey (
            allowed_service_ids
          )
        `)
        .eq("id", caseId)
        .single();

      if (caseError || !caseData?.organization_id) {
        console.log("No organization found for case:", caseId);
        return [];
      }

      // Fetch all active services for this organization
      const { data: allServices, error } = await supabase
        .from("case_services")
        .select("id, name, code, is_billable")
        .eq("organization_id", caseData.organization_id)
        .eq("is_active", true)
        .order("display_order");

      if (error) {
        console.error("Error fetching available services:", error);
        throw error;
      }

      // Determine which service IDs to filter by:
      // 1. Use case's active_service_ids if populated (these are synced from case_service_instances)
      // 2. Fall back to case_type's allowed_service_ids for filtering available services
      const caseActiveIds = caseData.active_service_ids as string[] | null;
      const caseTypeData = caseData.case_types as { allowed_service_ids: string[] | null } | null;
      const allowedIds = caseTypeData?.allowed_service_ids;

      // For available services, use the case type's allowed_service_ids
      // (active_service_ids tracks what's already added, not what's allowed)
      let filteredServices = allServices || [];
      if (allowedIds && allowedIds.length > 0) {
        filteredServices = filteredServices.filter(service => 
          allowedIds.includes(service.id)
        );
      }

      return filteredServices.map((service) => ({
        id: service.id,
        name: service.name,
        code: service.code || null,
        pricing_model: "hourly", // Default pricing model
        is_billable: service.is_billable ?? true,
      })) as AvailableService[];
    },
    enabled: !!caseId,
  });
}

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
 * Now that pricing profiles are removed, this returns all active services for the organization.
 */
export function useCaseAvailableServices(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-available-services", caseId],
    queryFn: async () => {
      if (!caseId) return [];

      // First get the case's organization
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("organization_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseData?.organization_id) {
        console.log("No organization found for case:", caseId);
        return [];
      }

      // Fetch all active services for this organization
      // Note: Rates are now account-specific (client_price_list), not service-level
      const { data, error } = await supabase
        .from("case_services")
        .select("id, name, code, is_billable")
        .eq("organization_id", caseData.organization_id)
        .eq("is_active", true)
        .order("display_order");

      if (error) {
        console.error("Error fetching available services:", error);
        throw error;
      }

      return (data || []).map((service) => ({
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
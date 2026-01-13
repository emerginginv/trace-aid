import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableService {
  id: string;
  name: string;
  code: string | null;
  pricing_model: string | null;
  rate: number | null;
  is_billable: boolean;
}

/**
 * Fetches available services for a case based on its pricing profile.
 * This returns services that are defined in the case's pricing profile's service_pricing_rules.
 */
export function useCaseAvailableServices(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-available-services", caseId],
    queryFn: async () => {
      if (!caseId) return [];

      // First get the case's pricing profile
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("pricing_profile_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseData?.pricing_profile_id) {
        console.log("No pricing profile found for case:", caseId);
        return [];
      }

      // Then get the services from service_pricing_rules for this pricing profile
      const { data, error } = await supabase
        .from("service_pricing_rules")
        .select(`
          case_service_id,
          pricing_model,
          rate,
          is_billable,
          case_services (
            id,
            name,
            code
          )
        `)
        .eq("pricing_profile_id", caseData.pricing_profile_id);

      if (error) {
        console.error("Error fetching available services:", error);
        throw error;
      }

      return (data || []).map((rule) => ({
        id: rule.case_services?.id || rule.case_service_id,
        name: rule.case_services?.name || "Unknown Service",
        code: rule.case_services?.code || null,
        pricing_model: rule.pricing_model,
        rate: rule.rate,
        is_billable: rule.is_billable ?? true,
      })) as AvailableService[];
    },
    enabled: !!caseId,
  });
}

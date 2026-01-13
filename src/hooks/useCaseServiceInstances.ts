import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CaseServiceInstance {
  id: string;
  status: string;
  service_name: string;
  service_code: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
}

export function useCaseServiceInstances(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-service-instances", caseId],
    queryFn: async () => {
      if (!caseId) return [];

      const { data, error } = await supabase
        .from("case_service_instances")
        .select(`
          id,
          status,
          scheduled_start,
          scheduled_end,
          case_services (
            name,
            code
          )
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((instance) => ({
        id: instance.id,
        status: instance.status,
        service_name: instance.case_services?.name || "Unknown Service",
        service_code: instance.case_services?.code || null,
        scheduled_start: instance.scheduled_start,
        scheduled_end: instance.scheduled_end,
      })) as CaseServiceInstance[];
    },
    enabled: !!caseId,
  });
}

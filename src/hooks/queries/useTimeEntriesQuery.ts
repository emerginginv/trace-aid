import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TimeEntry {
  id: string;
  case_id: string;
  date: string;
  case_title: string;
  case_number: string;
  description: string;
  hours: number | null;
  hourly_rate: number | null;
  amount: number;
  status: string | null;
  invoiced: boolean;
}

interface Case {
  id: string;
  title: string;
  case_number: string;
}

interface TimeEntriesData {
  timeEntries: TimeEntry[];
  cases: Case[];
}

/**
 * React Query hook for fetching time entries with case data.
 * Replaces the legacy useEffect-based fetchTimeData pattern.
 * 
 * Cache settings:
 * - staleTime: 1 minute (time entries are frequently updated)
 * - gcTime: 5 minutes
 */
export function useTimeEntriesQuery(organizationId: string | undefined) {
  return useQuery<TimeEntriesData>({
    queryKey: ['timeEntries', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { timeEntries: [], cases: [] };
      }

      // Fetch cases first (needed for joins and dropdown)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("organization_id", organizationId)
        .order("case_number", { ascending: false });

      if (casesError) throw casesError;

      const cases = casesData || [];
      const casesMap = new Map(cases.map(c => [c.id, c]));

      // Fetch all time entries
      const { data: timeData, error: timeError } = await supabase
        .from("case_finances")
        .select("id, case_id, date, amount, description, status, invoiced, hours, hourly_rate")
        .eq("organization_id", organizationId)
        .eq("finance_type", "time")
        .order("date", { ascending: false });

      if (timeError) throw timeError;

      const timeEntries: TimeEntry[] = (timeData || []).map((entry: any) => {
        const caseInfo = casesMap.get(entry.case_id);
        return {
          id: entry.id,
          case_id: entry.case_id,
          date: entry.date,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          description: entry.description || "",
          hours: entry.hours ? parseFloat(entry.hours) : null,
          hourly_rate: entry.hourly_rate ? parseFloat(entry.hourly_rate) : null,
          amount: parseFloat(entry.amount),
          status: entry.status,
          invoiced: entry.invoiced,
        };
      });

      return { timeEntries, cases };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,  // 1 minute
    gcTime: 1000 * 60 * 5,     // 5 minutes
  });
}

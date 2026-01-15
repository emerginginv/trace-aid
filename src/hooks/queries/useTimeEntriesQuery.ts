import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TimeEntry {
  id: string;
  case_id: string;
  date: string;
  case_title: string;
  case_number: string;
  description: string;
  hours: number;
  pay_rate: number;
  pay_total: number;
  status: string;
  user_id: string;
  user_name: string | null;
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
 * React Query hook for fetching time entries from the canonical time_entries table.
 * Uses investigator pay rates (internal cost tracking), NOT client billing rates.
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

      // Fetch all time entries from the canonical time_entries table
      const { data: timeData, error: timeError } = await supabase
        .from("time_entries")
        .select("id, case_id, user_id, notes, hours, rate, total, status, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (timeError) throw timeError;

      // Fetch user profiles for display names
      const userIds = [...new Set((timeData || []).map(e => e.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p.full_name]));

      const timeEntries: TimeEntry[] = (timeData || []).map((entry: any) => {
        const caseInfo = casesMap.get(entry.case_id);
        return {
          id: entry.id,
          case_id: entry.case_id,
          date: entry.created_at,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          description: entry.notes || "",
          hours: parseFloat(entry.hours) || 0,
          pay_rate: parseFloat(entry.rate) || 0,
          pay_total: parseFloat(entry.total) || 0,
          status: entry.status || "draft",
          user_id: entry.user_id,
          user_name: profilesMap.get(entry.user_id) || null,
        };
      });

      return { timeEntries, cases };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,  // 1 minute
    gcTime: 1000 * 60 * 5,     // 5 minutes
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Case {
  id: string;
  title: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  color: string | null;
}

interface CalendarFiltersData {
  cases: Case[];
  users: User[];
}

/**
 * React Query hook for fetching calendar filter data (cases and users).
 * Replaces the legacy useEffect-based fetchFilters pattern.
 * 
 * Cache settings:
 * - staleTime: 5 minutes (filter data doesn't change often)
 * - gcTime: 15 minutes
 */
export function useCalendarFiltersQuery(organizationId: string | undefined) {
  return useQuery<CalendarFiltersData>({
    queryKey: ['calendarFilters', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { cases: [], users: [] };
      }

      // Get organization members
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId);
      
      const orgUserIds = orgMembers?.map(m => m.user_id) || [];

      // Fetch cases and users in parallel
      const [casesResult, usersResult] = await Promise.all([
        supabase
          .from("cases")
          .select("id, title")
          .eq("organization_id", organizationId),
        orgUserIds.length > 0 
          ? supabase
              .from("profiles")
              .select("id, email, full_name, color")
              .in("id", orgUserIds)
          : Promise.resolve({ data: [] })
      ]);

      return {
        cases: casesResult.data || [],
        users: usersResult.data || [],
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,   // 5 minutes
    gcTime: 1000 * 60 * 15,     // 15 minutes
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Centralized hook for getting the current authenticated user.
 * Uses React Query for caching to prevent duplicate supabase.auth.getUser() calls.
 * 
 * Cache settings:
 * - staleTime: 10 minutes (auth rarely changes during a session)
 * - gcTime: 30 minutes (keep in cache for quick rehydration)
 */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("[useCurrentUser] Error fetching user:", error);
        return null;
      }
      return user;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

type Permission = {
  feature_key: string;
  allowed: boolean;
};

/**
 * Hook for getting the current user's permissions based on their role.
 * Uses React Query for caching to prevent duplicate permissions queries.
 * 
 * Cache settings:
 * - staleTime: 5 minutes (permissions rarely change during a session)
 * - gcTime: 15 minutes
 */
export function usePermissions() {
  const { role, loading: roleLoading } = useUserRole();

  const { data: permissions = {}, isLoading: permissionsLoading } = useQuery<Record<string, boolean>>({
    queryKey: ['permissions', role],
    queryFn: async () => {
      if (!role) {
        return {};
      }

      const { data, error } = await supabase
        .from("permissions" as any)
        .select("feature_key, allowed")
        .eq("role", role);

      if (error) {
        console.error("[usePermissions] Error fetching permissions:", error);
        return {};
      }

      const permissionsMap = ((data as any) || []).reduce((acc: Record<string, boolean>, perm: Permission) => {
        acc[perm.feature_key] = perm.allowed;
        return acc;
      }, {} as Record<string, boolean>);

      return permissionsMap;
    },
    enabled: !roleLoading && !!role,
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 15,    // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Memoize hasPermission to prevent re-renders and effect re-triggers
  const hasPermission = useCallback((featureKey: string): boolean => {
    return permissions[featureKey] ?? false;
  }, [permissions]);

  return {
    permissions,
    loading: roleLoading || permissionsLoading,
    hasPermission,
  };
}

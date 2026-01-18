import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

type Permission = {
  feature_key: string;
  allowed: boolean;
};

/**
 * Common permission combinations for convenience methods.
 * These are the feature keys that are checked for each convenience property.
 */
const PERMISSION_GROUPS = {
  viewAllItems: ['view_all_cases', 'view_all_items'],
  manageFinances: ['edit_finances', 'manage_finances', 'view_finances'],
  administerUsers: ['manage_users', 'admin_users'],
  editCases: ['edit_cases'],
  deleteCases: ['delete_cases'],
  viewReports: ['view_reports'],
  manageBudgets: ['manage_budgets', 'edit_budgets'],
  viewCaseRequests: ['view_case_requests'],
} as const;

/**
 * Hook for getting the current user's permissions based on their role.
 * Uses React Query for caching to prevent duplicate permissions queries.
 * 
 * Provides both individual permission checks via `hasPermission()` and
 * convenience properties like `canViewAllItems`, `canManageFinances`, etc.
 * 
 * Cache settings:
 * - staleTime: 5 minutes (permissions rarely change during a session)
 * - gcTime: 15 minutes
 */
export function usePermissions() {
  const { role, isAdmin, isManager, loading: roleLoading } = useUserRole();

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

  // Check if any permission in a group is allowed
  const hasAnyPermission = useCallback((featureKeys: readonly string[]): boolean => {
    return featureKeys.some(key => permissions[key] ?? false);
  }, [permissions]);

  // Convenience properties for common permission checks
  const conveniences = useMemo(() => ({
    /**
     * Can view all items (cases, updates, etc.) across the organization.
     * Typically true for admins/managers, false for regular users who see only their own.
     */
    canViewAllItems: isAdmin || isManager || hasAnyPermission(PERMISSION_GROUPS.viewAllItems),
    
    /**
     * Can manage financial data (invoices, expenses, payments).
     */
    canManageFinances: isAdmin || hasAnyPermission(PERMISSION_GROUPS.manageFinances),
    
    /**
     * Can administer user accounts and access control.
     */
    canAdministerUsers: isAdmin || hasAnyPermission(PERMISSION_GROUPS.administerUsers),
    
    /**
     * Can edit case details.
     */
    canEditCases: isAdmin || isManager || hasAnyPermission(PERMISSION_GROUPS.editCases),
    
    /**
     * Can delete cases.
     */
    canDeleteCases: isAdmin || hasAnyPermission(PERMISSION_GROUPS.deleteCases),
    
    /**
     * Can view reports and analytics.
     */
    canViewReports: isAdmin || isManager || hasAnyPermission(PERMISSION_GROUPS.viewReports),
    
    /**
     * Can manage case budgets.
     */
    canManageBudgets: isAdmin || isManager || hasAnyPermission(PERMISSION_GROUPS.manageBudgets),
    
    /**
     * Can view incoming case requests.
     */
    canViewCaseRequests: isAdmin || isManager || hasAnyPermission(PERMISSION_GROUPS.viewCaseRequests),
  }), [isAdmin, isManager, hasAnyPermission]);

  return {
    permissions,
    loading: roleLoading || permissionsLoading,
    hasPermission,
    hasAnyPermission,
    // Convenience properties
    ...conveniences,
  };
}

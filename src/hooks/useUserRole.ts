import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "./useCurrentUser";

type AppRole = 'admin' | 'manager' | 'investigator' | 'vendor';

const LOG_PREFIX = "[useUserRole]";

/**
 * Hook for getting the current user's role within the organization.
 * Uses React Query for caching to prevent duplicate organization_members queries.
 * 
 * Cache settings:
 * - staleTime: 5 minutes (roles rarely change during a session)
 * - gcTime: 15 minutes
 */
export function useUserRole() {
  const { organization, loading: orgLoading } = useOrganization();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const { data: role, isLoading: roleLoading } = useQuery<AppRole | null>({
    queryKey: ['userRole', organization?.id, currentUser?.id],
    queryFn: async () => {
      if (!organization?.id) {
        console.log(`${LOG_PREFIX} No organization ID available`);
        return null;
      }

      // Check if we're impersonating a user
      const impersonationData = localStorage.getItem("impersonation");
      let targetUserId: string | null = null;

      if (impersonationData) {
        try {
          const { userId } = JSON.parse(impersonationData);
          targetUserId = userId;
          console.log(`${LOG_PREFIX} Impersonation detected, target user:`, targetUserId);
        } catch (e) {
          console.warn(`${LOG_PREFIX} Invalid impersonation data, clearing...`);
          localStorage.removeItem("impersonation");
        }
      }

      // If not impersonating, use current user
      if (!targetUserId) {
        if (!currentUser) {
          console.log(`${LOG_PREFIX} No authenticated user found`);
          return null;
        }
        targetUserId = currentUser.id;
      }

      console.log(`${LOG_PREFIX} Fetching role for user:`, targetUserId, "org:", organization.id);

      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", targetUserId)
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (orgError) {
        console.error(`${LOG_PREFIX} Error fetching from organization_members:`, orgError);
        return null;
      }

      if (orgMember?.role) {
        console.log(`${LOG_PREFIX} Role determined:`, orgMember.role);
        return orgMember.role as AppRole;
      }

      console.warn(`${LOG_PREFIX} User not found in organization_members for org:`, organization.id);
      return null;
    },
    enabled: !orgLoading && !userLoading && !!organization?.id && !!currentUser,
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 15,    // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const loading = orgLoading || userLoading || roleLoading;

  return {
    role: role ?? null,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isInvestigator: role === 'investigator',
    isVendor: role === 'vendor',
  };
}

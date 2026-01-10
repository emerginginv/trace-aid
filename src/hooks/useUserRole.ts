import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

type AppRole = 'admin' | 'manager' | 'investigator' | 'vendor';

const LOG_PREFIX = "[useUserRole]";

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization, loading: orgLoading } = useOrganization();

  useEffect(() => {
    // CRITICAL: Wait for organization context to be fully ready
    // Must have both: loading complete AND organizationId defined
    if (orgLoading) {
      console.log(`${LOG_PREFIX} Waiting for organization context to load...`);
      setLoading(true);
      return;
    }

    if (!organization?.id) {
      console.log(`${LOG_PREFIX} Waiting for organization context - no organizationId yet`);
      setLoading(true);
      return;
    }

    console.log(`${LOG_PREFIX} Organization context ready, fetching role for organization:`, organization.id);

    const fetchUserRole = async () => {
      const fetchStart = Date.now();
      console.log(`${LOG_PREFIX} Starting role fetch...`);
      
      try {
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

        // If not impersonating, get the current user
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.log(`${LOG_PREFIX} No authenticated user found`);
            setRole(null);
            setLoading(false);
            return;
          }
          targetUserId = user.id;
          console.log(`${LOG_PREFIX} Current user:`, targetUserId);
        }

        // Organization context is guaranteed to be ready at this point
        console.log(`${LOG_PREFIX} Fetching role from organization_members for org:`, organization.id);
        
        const { data: orgMember, error: orgError } = await supabase
          .from("organization_members")
          .select("role")
          .eq("user_id", targetUserId)
          .eq("organization_id", organization.id)
          .maybeSingle();

        if (orgError) {
          console.error(`${LOG_PREFIX} Error fetching from organization_members:`, orgError);
        }

        if (orgMember?.role) {
          const duration = Date.now() - fetchStart;
          console.log(`${LOG_PREFIX} Role determined:`, orgMember.role);
          setRole(orgMember.role as AppRole);
          setLoading(false);
          return;
        } else {
          console.warn(`${LOG_PREFIX} User not found in organization_members for org:`, organization.id);
        }

        // No organization context or not a member - should not happen in normal flow
        console.warn(`${LOG_PREFIX} ⚠️ No organization context or membership found, setting role to null`);
        setRole(null);
      } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error in fetchUserRole:`, error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log(`${LOG_PREFIX} Auth state changed:`, event);
      if (!orgLoading) {
        fetchUserRole();
      }
    });

    return () => subscription.unsubscribe();
  }, [organization?.id, orgLoading]);

  // Log role changes
  useEffect(() => {
    console.log(`${LOG_PREFIX} Role state updated:`, {
      role,
      loading: loading || orgLoading,
      isAdmin: role === 'admin',
      isManager: role === 'manager' || role === 'admin',
      isInvestigator: role === 'investigator',
      isVendor: role === 'vendor',
    });
  }, [role, loading, orgLoading]);

  return {
    role,
    loading: loading || orgLoading,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isInvestigator: role === 'investigator',
    isVendor: role === 'vendor',
  };
}

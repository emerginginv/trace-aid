import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

type AppRole = 'admin' | 'manager' | 'investigator' | 'vendor';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization, loading: orgLoading } = useOrganization();

  useEffect(() => {
    // CRITICAL: Wait for organization context to finish loading
    if (orgLoading) {
      setLoading(true);
      return;
    }

    const fetchUserRole = async () => {
      try {
        // Check if we're impersonating a user
        const impersonationData = localStorage.getItem("impersonation");
        let targetUserId: string | null = null;

        if (impersonationData) {
          try {
            const { userId } = JSON.parse(impersonationData);
            targetUserId = userId;
          } catch (e) {
            localStorage.removeItem("impersonation");
          }
        }

        // If not impersonating, get the current user
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setRole(null);
            setLoading(false);
            return;
          }
          targetUserId = user.id;
        }

        // CRITICAL: Always get role from organization_members for current org
        if (organization?.id) {
          const { data: orgMember, error: orgError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", targetUserId)
            .eq("organization_id", organization.id)
            .maybeSingle();

          if (!orgError && orgMember?.role) {
            console.log("[useUserRole] Role from organization_members:", orgMember.role, "for org:", organization.id);
            setRole(orgMember.role as AppRole);
            setLoading(false);
            return;
          }
        }

        // No organization context or not a member - should not happen in normal flow
        console.warn("[useUserRole] No organization context or membership found");
        setRole(null);
      } catch (error) {
        console.error("Error in fetchUserRole:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!orgLoading) {
        fetchUserRole();
      }
    });

    return () => subscription.unsubscribe();
  }, [organization?.id, orgLoading]);

  return {
    role,
    loading: loading || orgLoading,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isInvestigator: role === 'investigator',
    isVendor: role === 'vendor',
  };
}

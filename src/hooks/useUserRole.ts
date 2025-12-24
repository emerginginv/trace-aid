import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

type AppRole = 'admin' | 'manager' | 'investigator' | 'vendor';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();

  useEffect(() => {
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

        // First try to get role from organization_members for current org
        if (organization?.id) {
          const { data: orgMember, error: orgError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", targetUserId)
            .eq("organization_id", organization.id)
            .maybeSingle();

          if (!orgError && orgMember?.role) {
            setRole(orgMember.role as AppRole);
            setLoading(false);
            return;
          }
        }

        // Fallback to user_roles table (get the first/primary role)
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else {
          setRole(data?.role as AppRole || null);
        }
      } catch (error) {
        console.error("Error in fetchUserRole:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, [organization?.id]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isInvestigator: role === 'investigator',
    isVendor: role === 'vendor',
  };
}

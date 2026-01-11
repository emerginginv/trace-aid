import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

type Permission = {
  feature_key: string;
  allowed: boolean;
};

export function usePermissions() {
  const { role, loading: roleLoading } = useUserRole();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!role) {
        setPermissions({});
        setLoading(false);
        return;
      }

      // Set loading true when we have a role and are about to fetch
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from("permissions" as any)
          .select("feature_key, allowed")
          .eq("role", role);

        if (error) {
          console.error("Error fetching permissions:", error);
          setPermissions({});
        } else {
          const permissionsMap = ((data as any) || []).reduce((acc: Record<string, boolean>, perm: Permission) => {
            acc[perm.feature_key] = perm.allowed;
            return acc;
          }, {} as Record<string, boolean>);
          setPermissions(permissionsMap);
        }
      } catch (error) {
        console.error("Error in fetchPermissions:", error);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [role]);

  const hasPermission = (featureKey: string): boolean => {
    return permissions[featureKey] ?? false;
  };

  return {
    permissions,
    loading: loading || roleLoading,
    hasPermission,
  };
}

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ImpersonationSession {
  active: boolean;
  session_id?: string;
  session_token?: string;
  target_user_id?: string;
  target_user_email?: string;
  target_user_name?: string;
  target_organization_id?: string;
  target_organization_name?: string;
  reason?: string;
  started_at?: string;
  expires_at?: string;
  remaining_seconds?: number;
}

interface ImpersonationContextType {
  session: ImpersonationSession | null;
  isImpersonating: boolean;
  isPlatformStaff: boolean;
  platformRole: string | null;
  isLoading: boolean;
  startImpersonation: (targetUserId: string, targetOrgId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  endImpersonation: () => Promise<void>;
  refreshSession: () => Promise<void>;
  // Legacy aliases for backward compatibility
  impersonatedUserId: string | null;
  impersonatedUserEmail: string | null;
  impersonatedUserName: string | null;
  stopImpersonation: () => void;
}

const ImpersonationContext = React.createContext<ImpersonationContextType | undefined>(undefined);

const LOG_PREFIX = "[Impersonation]";

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<ImpersonationSession | null>(null);
  const [isPlatformStaff, setIsPlatformStaff] = React.useState(false);
  const [platformRole, setPlatformRole] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check for active impersonation session on mount
  const checkSession = React.useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setSession(null);
        setIsLoading(false);
        return;
      }

      // Check if user is platform staff
      const { data: roleData } = await supabase.rpc('get_platform_role', {
        p_user_id: userData.user.id
      });
      
      if (roleData) {
        setIsPlatformStaff(true);
        setPlatformRole(roleData as string);
      }

      // Check for active session
      const { data: sessionData, error } = await supabase.rpc('get_active_impersonation');
      
      if (error) {
        console.error(LOG_PREFIX, "Error checking session:", error);
        setSession({ active: false });
      } else if (sessionData && typeof sessionData === 'object') {
        const sessionInfo = sessionData as unknown as ImpersonationSession;
        setSession(sessionInfo);
        
        if (sessionInfo.active) {
          console.log(LOG_PREFIX, "Active impersonation session found:", {
            targetUser: sessionInfo.target_user_email,
            targetOrg: sessionInfo.target_organization_name,
            expiresIn: sessionInfo.remaining_seconds
          });
        }
      } else {
        setSession({ active: false });
      }
    } catch (err) {
      console.error(LOG_PREFIX, "Session check error:", err);
      setSession({ active: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Auto-refresh to check for expiry
  React.useEffect(() => {
    if (!session?.active) return;

    const interval = setInterval(() => {
      checkSession();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [session?.active, checkSession]);

  const startImpersonation = React.useCallback(async (
    targetUserId: string,
    targetOrgId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(LOG_PREFIX, "Starting impersonation:", { targetUserId, targetOrgId });

      const { data, error } = await supabase.rpc('start_impersonation', {
        p_target_user_id: targetUserId,
        p_target_org_id: targetOrgId,
        p_reason: reason
      });

      if (error) {
        console.error(LOG_PREFIX, "Start error:", error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as { success: boolean; error?: string; target_organization_id?: string };
      
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to start impersonation' };
      }

      console.log(LOG_PREFIX, "Impersonation started successfully");
      
      // Refresh session
      await checkSession();

      // Get org subdomain and redirect
      const { data: orgData } = await supabase
        .from('organizations')
        .select('subdomain')
        .eq('id', targetOrgId)
        .single();

      if (orgData?.subdomain) {
        // Redirect to target org's domain
        const targetUrl = `https://${orgData.subdomain}.caseinformation.app/dashboard`;
        window.location.href = targetUrl;
      } else {
        // If no subdomain, just refresh
        window.location.reload();
      }

      return { success: true };
    } catch (err) {
      console.error(LOG_PREFIX, "Start error:", err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [checkSession]);

  const endImpersonation = React.useCallback(async () => {
    try {
      console.log(LOG_PREFIX, "Ending impersonation");

      const { data, error } = await supabase.rpc('end_impersonation', {
        p_session_token: session?.session_token || null
      });

      if (error) {
        console.error(LOG_PREFIX, "End error:", error);
      }

      const result = data as unknown as { success: boolean };
      
      if (result?.success) {
        console.log(LOG_PREFIX, "Impersonation ended successfully");
      }

      // Clear local state
      setSession({ active: false });

      // Redirect to support console or home using window.location
      window.location.href = '/support-console';
    } catch (err) {
      console.error(LOG_PREFIX, "End error:", err);
      // Force clear anyway
      setSession({ active: false });
      window.location.href = '/';
    }
  }, [session?.session_token]);

  const value: ImpersonationContextType = {
    session,
    isImpersonating: session?.active ?? false,
    isPlatformStaff,
    platformRole,
    isLoading,
    startImpersonation,
    endImpersonation,
    refreshSession: checkSession,
    // Legacy aliases
    impersonatedUserId: session?.target_user_id ?? null,
    impersonatedUserEmail: session?.target_user_email ?? null,
    impersonatedUserName: session?.target_user_name ?? null,
    stopImpersonation: endImpersonation,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = React.useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}

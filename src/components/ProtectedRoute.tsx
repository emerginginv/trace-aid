import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { BillingGate } from "@/components/billing/BillingGate";
import type { User } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'investigator' | 'vendor' | 'owner';
  requiresAnyRole?: ('admin' | 'manager' | 'investigator' | 'vendor' | 'owner')[];
  blockVendors?: boolean;
  blockInvestigators?: boolean;
  skipBillingGate?: boolean; // Allow bypassing billing gate for specific routes
}

const ProtectedRoute = ({ children, requiredRole, requiresAnyRole, blockVendors = false, blockInvestigators = false, skipBillingGate = false }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { organization, loading: orgLoading } = useOrganization();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // CRITICAL: Wait for organization context to finish loading
    if (orgLoading) {
      return;
    }

    const checkAuth = async (session: any) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if setup is completed - MANDATORY before dashboard access
      const isSetupCompleted = session.user?.user_metadata?.setup_completed === true;
      if (!isSetupCompleted) {
        console.warn("[ProtectedRoute] Setup not completed, redirecting to setup page");
        navigate("/auth?setup=true");
        return;
      }

      // STRICT MULTI-TENANCY CHECK
      // If we are on a subdomain, the OrganizationContext MUST have resolved 
      // an organization. If it's null, it means the user is NOT a member 
      // of the organization associated with this subdomain.
      if (window.location.hostname !== "localhost" && 
          !window.location.hostname.includes("netlify.app") && 
          !window.location.hostname.includes("lovableproject.com")) {
        
        // Extract subdomain from URL
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        const isSubdomain = parts.length >= 3 || (parts.length === 2 && hostname.includes('localhost'));
        
        if (isSubdomain && !organization) {
          console.error("[ProtectedRoute] Access denied: User is not a member of this workspace.");
          // Redirect to the tenant-specific auth page
          navigate("/auth");
          return;
        }
      }

      setUser(session.user);

      // If no role requirement and not blocking vendors/investigators, just check authentication
      if (!requiredRole && !requiresAnyRole && !blockVendors && !blockInvestigators) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // Check user's role from organization_members for current org
      try {
        let userRole: string | null = null;

        if (organization?.id) {
          const { data: orgMember, error: orgError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("organization_id", organization.id)
            .maybeSingle();

          if (!orgError && orgMember?.role) {
            userRole = orgMember.role;
          }
        }

        console.log("[ProtectedRoute] User role:", userRole, 
                    "Org:", organization?.name,
                    "Required:", requiredRole, 
                    "Block vendors:", blockVendors,
                    "Block investigators:", blockInvestigators);

        // Block vendors if explicitly requested
        if (blockVendors && userRole === 'vendor') {
          console.log("[ProtectedRoute] Blocking vendor access");
          navigate("/");
          return;
        }

        // Block investigators if explicitly requested
        if (blockInvestigators && userRole === 'investigator') {
          console.log("[ProtectedRoute] Blocking investigator access");
          navigate("/");
          return;
        }

        // Check if user has required role
        // Owners have all rights, so if any role is required, they pass
        if (requiredRole && userRole !== requiredRole && userRole !== 'owner') {
          console.log("[ProtectedRoute] User does not have required role");
          navigate("/");
          return;
        }

        // Check if user has any of the required roles
        // Owners always have access if ANY role is required
        if (requiresAnyRole && userRole !== 'owner' && !requiresAnyRole.includes(userRole as any)) {
          console.log("[ProtectedRoute] User role not in requiresAnyRole array");
          navigate("/");
          return;
        }

        console.log("[ProtectedRoute] Authorization successful");
        setAuthorized(true);
      } catch (error) {
        console.error("Error in role check:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        } else if (!orgLoading) {
          checkAuth(session);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        checkAuth(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, requiredRole, requiresAnyRole, blockVendors, blockInvestigators, organization?.id, orgLoading]);

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  // Wrap with BillingGate unless explicitly skipped
  if (!skipBillingGate) {
    return user ? <BillingGate>{children}</BillingGate> : null;
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;

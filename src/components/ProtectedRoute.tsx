import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'investigator' | 'vendor';
  requiresAnyRole?: ('admin' | 'manager' | 'investigator' | 'vendor')[];
}

const ProtectedRoute = ({ children, requiredRole, requiresAnyRole }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async (session: any) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // If no role requirement, just check authentication
      if (!requiredRole && !requiresAnyRole) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // Check user's role
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking user role:", error);
          navigate("/");
          return;
        }

        const userRole = data?.role;

        // Check if user has required role
        if (requiredRole && userRole !== requiredRole) {
          navigate("/");
          return;
        }

        // Check if user has any of the required roles
        if (requiresAnyRole && !requiresAnyRole.includes(userRole as any)) {
          navigate("/");
          return;
        }

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
        } else {
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
  }, [navigate, requiredRole, requiresAnyRole]);

  if (loading) {
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
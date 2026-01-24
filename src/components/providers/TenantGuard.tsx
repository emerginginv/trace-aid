import * as React from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useLocation } from "react-router-dom";
import TenantNotFound from "@/pages/TenantNotFound";

/**
 * TenantGuard Component
 * 
 * This component wraps the main application content and handles tenant validation.
 * It shows a TenantNotFound page when:
 * - A subdomain was detected but the organization doesn't exist
 * - A subdomain was detected but the organization is inactive
 * 
 * It shows a loading state while tenant validation is in progress.
 */
export function TenantGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, tenantNotFound, invalidSubdomain, tenantSubdomain } = useTenant();
  const location = useLocation();

  const isAuthPage = location.pathname === "/auth";

  // Show minimal loading state during tenant resolution
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show TenantNotFound if subdomain was detected but org doesn't exist
  // Bypass this for the auth page to allow setup/recovery flows
  if (tenantNotFound && !isAuthPage) {
    return <TenantNotFound subdomain={invalidSubdomain} />;
  }

  // Tenant is valid (or no subdomain) - render app normally
  return <>{children}</>;
}

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

// Production domains where subdomain-based tenancy applies
const TENANT_ENABLED_DOMAINS = ["unifiedcases.com"];

// Reserved subdomains that should never be treated as tenants
const RESERVED_SUBDOMAINS = ["app", "www", "localhost"];

interface TenantContextType {
  tenantSubdomain: string | null;
  customDomain: string | null;
  isCustomDomain: boolean;
  resolvedOrgId: string | null;
}

const TenantContext = React.createContext<TenantContextType | undefined>(undefined);

/**
 * Detects the tenant subdomain from the current hostname.
 */
function detectTenantSubdomain(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");

  if (parts.length <= 2) return null;

  const baseDomain = parts.slice(-2).join(".");
  
  if (!TENANT_ENABLED_DOMAINS.includes(baseDomain)) {
    console.log("[TenantContext] Tenant subdomain: null (not on tenant-enabled domain:", baseDomain, ")");
    return null;
  }

  const subdomain = parts[0].toLowerCase();

  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }

  return subdomain;
}

/**
 * Check if this is a custom domain (not unifiedcases.com)
 */
function isCustomDomainHostname(): boolean {
  const hostname = window.location.hostname;
  return !TENANT_ENABLED_DOMAINS.some(d => hostname.endsWith(d)) && 
         !hostname.includes("localhost") && 
         !hostname.includes("lovableproject.com");
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantSubdomain, setTenantSubdomain] = React.useState<string | null>(null);
  const [customDomain, setCustomDomain] = React.useState<string | null>(null);
  const [isCustomDomain, setIsCustomDomain] = React.useState(false);
  const [resolvedOrgId, setResolvedOrgId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const hostname = window.location.hostname;
    
    // Check if this is a custom domain
    if (isCustomDomainHostname()) {
      console.log("[TenantContext] Custom domain detected:", hostname);
      setIsCustomDomain(true);
      setCustomDomain(hostname);
      
      // Resolve organization via custom domain lookup
      supabase.rpc('resolve_tenant_by_domain', { p_hostname: hostname })
        .then(({ data, error }) => {
          const result = data as { found?: boolean; organization_id?: string; subdomain?: string } | null;
          if (!error && result?.found) {
            console.log("[TenantContext] Custom domain resolved to org:", result.organization_id);
            setResolvedOrgId(result.organization_id || null);
            setTenantSubdomain(result.subdomain || null);
          } else {
            console.warn("[TenantContext] Custom domain not found or inactive:", hostname);
          }
        });
    } else {
      // Standard subdomain detection
      const detected = detectTenantSubdomain();
      console.log("Tenant subdomain:", detected);
      setTenantSubdomain(detected);
    }
  }, []);

  const value: TenantContextType = {
    tenantSubdomain,
    customDomain,
    isCustomDomain,
    resolvedOrgId,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = React.useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function getTenantSubdomain(): string | null {
  return detectTenantSubdomain();
}

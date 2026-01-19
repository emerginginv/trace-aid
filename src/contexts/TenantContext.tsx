import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getTenantFromHostname, 
  TENANT_ENABLED_DOMAINS, 
  RESERVED_SUBDOMAINS 
} from "@/utils/getTenantFromHostname";

// Development/preview domains to skip tenant resolution
const DEV_DOMAINS = ["localhost", "netlify.app", "lovable.app", "lovableproject.com"];

interface TenantContextType {
  tenantSubdomain: string | null;
  customDomain: string | null;
  isCustomDomain: boolean;
  resolvedOrgId: string | null;
  /** True while tenant/org resolution is in progress */
  isLoading: boolean;
  /** True if a subdomain was detected but org lookup failed */
  tenantNotFound: boolean;
  /** The detected subdomain that was not found (for error display) */
  invalidSubdomain: string | null;
}

const TenantContext = React.createContext<TenantContextType | undefined>(undefined);

/**
 * Gets a development subdomain override from URL parameter.
 * Only works in non-production environments.
 */
function getDevSubdomainOverride(): string | null {
  const hostname = window.location.hostname;
  // Only allow in non-production environments
  if (TENANT_ENABLED_DOMAINS.some(d => hostname.endsWith(d))) {
    return null;
  }
  
  const params = new URLSearchParams(window.location.search);
  return params.get('org');
}

/**
 * Check if this is a custom domain (not unifiedcases.com or caseinformation.app)
 */
function isCustomDomainHostname(): boolean {
  const hostname = window.location.hostname;
  return !TENANT_ENABLED_DOMAINS.some(d => hostname.endsWith(d)) && 
         !DEV_DOMAINS.some(d => hostname.includes(d));
}

/**
 * Legacy function for backwards compatibility
 */
function detectTenantSubdomain(): string | null {
  return getTenantFromHostname().tenantSlug;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantSubdomain, setTenantSubdomain] = React.useState<string | null>(null);
  const [customDomain, setCustomDomain] = React.useState<string | null>(null);
  const [isCustomDomain, setIsCustomDomain] = React.useState(false);
  const [resolvedOrgId, setResolvedOrgId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [tenantNotFound, setTenantNotFound] = React.useState(false);
  const [invalidSubdomain, setInvalidSubdomain] = React.useState<string | null>(null);

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
            setTenantNotFound(true);
            setInvalidSubdomain(hostname);
          }
          setIsLoading(false);
        });
      return;
    }
    
    // Standard subdomain detection
    const devOverride = getDevSubdomainOverride();
    const detection = getTenantFromHostname();
    
    if (devOverride) {
      console.log("[TenantContext] Development subdomain override:", devOverride);
      setTenantSubdomain(devOverride);
      // Validate the dev override tenant exists
      validateTenantSubdomain(devOverride);
      return;
    }
    
    // No subdomain detected - root domain or reserved subdomain
    if (!detection.tenantSlug) {
      console.log("[TenantContext] No tenant subdomain:", detection);
      setTenantSubdomain(null);
      setIsLoading(false);
      return;
    }
    
    // Subdomain detected - validate it exists in database
    console.log("[TenantContext] Tenant subdomain detected:", detection.tenantSlug);
    setTenantSubdomain(detection.tenantSlug);
    validateTenantSubdomain(detection.tenantSlug);
  }, []);

  /**
   * Validates that a subdomain corresponds to an active organization
   */
  async function validateTenantSubdomain(subdomain: string) {
    console.log("[TenantContext] Validating tenant:", subdomain);
    
    try {
      const { data, error } = await supabase
        .rpc('resolve_organization_by_subdomain', { p_subdomain: subdomain })
        .maybeSingle();
      
      if (error) {
        console.error("[TenantContext] Error validating tenant:", error);
        setTenantNotFound(true);
        setInvalidSubdomain(subdomain);
        setIsLoading(false);
        return;
      }
      
      if (!data || !data.is_active) {
        console.warn("[TenantContext] Tenant not found or inactive:", subdomain);
        setTenantNotFound(true);
        setInvalidSubdomain(subdomain);
        setIsLoading(false);
        return;
      }
      
      console.log("[TenantContext] Tenant validated:", subdomain, data.organization_id);
      setResolvedOrgId(data.organization_id);
      setTenantNotFound(false);
      setInvalidSubdomain(null);
      setIsLoading(false);
    } catch (err) {
      console.error("[TenantContext] Exception validating tenant:", err);
      setTenantNotFound(true);
      setInvalidSubdomain(subdomain);
      setIsLoading(false);
    }
  }

  const value: TenantContextType = {
    tenantSubdomain,
    customDomain,
    isCustomDomain,
    resolvedOrgId,
    isLoading,
    tenantNotFound,
    invalidSubdomain,
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

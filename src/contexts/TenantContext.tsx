import * as React from "react";

// Reserved subdomains that should never be treated as tenants
const RESERVED_SUBDOMAINS = ["app", "www", "localhost"];

interface TenantContextType {
  tenantSubdomain: string | null;
}

const TenantContext = React.createContext<TenantContextType | undefined>(undefined);

/**
 * Detects the tenant subdomain from the current hostname.
 * 
 * Examples:
 * - emerging.casewyze.com → "emerging"
 * - test123.casewyze.com → "test123"
 * - app.casewyze.com → null (reserved)
 * - www.casewyze.com → null (reserved)
 * - localhost → null (reserved)
 * - casewyze.com → null (no subdomain)
 */
function detectTenantSubdomain(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");

  // Must have more than 2 parts to have a subdomain
  // e.g., "emerging.casewyze.com" has 3 parts
  if (parts.length <= 2) {
    return null;
  }

  const subdomain = parts[0].toLowerCase();

  // Check if it's a reserved subdomain
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }

  return subdomain;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantSubdomain] = React.useState<string | null>(() => {
    const detected = detectTenantSubdomain();
    
    // Developer visibility log
    console.log("Tenant subdomain:", detected);
    
    return detected;
  });

  const value: TenantContextType = {
    tenantSubdomain,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to access the detected tenant subdomain.
 * Returns null if no valid tenant subdomain is detected.
 */
export function useTenant() {
  const context = React.useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

/**
 * Utility function to get tenant subdomain outside of React components.
 * Useful for edge cases where context isn't available.
 */
export function getTenantSubdomain(): string | null {
  return detectTenantSubdomain();
}

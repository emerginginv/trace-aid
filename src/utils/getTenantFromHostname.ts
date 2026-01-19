/**
 * Utility for extracting tenant subdomain from hostname.
 * Works with wildcard subdomains on caseinformation.app
 */

// Production domains where subdomain-based tenancy applies
export const TENANT_ENABLED_DOMAINS = [
  "caseinformation.app",
];

// Reserved subdomains that should never be treated as tenants
export const RESERVED_SUBDOMAINS = ["www", "app", "api", "admin", "localhost"];

// Development/preview domains to ignore for tenant detection
const IGNORED_DOMAINS = [
  "localhost",
  "netlify.app",
  "lovable.app",
  "lovableproject.com",
];

export interface TenantDetectionResult {
  tenantSlug: string | null;
  isValidDomain: boolean;
  hostname: string;
  baseDomain: string | null;
}

/**
 * Extracts the tenant subdomain from the current hostname.
 * 
 * @example
 * caseinformation.app        → { tenantSlug: null, isValidDomain: true }
 * www.caseinformation.app    → { tenantSlug: null, isValidDomain: true }
 * emerging.caseinformation.app → { tenantSlug: "emerging", isValidDomain: true }
 * test.caseinformation.app     → { tenantSlug: "test", isValidDomain: true }
 * random.netlify.app         → { tenantSlug: null, isValidDomain: false }
 */
export function getTenantFromHostname(hostname?: string): TenantDetectionResult {
  const host = hostname || window.location.hostname;
  const parts = host.split(".");
  
  // Check if this is an ignored/development domain
  const isIgnoredDomain = IGNORED_DOMAINS.some(d => host.includes(d));
  
  if (isIgnoredDomain) {
    console.log("[getTenantFromHostname] Ignored domain:", host);
    return {
      tenantSlug: null,
      isValidDomain: false,
      hostname: host,
      baseDomain: null,
    };
  }

  // Root domain (e.g., caseinformation.app) - no subdomain
  if (parts.length <= 2) {
    const baseDomain = parts.join(".");
    const isEnabled = TENANT_ENABLED_DOMAINS.includes(baseDomain);
    
    console.log("[getTenantFromHostname] Root domain:", baseDomain, "enabled:", isEnabled);
    return {
      tenantSlug: null,
      isValidDomain: isEnabled,
      hostname: host,
      baseDomain: isEnabled ? baseDomain : null,
    };
  }

  // Extract base domain (last two parts)
  const baseDomain = parts.slice(-2).join(".");
  
  // Check if this is a tenant-enabled domain
  if (!TENANT_ENABLED_DOMAINS.includes(baseDomain)) {
    console.log("[getTenantFromHostname] Not a tenant-enabled domain:", baseDomain);
    return {
      tenantSlug: null,
      isValidDomain: false,
      hostname: host,
      baseDomain: null,
    };
  }

  // Extract subdomain (first part)
  const subdomain = parts[0].toLowerCase();

  // Check if this is a reserved subdomain
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    console.log("[getTenantFromHostname] Reserved subdomain:", subdomain);
    return {
      tenantSlug: null,
      isValidDomain: true,
      hostname: host,
      baseDomain,
    };
  }

  console.log("[getTenantFromHostname] Tenant detected:", subdomain);
  return {
    tenantSlug: subdomain,
    isValidDomain: true,
    hostname: host,
    baseDomain,
  };
}

/**
 * Simple helper to get just the tenant slug (for backwards compatibility)
 */
export function detectTenantSubdomain(hostname?: string): string | null {
  return getTenantFromHostname(hostname).tenantSlug;
}

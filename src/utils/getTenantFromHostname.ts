/**
 * Utility for extracting tenant subdomain from hostname.
 * Works with wildcard subdomains on caseinformation.app
 */

// Only log in development mode
const isDev = import.meta.env.DEV;

function devLog(category: string, message: string, data?: Record<string, unknown>) {
  if (isDev) {
    console.log(`[TenantDetection:${category}]`, message, data ? data : '');
  }
}

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
  
  devLog('Init', 'Starting tenant detection', { hostname: host, parts });
  
  // Check if this is an ignored/development domain
  const isIgnoredDomain = IGNORED_DOMAINS.some(d => host.includes(d));
  
  if (isIgnoredDomain) {
    devLog('Route', 'Ignored domain - skipping tenant detection', { hostname: host });
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
    
    devLog('Route', 'Root domain detected', { 
      baseDomain, 
      isEnabled,
      routing: 'No tenant - loading main app'
    });
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
    devLog('Route', 'Not a tenant-enabled domain', { baseDomain, enabledDomains: TENANT_ENABLED_DOMAINS });
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
    devLog('Route', 'Reserved subdomain - treating as root', { 
      subdomain, 
      reservedList: RESERVED_SUBDOMAINS 
    });
    return {
      tenantSlug: null,
      isValidDomain: true,
      hostname: host,
      baseDomain,
    };
  }

  devLog('Tenant', 'Tenant subdomain detected', { 
    tenantSlug: subdomain, 
    baseDomain,
    routing: 'Will attempt to resolve tenant from database'
  });
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
  const result = getTenantFromHostname(hostname);
  devLog('Result', 'Final tenant detection result', { 
    tenantSlug: result.tenantSlug,
    isValidDomain: result.isValidDomain,
    hostname: result.hostname
  });
  return result.tenantSlug;
}

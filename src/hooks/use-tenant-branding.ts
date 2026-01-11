import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantBranding {
  found: boolean;
  branding_enabled: boolean;
  logo_url: string | null;
  brand_name: string | null;
  accent_color: string | null;
}

/**
 * Fetches tenant login branding configuration based on subdomain.
 * This hook is used on the login page BEFORE authentication,
 * so it uses a public RPC function.
 * 
 * @param subdomain - The tenant subdomain (e.g., "emerging" from emerging.casewyze.com)
 * @returns Query result with tenant branding data
 */
export function useTenantBranding(subdomain: string | null) {
  return useQuery({
    queryKey: ["tenant-branding", subdomain],
    queryFn: async (): Promise<TenantBranding | null> => {
      if (!subdomain) return null;

      const { data, error } = await supabase.rpc("get_tenant_login_branding", {
        p_subdomain: subdomain,
      });

      if (error) {
        console.error("[useTenantBranding] Error fetching branding:", error);
        return null;
      }

      // Type assertion with validation
      const result = data as unknown as TenantBranding | null;
      return result;
    },
    enabled: !!subdomain,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: false, // Don't retry on failure - fall back to default branding
    refetchOnWindowFocus: false,
  });
}

/**
 * Validates a hex color string
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Sanitizes brand name input
 */
export function sanitizeBrandName(name: string): string {
  // Strip HTML tags and limit length
  return name
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 50);
}

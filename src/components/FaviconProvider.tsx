import { useEffect, useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavicon } from "@/hooks/use-favicon";

/**
 * Provider component that manages the browser favicon for authenticated users.
 * Fetches the organization's square logo from organization_settings and sets it as the favicon.
 * Falls back to the default CaseWyze favicon if no square logo is configured.
 */
export function FaviconProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization();
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id) {
      setFaviconUrl(null);
      return;
    }

    const fetchFavicon = async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("square_logo_url")
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (error) {
        console.error("[FaviconProvider] Error fetching favicon:", error);
        setFaviconUrl(null);
        return;
      }

      setFaviconUrl(data?.square_logo_url || null);
    };

    fetchFavicon();
  }, [organization?.id]);

  // Apply the favicon
  useFavicon(faviconUrl);

  return <>{children}</>;
}

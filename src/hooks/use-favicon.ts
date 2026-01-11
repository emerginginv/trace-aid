import { useEffect } from "react";

const DEFAULT_FAVICON = "/favicon.png";

/**
 * Dynamically updates the browser favicon.
 * Uses the organization's square logo when available, falls back to default CaseWyze favicon.
 * 
 * @param faviconUrl - URL to the favicon image (typically square_logo_url from organization_settings)
 */
export function useFavicon(faviconUrl: string | null | undefined) {
  useEffect(() => {
    const url = faviconUrl || DEFAULT_FAVICON;
    
    // Find existing favicon link by ID or rel attribute
    let link = document.querySelector<HTMLLinkElement>("#app-favicon");
    if (!link) {
      link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    }
    
    // Create link element if it doesn't exist
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.id = "app-favicon";
      document.head.appendChild(link);
    }
    
    // Set the favicon URL and appropriate type
    link.href = url;
    link.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  }, [faviconUrl]);
}

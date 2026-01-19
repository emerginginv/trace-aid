import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/contexts/TenantContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { GlobalLoadingProvider } from "@/contexts/GlobalLoadingContext";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { FaviconProvider } from "@/components/FaviconProvider";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ProviderVerification } from "./ProviderVerification";
import { TenantGuard } from "./TenantGuard";
/**
 * ROOT PROVIDER TREE
 * ==================
 * All application-wide providers are mounted here, ONCE.
 * 
 * RULES:
 * 1. Providers are NEVER conditionally rendered
 * 2. Order matters: outer providers can be consumed by inner ones
 * 3. No component should wrap in these providers locally
 * 4. All providers must be imported and used ONLY in this file
 * 
 * PROVIDER ORDER (outer to inner):
 * 1. TenantProvider - Multi-tenant context
 * 2. QueryClientProvider - React Query
 * 3. GlobalLoadingProvider - Loading states
 * 4. ThemeProvider - Dark/light mode
 * 5. TooltipProvider - Radix tooltip context (REQUIRED for all Tooltip components)
 * 6. OrganizationProvider - Organization context
 * 7. BrowserRouter - React Router
 * 8. NavigationProvider - Navigation state
 * 9. ImpersonationProvider - Admin impersonation
 * 10. BreadcrumbProvider - Breadcrumb navigation
 * 11. FaviconProvider - Dynamic favicon
 * 
 * @see PROVIDER_ARCHITECTURE.md for detailed documentation
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <TenantProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalLoadingProvider>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange
          >
            {/*
              RADIX UI PROVIDER REQUIREMENTS:
              - TooltipProvider: Required at root for all Tooltip components.
                Mount once here; components should NOT wrap in TooltipProvider.
              - Dialog/AlertDialog/Popover: Per-instance Root, no global provider.
              - Toaster/Sonner: Contain their own providers internally.
            */}
            <TooltipProvider>
              <OrganizationProvider>
                <BrowserRouter>
                  <NavigationProvider>
                    <ImpersonationProvider>
                      <BreadcrumbProvider>
                        <FaviconProvider>
                          <TenantGuard>
                            <ProviderVerification>
                              {children}
                            </ProviderVerification>
                          </TenantGuard>
                        </FaviconProvider>
                      </BreadcrumbProvider>
                    </ImpersonationProvider>
                  </NavigationProvider>
                </BrowserRouter>
              </OrganizationProvider>
            </TooltipProvider>
          </ThemeProvider>
        </GlobalLoadingProvider>
      </QueryClientProvider>
    </TenantProvider>
  );
}

/**
 * List of all required root providers for verification
 */
export const REQUIRED_ROOT_PROVIDERS = [
  'TenantProvider',
  'QueryClientProvider',
  'GlobalLoadingProvider',
  'ThemeProvider',
  'TooltipProvider',
  'OrganizationProvider',
  'BrowserRouter',
  'NavigationProvider',
  'ImpersonationProvider',
  'BreadcrumbProvider',
  'FaviconProvider',
  'TenantGuard',
] as const;

export type RootProvider = typeof REQUIRED_ROOT_PROVIDERS[number];

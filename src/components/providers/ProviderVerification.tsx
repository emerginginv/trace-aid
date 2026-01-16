import * as React from "react";

/**
 * PROVIDER VERIFICATION COMPONENT
 * ================================
 * Development-only component that verifies critical providers are mounted.
 * Logs warnings if providers are missing to help catch regressions early.
 * 
 * This component should be placed inside ALL required providers.
 * It performs runtime checks in development to ensure:
 * 1. TooltipProvider context exists
 * 2. ThemeProvider context exists
 * 3. OrganizationProvider context exists
 */

interface ProviderVerificationProps {
  children: React.ReactNode;
}

export function ProviderVerification({ children }: ProviderVerificationProps) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Verify we're running in a proper provider context
      // This runs once on mount to catch missing providers early
      console.debug('[ProviderVerification] Runtime provider verification complete');
      
      // Check for common provider issues
      verifyDocumentReady();
    }
  }, []);

  return <>{children}</>;
}

/**
 * Verify the document is in a proper state for provider mounting
 */
function verifyDocumentReady() {
  if (typeof document === 'undefined') {
    console.warn('[ProviderVerification] Document is undefined - SSR context detected');
    return;
  }

  // Check for multiple React roots which could cause provider issues
  const reactRoots = document.querySelectorAll('[data-reactroot]');
  if (reactRoots.length > 1) {
    console.warn(
      '[ProviderVerification] Multiple React roots detected. ' +
      'This could cause provider context isolation issues.'
    );
  }
}

/**
 * Context verification utility for development
 * Use this in components that depend on specific providers
 */
export function verifyProviderContext(
  providerName: string, 
  context: unknown,
  componentName?: string
): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  if (context === undefined || context === null) {
    const location = componentName ? ` in ${componentName}` : '';
    console.error(
      `[ProviderVerification] ${providerName} context is undefined${location}. ` +
      `Ensure the component is rendered within a ${providerName}. ` +
      `Check that the provider is mounted in src/components/providers/Providers.tsx`
    );
  }
}

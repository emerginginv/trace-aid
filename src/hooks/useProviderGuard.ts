import { useEffect } from "react";

/**
 * USE PROVIDER GUARD HOOK
 * =======================
 * A development-only hook for components that depend on specific contexts.
 * Logs helpful error messages when a required provider is missing.
 * 
 * USAGE:
 * ```tsx
 * const MyComponent = () => {
 *   const themeContext = useTheme();
 *   useProviderGuard('ThemeProvider', themeContext, 'MyComponent');
 *   // ...
 * };
 * ```
 * 
 * This hook is a no-op in production builds.
 */

export function useProviderGuard(
  providerName: string, 
  context: unknown,
  componentName?: string
): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    if (context === undefined || context === null) {
      const location = componentName ? ` in ${componentName}` : '';
      console.error(
        `[ProviderGuard] ${providerName} context is undefined${location}. ` +
        `Ensure the component is rendered within a ${providerName}. ` +
        `Check that the provider is mounted in src/components/providers/Providers.tsx`
      );
    }
  }, [providerName, context, componentName]);
}

/**
 * Validates that all required providers are available
 * Use at app root to catch issues early
 */
export function useProviderValidation(providers: Record<string, unknown>): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const missingProviders = Object.entries(providers)
      .filter(([, context]) => context === undefined || context === null)
      .map(([name]) => name);

    if (missingProviders.length > 0) {
      console.error(
        `[ProviderValidation] Missing providers: ${missingProviders.join(', ')}. ` +
        'Check src/components/providers/Providers.tsx'
      );
    }
  }, [providers]);
}

/**
 * Type guard to check if a context value is defined
 */
export function isContextDefined<T>(context: T | undefined | null): context is T {
  return context !== undefined && context !== null;
}

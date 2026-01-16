import * as React from "react";

/**
 * RADIX ERROR BOUNDARY
 * ====================
 * Specialized error boundary for Radix UI components.
 * Catches "must be used within Provider" errors and provides
 * graceful fallback instead of crashing the entire app.
 * 
 * USE CASES:
 * - Wrap critical UI elements that use Radix primitives
 * - Protect navigation elements (sidebar, header)
 * - Safeguard modal/dialog triggers
 */

interface RadixErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
  onError?: (error: Error) => void;
}

interface RadixErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RadixErrorBoundary extends React.Component<
  RadixErrorBoundaryProps,
  RadixErrorBoundaryState
> {
  constructor(props: RadixErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RadixErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { componentName, onError } = this.props;
    
    // Check if this is a Radix provider error
    const isProviderError = 
      error.message.includes('must be used within') ||
      error.message.includes('Provider') ||
      error.message.includes('useContext');

    if (isProviderError) {
      console.error(
        `[RadixErrorBoundary] Provider error caught${componentName ? ` in ${componentName}` : ''}:`,
        error.message
      );
      console.error(
        '[RadixErrorBoundary] This likely means a Radix component is rendered outside its required provider. ' +
        'Check that all providers are mounted in src/components/providers/Providers.tsx'
      );
    } else {
      console.error(
        `[RadixErrorBoundary] Error caught${componentName ? ` in ${componentName}` : ''}:`,
        error,
        errorInfo
      );
    }

    onError?.(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Return fallback or null to prevent blank screen
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      
      // Default: render nothing to prevent crash
      // In development, you'll see the console error
      return null;
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components that need error recovery
 */
export function useRadixErrorRecovery() {
  const [hasError, setHasError] = React.useState(false);

  const resetError = React.useCallback(() => {
    setHasError(false);
  }, []);

  const handleError = React.useCallback(() => {
    setHasError(true);
  }, []);

  return { hasError, resetError, handleError };
}

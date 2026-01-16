import * as React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/**
 * SAFE TOOLTIP COMPONENT
 * ======================
 * A defensive tooltip wrapper with built-in error boundary.
 * Use this for critical UI elements that must not crash the app
 * even if TooltipProvider is somehow missing.
 * 
 * WHEN TO USE:
 * - Navigation elements (sidebar, header)
 * - Critical action buttons
 * - Elements that render during app initialization
 * 
 * WHEN NOT TO USE:
 * - Regular tooltips in components that load after app init
 * - Tooltips inside modals/dialogs (providers are stable there)
 */

interface SafeTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  /**
   * What to do if tooltip fails to render:
   * - "show-children": Render children without tooltip (default)
   * - "hide": Render nothing
   */
  fallbackBehavior?: "show-children" | "hide";
  className?: string;
}

interface SafeTooltipState {
  hasError: boolean;
}

class TooltipErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void; fallback: React.ReactNode },
  SafeTooltipState
> {
  constructor(props: { children: React.ReactNode; onError: () => void; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SafeTooltipState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // Check if this is specifically a TooltipProvider error
    if (
      error.message.includes('TooltipProvider') ||
      error.message.includes('must be used within') ||
      error.message.includes('Tooltip')
    ) {
      console.error(
        '[SafeTooltip] TooltipProvider not found in component tree. ' +
        'Ensure TooltipProvider is mounted in src/components/providers/Providers.tsx'
      );
    }
    this.props.onError();
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function SafeTooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 300,
  fallbackBehavior = "show-children",
  className,
}: SafeTooltipProps) {
  const [hasError, setHasError] = React.useState(false);

  // If we've already caught an error, just render children
  if (hasError) {
    return fallbackBehavior === "hide" ? null : <>{children}</>;
  }

  const fallback = fallbackBehavior === "hide" ? null : <>{children}</>;

  return (
    <TooltipErrorBoundary 
      onError={() => setHasError(true)}
      fallback={fallback}
    >
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipErrorBoundary>
  );
}

/**
 * Type-safe props for SafeTooltip
 */
export type { SafeTooltipProps };

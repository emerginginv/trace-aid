import * as React from "react";
import { cn } from "@/lib/utils";
import { BrandedSpinner } from "./branded-spinner";

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  show: boolean;
  /** Optional message to display below the spinner */
  message?: string;
  /** Additional class names for customization */
  className?: string;
  /** Whether to use a transparent backdrop (for inline overlays) */
  transparent?: boolean;
  /** Size of the spinner */
  spinnerSize?: "sm" | "md" | "lg" | "xl";
}

/**
 * Full-screen loading overlay with branded spinner
 * Use for critical operations like form submissions, file uploads, etc.
 */
export function LoadingOverlay({
  show,
  message = "Loading...",
  className,
  transparent = false,
  spinnerSize = "lg",
}: LoadingOverlayProps) {
  const [visible, setVisible] = React.useState(false);
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    if (show) {
      setVisible(true);
      // Small delay to trigger fade-in animation
      requestAnimationFrame(() => {
        setAnimating(true);
      });
    } else {
      setAnimating(false);
      // Keep visible for fade-out animation
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={message}
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center",
        "transition-all duration-200 ease-out",
        transparent
          ? "bg-background/60 backdrop-blur-[2px]"
          : "bg-background/80 backdrop-blur-sm",
        animating ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 p-8 rounded-xl",
          "transition-transform duration-200 ease-out",
          animating ? "scale-100" : "scale-95"
        )}
      >
        <BrandedSpinner size={spinnerSize} variant="primary" />
        {message && (
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

interface InlineLoadingOverlayProps {
  /** Whether the overlay is visible */
  show: boolean;
  /** Optional message to display below the spinner */
  message?: string;
  /** Additional class names for customization */
  className?: string;
}

/**
 * Inline loading overlay for specific containers
 * Use for loading states within cards, modals, or sections
 */
export function InlineLoadingOverlay({
  show,
  message,
  className,
}: InlineLoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={message || "Loading"}
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center",
        "bg-background/70 backdrop-blur-[1px] rounded-inherit",
        "animate-fade-in",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <BrandedSpinner size="md" variant="primary" />
        {message && (
          <p className="text-xs font-medium text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

interface ButtonLoadingOverlayProps {
  /** Whether loading is active */
  loading: boolean;
  /** Children to render (typically the button content) */
  children: React.ReactNode;
  /** Loading text to show */
  loadingText?: string;
}

/**
 * Inline loading state for buttons
 * Replaces button content with spinner while loading
 */
export function ButtonLoadingContent({
  loading,
  children,
  loadingText = "Loading...",
}: ButtonLoadingOverlayProps) {
  if (loading) {
    return (
      <span className="flex items-center gap-2">
        <BrandedSpinner size="sm" variant="muted" />
        <span>{loadingText}</span>
      </span>
    );
  }
  return <>{children}</>;
}

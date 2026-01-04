import * as React from "react";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { cn } from "@/lib/utils";

export function GlobalLoadingIndicator() {
  const { isLoading } = useGlobalLoading();
  const [visible, setVisible] = React.useState(false);
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) {
      setVisible(true);
      // Small delay to trigger animation
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
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-busy={isLoading}
      aria-label="Loading content"
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] h-[3px] overflow-hidden",
        "transition-opacity duration-200",
        animating ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Background track */}
      <div className="absolute inset-0 bg-primary/20" />
      
      {/* Animated progress bar */}
      <div
        className={cn(
          "absolute inset-y-0 w-[40%]",
          "bg-gradient-to-r from-primary/50 via-primary to-primary/50",
          "global-progress-shimmer",
          // Respect reduced motion
          "motion-reduce:animate-none motion-reduce:w-full motion-reduce:opacity-70"
        )}
      />
      
      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-primary/30 blur-sm",
          "global-progress-glow"
        )}
      />
    </div>
  );
}

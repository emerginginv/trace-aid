import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, PartyPopper, Sparkles } from "lucide-react";

interface SuccessAnimationProps {
  show: boolean;
  variant?: "checkmark" | "celebrate" | "sparkle";
  size?: "sm" | "md" | "lg";
  message?: string;
  onComplete?: () => void;
  className?: string;
}

export function SuccessAnimation({
  show,
  variant = "checkmark",
  size = "md",
  message,
  onComplete,
  className,
}: SuccessAnimationProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  const sizes = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center z-50",
        "bg-background/80 backdrop-blur-sm",
        "animate-fade-in",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 animate-celebrate">
        {variant === "checkmark" && (
          <div
            className={cn(
              sizes[size],
              "rounded-full bg-success flex items-center justify-center",
              "shadow-success"
            )}
          >
            <Check className={cn(iconSizes[size], "text-success-foreground")} />
          </div>
        )}

        {variant === "celebrate" && (
          <div
            className={cn(
              sizes[size],
              "rounded-full bg-gradient-to-br from-primary to-secondary",
              "flex items-center justify-center shadow-primary"
            )}
          >
            <PartyPopper className={cn(iconSizes[size], "text-primary-foreground")} />
          </div>
        )}

        {variant === "sparkle" && (
          <div
            className={cn(
              sizes[size],
              "rounded-full bg-warning flex items-center justify-center",
              "shadow-warning"
            )}
          >
            <Sparkles className={cn(iconSizes[size], "text-warning-foreground")} />
          </div>
        )}

        {message && (
          <p className="text-lg font-semibold text-foreground animate-fade-in">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

interface SuccessCheckmarkProps {
  className?: string;
  size?: number;
}

export function SuccessCheckmark({ className, size = 48 }: SuccessCheckmarkProps) {
  return (
    <svg
      className={cn("text-success", className)}
      width={size}
      height={size}
      viewBox="0 0 52 52"
      aria-hidden="true"
    >
      <circle
        className="animate-celebrate fill-success"
        cx="26"
        cy="26"
        r="25"
      />
      <path
        className="animate-checkmark stroke-success-foreground"
        fill="none"
        strokeWidth="4"
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
      />
    </svg>
  );
}
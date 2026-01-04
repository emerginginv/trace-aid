import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  threshold?: number;
  showBar?: boolean;
  showButton?: boolean;
  barColor?: "primary" | "secondary" | "success" | "warning";
}

export function ScrollProgress({
  threshold = 200,
  showBar = false,
  showButton = true,
  barColor = "primary",
}: ScrollProgressProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      setScrollProgress(Math.min(progress, 100));
      setIsVisible(scrollTop > threshold);
    };

    calculateProgress();
    window.addEventListener("scroll", calculateProgress, { passive: true });
    window.addEventListener("resize", calculateProgress, { passive: true });

    return () => {
      window.removeEventListener("scroll", calculateProgress);
      window.removeEventListener("resize", calculateProgress);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // SVG circle properties - increased size for better visibility
  const size = 56;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;
  
  // Glow effect when near complete
  const isNearComplete = scrollProgress > 85;

  const barColorClasses = {
    primary: "bg-primary",
    secondary: "bg-secondary-500",
    success: "bg-success",
    warning: "bg-warning",
  };

  return (
    <>
      {/* Progress Bar at top of page */}
      {showBar && (
        <div
          className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/30"
          role="progressbar"
          aria-valuenow={Math.round(scrollProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Page scroll progress"
        >
          <div
            className={cn(
              "h-full transition-all duration-100 ease-out",
              barColorClasses[barColor]
            )}
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {/* Floating scroll-to-top button with progress ring */}
      {showButton && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 transition-all duration-300",
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {/* Button container with progress ring */}
          <Button
            variant="outline"
            size="icon"
            onClick={scrollToTop}
            className={cn(
              "h-14 w-14 rounded-full bg-background/95 shadow-lg border-border/60 hover:bg-muted relative overflow-visible",
              isNearComplete && "ring-2 ring-primary/40"
            )}
            aria-label={`Scroll to top - ${Math.round(scrollProgress)}% scrolled`}
          >
            {/* SVG Progress Ring */}
            <svg
              width={size}
              height={size}
              className="absolute inset-0 -rotate-90"
              style={{ filter: isNearComplete ? "drop-shadow(0 0 4px hsl(var(--primary) / 0.5))" : undefined }}
            >
              {/* Gradient definition */}
              <defs>
                <linearGradient id="scroll-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="50%" stopColor="hsl(var(--primary) / 0.85)" />
                  <stop offset="100%" stopColor="hsl(var(--secondary-500, var(--primary)))" />
                </linearGradient>
              </defs>
              
              {/* Background track circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.2)"
                strokeWidth={strokeWidth}
              />
              
              {/* Progress arc with gradient */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="url(#scroll-progress-gradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-150"
                style={{
                  filter: scrollProgress > 0 ? "drop-shadow(0 0 2px hsl(var(--primary) / 0.3))" : undefined
                }}
              />
            </svg>
            
            {/* Chevron icon centered */}
            <ChevronUp className="h-5 w-5 relative z-10" />
          </Button>
        </div>
      )}
    </>
  );
}

// Progress Ring Component for circular progress
interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: "primary" | "secondary" | "success" | "warning" | "destructive";
  showValue?: boolean;
  className?: string;
  label?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = "primary",
  showValue = true,
  className,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: "stroke-primary",
    secondary: "stroke-secondary-500",
    success: "stroke-success",
    warning: "stroke-warning",
    destructive: "stroke-destructive",
  };

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || `Progress: ${Math.round(percentage)}%`}
    >
      <svg width={size} height={size} className="progress-ring">
        <circle
          className="progress-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={cn("progress-ring-fill", colorClasses[color])}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showValue && (
        <span className="absolute text-xs font-medium number-display">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// Trend Indicator Component
interface TrendIndicatorProps {
  value: number;
  previousValue?: number;
  showValue?: boolean;
  suffix?: string;
  className?: string;
}

export function TrendIndicator({
  value,
  previousValue,
  showValue = true,
  suffix = "%",
  className,
}: TrendIndicatorProps) {
  const change =
    previousValue !== undefined
      ? ((value - previousValue) / previousValue) * 100
      : value;

  const isPositive = change > 0;
  const isNeutral = change === 0;

  const trendClass = isNeutral
    ? "trend-neutral"
    : isPositive
    ? "trend-up"
    : "trend-down";

  const arrow = isNeutral ? "→" : isPositive ? "↑" : "↓";

  return (
    <span className={cn(trendClass, className)}>
      <span aria-hidden="true">{arrow}</span>
      {showValue && (
        <span className="number-display">
          {isPositive && "+"}
          {change.toFixed(1)}
          {suffix}
        </span>
      )}
    </span>
  );
}
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
    let rafId: number | null = null;

    const calculateProgress = () => {
      if (rafId !== null) return; // Already scheduled
      
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

        setScrollProgress(Math.min(progress, 100));
        setIsVisible(scrollTop > threshold);
        rafId = null;
      });
    };

    calculateProgress();
    window.addEventListener("scroll", calculateProgress, { passive: true });
    window.addEventListener("resize", calculateProgress, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", calculateProgress);
      window.removeEventListener("resize", calculateProgress);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // SVG circle properties - progress arc thicker than track for visibility
  const size = 56;
  const trackStrokeWidth = 6;
  const progressStrokeWidth = 8;
  const radius = (size - progressStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;
  const outerSize = size + progressStrokeWidth;
  
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
          {/* Wrapper for proper positioning - SVG outside button */}
          <div className="relative" style={{ width: outerSize, height: outerSize }}>
            {/* SVG Progress Ring - positioned around the button */}
            <svg
              width={outerSize}
              height={outerSize}
              viewBox={`0 0 ${outerSize} ${outerSize}`}
              className="absolute inset-0 pointer-events-none"
              style={{ 
                transform: "rotate(-90deg)",
                transformOrigin: "center center",
                filter: isNearComplete ? "drop-shadow(0 0 4px hsl(var(--primary) / 0.5))" : undefined 
              }}
            >
              {/* Gradient definition - prominent darker blue */}
              <defs>
                <linearGradient id="scroll-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(220 100% 38%)" />
                  <stop offset="60%" stopColor="hsl(215 100% 48%)" />
                  <stop offset="100%" stopColor="hsl(210 100% 62%)" />
                </linearGradient>
              </defs>
              
              {/* Background track circle - lighter for contrast */}
              <circle
                cx={outerSize / 2}
                cy={outerSize / 2}
                r={radius}
                fill="none"
                stroke="hsl(210 60% 92% / 0.75)"
                strokeWidth={trackStrokeWidth}
              />
              
              {/* Progress arc with gradient - thicker than track */}
              <circle
                cx={outerSize / 2}
                cy={outerSize / 2}
                r={radius}
                fill="none"
                stroke="url(#scroll-progress-gradient)"
                strokeWidth={progressStrokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-200 ease-linear"
                style={{
                  willChange: "stroke-dashoffset",
                  filter: scrollProgress > 0 ? "drop-shadow(0 0 3px hsl(210 90% 55% / 0.4))" : undefined
                }}
              />
            </svg>
            
            {/* Button centered inside the wrapper */}
            <Button
              variant="outline"
              size="icon"
              onClick={scrollToTop}
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-background/95 shadow-lg border-border/60 hover:bg-muted",
                isNearComplete && "ring-2 ring-primary/40"
              )}
              aria-label={`Scroll to top - ${Math.round(scrollProgress)}% scrolled`}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
          </div>
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
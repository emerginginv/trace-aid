import * as React from "react";
import { cn } from "@/lib/utils";

interface BrandedSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "muted";
  label?: string;
  className?: string;
}

export function BrandedSpinner({
  size = "md",
  variant = "primary",
  label = "Loading",
  className,
}: BrandedSpinnerProps) {
  const sizes = {
    sm: { svg: 20, stroke: 2 },
    md: { svg: 32, stroke: 3 },
    lg: { svg: 48, stroke: 4 },
    xl: { svg: 64, stroke: 4 },
  };

  const colors = {
    primary: "stroke-primary",
    secondary: "stroke-secondary",
    muted: "stroke-muted-foreground",
  };

  const { svg, stroke } = sizes[size];
  const radius = (svg - stroke) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      role="status"
      aria-label={label}
    >
      <svg
        className="branded-spinner"
        width={svg}
        height={svg}
        viewBox={`0 0 ${svg} ${svg}`}
        fill="none"
      >
        {/* Background circle */}
        <circle
          cx={svg / 2}
          cy={svg / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/30"
        />
        {/* Animated circle */}
        <circle
          cx={svg / 2}
          cy={svg / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("branded-spinner-path", colors[variant])}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference * 0.75,
          }}
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  show,
  message = "Loading...",
  className,
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        "animate-fade-in",
        className
      )}
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <BrandedSpinner size="lg" />
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

interface InlineLoaderProps {
  size?: "sm" | "md";
  className?: string;
}

export function InlineLoader({ size = "sm", className }: InlineLoaderProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <BrandedSpinner size={size} variant="muted" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  );
}
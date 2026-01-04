import * as React from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  onStepClick?: (stepIndex: number) => void;
  loadingStep?: number;
  className?: string;
}

export function ProgressSteps({ 
  steps, 
  currentStep, 
  orientation = "horizontal",
  size = "md",
  showLabels = true,
  onStepClick,
  loadingStep,
  className 
}: ProgressStepsProps) {
  const isClickable = !!onStepClick;

  const sizes = {
    sm: { circle: "h-8 w-8", icon: "w-4 h-4", text: "text-xs" },
    md: { circle: "h-10 w-10", icon: "w-5 h-5", text: "text-sm" },
    lg: { circle: "h-12 w-12", icon: "w-6 h-6", text: "text-base" },
  };

  const sizeConfig = sizes[size];

  return (
    <nav 
      aria-label="Progress" 
      className={cn(
        orientation === "vertical" ? "flex flex-col" : "flex items-center w-full",
        className
      )}
    >
      <ol className={cn(
        "flex",
        orientation === "vertical" ? "flex-col gap-4" : "items-center w-full"
      )}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          const isLoading = loadingStep === index;
          const canClick = isClickable && (isCompleted || isCurrent);

          return (
            <li
              key={step.id}
              className={cn(
                orientation === "vertical" 
                  ? "relative" 
                  : "flex-1 flex items-center",
                index < steps.length - 1 && orientation === "horizontal" && "flex items-center"
              )}
            >
              <div className={cn(
                "flex",
                orientation === "vertical" ? "items-start gap-4" : "flex-col items-center w-full"
              )}>
                <div className={cn(
                  "flex items-center",
                  orientation === "horizontal" && "w-full"
                )}>
                  <button
                    type="button"
                    onClick={() => canClick && onStepClick?.(index)}
                    disabled={!canClick}
                    className={cn(
                      sizeConfig.circle,
                      "relative flex items-center justify-center rounded-full border-2",
                      "transition-all duration-300 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isCompleted && "bg-primary border-primary text-primary-foreground",
                      isCurrent && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                      isUpcoming && "border-muted bg-background text-muted-foreground",
                      canClick && "cursor-pointer hover:scale-105",
                      !canClick && "cursor-default"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Step ${index + 1}: ${step.label}${isCompleted ? " (completed)" : ""}${isCurrent ? " (current)" : ""}`}
                  >
                    {isLoading ? (
                      <Loader2 
                        className={cn(sizeConfig.icon, "animate-spin")} 
                        aria-hidden="true" 
                      />
                    ) : isCompleted ? (
                      <Check className={sizeConfig.icon} aria-hidden="true" />
                    ) : isCurrent ? (
                      <Circle className={cn(sizeConfig.icon, "fill-current")} aria-hidden="true" />
                    ) : (
                      <span className={cn(sizeConfig.text, "font-semibold")}>{index + 1}</span>
                    )}
                  </button>

                  {/* Connector line */}
                  {index < steps.length - 1 && orientation === "horizontal" && (
                    <div className="flex-1 mx-3">
                      <div
                        className={cn(
                          "h-0.5 transition-all duration-500 ease-out",
                          isCompleted ? "bg-primary" : "bg-muted"
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>

                {/* Labels */}
                {showLabels && (
                  <div className={cn(
                    orientation === "vertical" ? "flex-1" : "mt-2 text-center",
                    "min-w-0"
                  )}>
                    <div
                      className={cn(
                        sizeConfig.text,
                        "font-medium transition-colors",
                        isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                      {step.optional && (
                        <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
                      )}
                    </div>
                    {step.description && (
                      <div className={cn(
                        "text-muted-foreground mt-0.5",
                        size === "sm" ? "text-xs" : "text-xs"
                      )}>
                        {step.description}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vertical connector */}
              {index < steps.length - 1 && orientation === "vertical" && (
                <div
                  className={cn(
                    "absolute left-[1.1875rem] top-10 w-0.5 h-full -translate-x-1/2",
                    "transition-colors duration-500",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Simple progress bar variant
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  size = "md",
  variant = "default",
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const colors = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {showValue && <span className="text-sm text-muted-foreground">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-muted overflow-hidden",
          heights[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || "Progress"}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            colors[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

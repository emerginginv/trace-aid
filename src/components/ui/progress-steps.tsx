import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <li
              key={step.id}
              className={cn("flex-1", {
                "flex items-center": index < steps.length - 1,
              })}
            >
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center w-full">
                  <div className="relative flex items-center justify-center">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                        {
                          "bg-primary border-primary text-primary-foreground": isCompleted || isCurrent,
                          "border-muted bg-background text-muted-foreground": isUpcoming,
                        }
                      )}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-2">
                      <div
                        className={cn(
                          "h-0.5 transition-colors duration-200",
                          isCompleted ? "bg-primary" : "bg-muted"
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-2 text-center">
                  <div
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

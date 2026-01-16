import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  label: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Client Information" },
  { number: 2, label: "Case Details" },
  { number: 3, label: "Subject Information" },
  { number: 4, label: "Subject Summary" },
  { number: 5, label: "Supporting Files" },
  { number: 6, label: "Case Summary" },
];

interface CaseRequestProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function CaseRequestProgress({ currentStep, onStepClick }: CaseRequestProgressProps) {
  return (
    <div className="bg-card border-b overflow-x-auto">
      <div className="container mx-auto px-4">
        <nav className="flex" aria-label="Progress">
          {STEPS.map((step, index) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const isClickable = onStepClick && step.number <= currentStep;

            return (
              <div
                key={step.number}
                className={cn(
                  "flex items-center flex-1 min-w-0",
                  index < STEPS.length - 1 && "relative"
                )}
              >
                <button
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 w-full transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
                    isCurrent && "bg-primary text-primary-foreground",
                    isCompleted && "bg-muted text-muted-foreground hover:bg-muted/80",
                    !isCurrent && !isCompleted && "text-muted-foreground/50",
                    isClickable && "cursor-pointer"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      isCurrent && "bg-primary-foreground text-primary",
                      isCompleted && "bg-primary text-primary-foreground",
                      !isCurrent && !isCompleted && "border-2 border-current"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      step.number
                    )}
                  </span>
                  <span className="hidden sm:block text-sm font-medium truncate">
                    {step.label}
                  </span>
                </button>

                {/* Chevron separator */}
                {index < STEPS.length - 1 && (
                  <ChevronRight
                    className={cn(
                      "flex-shrink-0 h-5 w-5",
                      isCompleted || isCurrent
                        ? "text-muted-foreground"
                        : "text-muted-foreground/30"
                    )}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

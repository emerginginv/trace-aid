import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardStep } from "./hooks/useCaseWizard";

interface StepInfo {
  step: WizardStep;
  label: string;
  optional: boolean;
}

const STEPS: StepInfo[] = [
  { step: 1, label: "New Case", optional: false },
  { step: 2, label: "Services", optional: true },
  { step: 3, label: "Subjects", optional: true },
  { step: 4, label: "Updates", optional: true },
  { step: 5, label: "Events", optional: true },
  { step: 6, label: "Attachments", optional: true },
  { step: 7, label: "Review", optional: false },
];

interface WizardProgressProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  canNavigate?: boolean;
}

export function WizardProgress({ currentStep, onStepClick, canNavigate = false }: WizardProgressProps) {
  const currentStepInfo = STEPS.find(s => s.step === currentStep);

  return (
    <div className="w-full">
      {/* Step indicator text */}
      <div className="mb-4 text-center">
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of 7
          {currentStepInfo?.optional && " (Optional)"}
        </p>
        <h2 className="text-lg font-semibold mt-1">{currentStepInfo?.label}</h2>
      </div>

      {/* Progress bar */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((stepInfo, index) => {
          const isCompleted = stepInfo.step < currentStep;
          const isCurrent = stepInfo.step === currentStep;
          const isClickable = canNavigate && stepInfo.step <= currentStep;

          return (
            <div key={stepInfo.step} className="flex-1 flex items-center">
              {/* Step circle */}
              <button
                onClick={() => isClickable && onStepClick?.(stepInfo.step)}
                disabled={!isClickable}
                className={cn(
                  "relative flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs sm:text-sm font-medium transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-background text-primary",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 bg-background text-muted-foreground/50",
                  isClickable && "cursor-pointer hover:bg-primary/10"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  stepInfo.step
                )}
              </button>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 sm:mx-2",
                    stepInfo.step < currentStep ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels (hidden on mobile) */}
      <div className="hidden md:flex items-center justify-between mt-2">
        {STEPS.map(stepInfo => (
          <div
            key={stepInfo.step}
            className={cn(
              "text-xs text-center flex-1",
              stepInfo.step === currentStep ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {stepInfo.label}
          </div>
        ))}
      </div>
    </div>
  );
}

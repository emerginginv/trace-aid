import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { WizardStep } from "./hooks/useCaseWizard";

interface WizardNavigationProps {
  currentStep: WizardStep;
  onBack: () => void;
  onContinue: () => void;
  onApprove?: () => void;
  onCancel?: () => void;
  canContinue?: boolean;
  isSubmitting?: boolean;
  continueLabel?: string;
}

export function WizardNavigation({
  currentStep,
  onBack,
  onContinue,
  onApprove,
  onCancel,
  canContinue = true,
  isSubmitting = false,
  continueLabel,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === 7;

  if (isLastStep) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel Draft
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Edit
          </Button>

          <Button
            onClick={onApprove}
            disabled={isSubmitting}
            className="min-w-[180px]"
          >
            {isSubmitting ? (
              "Creating..."
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Approve & Create Case
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between pt-6 border-t">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        className={isFirstStep ? "invisible" : ""}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Button
        onClick={onContinue}
        disabled={!canContinue || isSubmitting}
      >
        {isSubmitting ? "Saving..." : (continueLabel || "Continue")}
        {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>
    </div>
  );
}

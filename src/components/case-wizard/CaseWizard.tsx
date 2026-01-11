import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { WizardProgress } from "./WizardProgress";
import { useCaseWizard } from "./hooks/useCaseWizard";
import { Step1NewCase } from "./steps/Step1NewCase";
import { Step2Subjects } from "./steps/Step2Subjects";
import { Step3Updates } from "./steps/Step3Updates";
import { Step4Events } from "./steps/Step4Events";
import { Step5Attachments } from "./steps/Step5Attachments";
import { Step6Summary } from "./steps/Step6Summary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export function CaseWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { organization } = useOrganization();
  const organizationId = organization?.id || null;

  const {
    state,
    goNext,
    goBack,
    setDraftCase,
    updateCounts,
    approveDraft,
    cancelDraft,
  } = useCaseWizard(organizationId);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Handle browser back/navigation warning
  useEffect(() => {
    if (state.draftCaseId) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [state.draftCaseId]);

  const handleExit = () => {
    if (state.draftCaseId) {
      setShowExitDialog(true);
    } else {
      navigate("/cases");
    }
  };

  const handleConfirmExit = async () => {
    // Leave draft as-is for later resumption
    setShowExitDialog(false);
    navigate("/cases");
  };

  const handleApprove = async () => {
    const success = await approveDraft();
    if (success && state.draftCaseId) {
      navigate(`/cases/${state.draftCaseId}`);
    }
  };

  const handleCancelDraft = async () => {
    const success = await cancelDraft();
    if (success) {
      navigate("/cases");
    }
    setShowCancelDialog(false);
  };

  if (!organizationId) {
    return (
      <div className="container max-w-3xl py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading organization...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <Step1NewCase
            organizationId={organizationId}
            onComplete={(caseId, caseNumber, caseData) => {
              setDraftCase(caseId, caseNumber, caseData);
              goNext();
            }}
            existingData={state.caseData}
          />
        );
      case 2:
        return (
          <Step2Subjects
            caseId={state.draftCaseId!}
            organizationId={organizationId}
            onBack={goBack}
            onContinue={(count) => {
              updateCounts({ subjects: count });
              goNext();
            }}
          />
        );
      case 3:
        return (
          <Step3Updates
            caseId={state.draftCaseId!}
            organizationId={organizationId}
            onBack={goBack}
            onContinue={(count) => {
              updateCounts({ updates: count });
              goNext();
            }}
          />
        );
      case 4:
        return (
          <Step4Events
            caseId={state.draftCaseId!}
            organizationId={organizationId}
            onBack={goBack}
            onContinue={(count) => {
              updateCounts({ events: count });
              goNext();
            }}
          />
        );
      case 5:
        return (
          <Step5Attachments
            caseId={state.draftCaseId!}
            organizationId={organizationId}
            onBack={goBack}
            onContinue={(count) => {
              updateCounts({ attachments: count });
              goNext();
            }}
          />
        );
      case 6:
        return (
          <Step6Summary
            caseId={state.draftCaseId!}
            caseNumber={state.draftCaseNumber!}
            caseData={state.caseData!}
            subjectsCount={state.subjectsCount}
            updatesCount={state.updatesCount}
            eventsCount={state.eventsCount}
            attachmentsCount={state.attachmentsCount}
            onBack={goBack}
            onApprove={handleApprove}
            onCancel={() => setShowCancelDialog(true)}
            isSubmitting={state.isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-3xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
        <h1 className="text-2xl font-bold">New Case</h1>
        <p className="text-muted-foreground">
          Create a new investigation case step by step
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <WizardProgress
          currentStep={state.currentStep}
          canNavigate={state.currentStep > 1}
        />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave case creation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your draft case has been saved. You can resume it later from the Cases page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel draft confirmation */}
      <ConfirmationDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Delete Draft Case?"
        description="This will permanently delete this draft case and all associated data including subjects, updates, events, and attachments."
        confirmLabel="Delete Draft"
        onConfirm={handleCancelDraft}
        variant="destructive"
      />
    </div>
  );
}

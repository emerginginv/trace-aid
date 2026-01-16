import { useState } from "react";
import { useCaseRequestForm, createEmptySubject, SubjectData } from "@/hooks/useCaseRequestForm";
import { CaseRequestForm } from "@/hooks/queries/useCaseRequestFormBySlug";
import { CaseRequestProgress } from "./CaseRequestProgress";
import { ClientInformationStep } from "./steps/ClientInformationStep";
import { CaseDetailsStep } from "./steps/CaseDetailsStep";
import { SubjectInformationStep } from "./steps/SubjectInformationStep";
import { SubjectSummaryStep } from "./steps/SubjectSummaryStep";
import { SupportingFilesStep } from "./steps/SupportingFilesStep";
import { CaseSummaryStep } from "./steps/CaseSummaryStep";
import { CaseRequestSuccess } from "./CaseRequestSuccess";
import { submitCaseRequest } from "@/services/caseRequestService";
import { sendCaseRequestNotifications } from "@/services/caseRequestNotifications";
import { toast } from "sonner";

interface CaseRequestWizardProps {
  form: CaseRequestForm;
}

export function CaseRequestWizard({ form }: CaseRequestWizardProps) {
  const {
    state,
    goToStep,
    goNext,
    goBack,
    setRequestId,
    updateStep1,
    updateStep2,
    addSubject,
    updateSubject,
    removeSubject,
    addFiles,
    updateFile,
    removeFile,
    clearForm,
    INITIAL_STEP1_DATA,
    INITIAL_STEP2_DATA,
  } = useCaseRequestForm(form.form_slug || form.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubjectTypeId, setNewSubjectTypeId] = useState<string | null>(null);

  const handleStep1Submit = async (data: typeof INITIAL_STEP1_DATA) => {
    updateStep1(data);
    goNext();
  };

  const handleStep2Submit = async (data: typeof INITIAL_STEP2_DATA) => {
    updateStep2(data);
    
    // Check if we need to add a primary subject
    if (state.formData.subjects.length === 0) {
      const primarySubject = createEmptySubject(true);
      addSubject(primarySubject);
    }
    
    goNext();
  };

  const handleSubjectSubmit = (data: SubjectData) => {
    if (editingSubjectId) {
      updateSubject(editingSubjectId, data);
      setEditingSubjectId(null);
    } else {
      // Check if this is updating an existing primary subject
      const existingPrimary = state.formData.subjects.find(s => s.is_primary);
      if (existingPrimary && data.is_primary) {
        updateSubject(existingPrimary.id, data);
      } else {
        addSubject(data);
      }
    }
    goNext();
  };

  const handleEditSubject = (id: string) => {
    setEditingSubjectId(id);
    goToStep(3);
  };

const handleAddSubject = () => {
    setNewSubjectTypeId(null);
    setEditingSubjectId(null);
    goToStep(3);
  };

  const handleAddSubjectOfType = (typeId: string) => {
    setNewSubjectTypeId(typeId);
    setEditingSubjectId(null);
    goToStep(3);
  };

  const getContactName = () => {
    const step1 = state.formData.step1;
    if (!step1) return '';
    const parts = [step1.submitted_contact_first_name, step1.submitted_contact_last_name].filter(Boolean);
    return parts.join(' ') || step1.submitted_client_name || '';
  };

  const handleFinalSubmit = async () => {
    if (!state.formData.step1 || !state.formData.step2) {
      toast.error('Please complete all required steps');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit the case request using the service
      const result = await submitCaseRequest({
        organizationId: form.organization_id,
        formId: form.id,
        clientInfo: state.formData.step1,
        caseDetails: state.formData.step2,
        subjects: state.formData.subjects,
        files: state.formData.files.map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          status: f.status,
          progress: f.progress,
          storagePath: f.storage_path,
          error: f.error,
        })),
        userAgent: navigator.userAgent,
      });

      if (!result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      // Send notifications (non-blocking)
      sendCaseRequestNotifications({
        requestId: result.requestId!,
        requestNumber: result.requestNumber || 'N/A',
        formSettings: {
          sendConfirmationEmail: form.send_confirmation_email ?? true,
          confirmationEmailSubject: form.confirmation_email_subject || undefined,
          confirmationEmailBody: form.confirmation_email_body || undefined,
          notifyStaffOnSubmission: form.notify_staff_on_submission ?? true,
          staffNotificationEmails: form.staff_notification_emails || undefined,
        },
        submitterInfo: {
          email: state.formData.step1.submitted_contact_email,
          name: getContactName(),
          companyName: state.formData.step1.submitted_client_name,
        },
      }).catch(err => console.error('Notification error:', err));

      setRequestId(result.requestId!);
      setSubmittedRequestNumber(result.requestNumber || null);
      setIsComplete(true);
      clearForm();
      
      toast.success('Case request submitted successfully!');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit case request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStep = (step: number) => {
    goToStep(step);
  };

  const handleSubmitAnother = () => {
    setIsComplete(false);
    setSubmittedRequestNumber(null);
    goToStep(1);
  };

  // Show success screen
  if (isComplete && submittedRequestNumber) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <CaseRequestSuccess
          requestNumber={submittedRequestNumber}
          successMessage={form.success_message || undefined}
          contactEmail={state.formData.step1?.submitted_contact_email}
          onSubmitAnother={handleSubmitAnother}
        />
      </div>
    );
  }


const caseTypeId = state.formData.step1?.case_type_id || '';

  const currentSubject = editingSubjectId
    ? state.formData.subjects.find(s => s.id === editingSubjectId)
    : newSubjectTypeId 
      ? createEmptySubject(state.formData.subjects.length === 0, newSubjectTypeId)
      : state.formData.subjects.find(s => s.is_primary) || null;

  return (
    <div className="min-h-screen bg-background">
      <CaseRequestProgress
        currentStep={state.currentStep}
        onStepClick={goToStep}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {state.currentStep === 1 && (
          <ClientInformationStep
            fieldConfig={form.field_config}
            organizationId={form.organization_id}
            initialData={state.formData.step1 || INITIAL_STEP1_DATA}
            onSubmit={handleStep1Submit}
          />
        )}

        {state.currentStep === 2 && state.formData.step1 && (
          <CaseDetailsStep
            fieldConfig={form.field_config}
            organizationId={form.organization_id}
            step1Data={state.formData.step1}
            initialData={state.formData.step2 || INITIAL_STEP2_DATA}
            onSubmit={handleStep2Submit}
            onBack={goBack}
          />
        )}

        {state.currentStep === 3 && (
          <SubjectInformationStep
            fieldConfig={form.field_config}
            organizationId={form.organization_id}
            caseTypeId={caseTypeId}
            subject={currentSubject}
            subjectTypeId={newSubjectTypeId}
            onSubmit={handleSubjectSubmit}
            onBack={goBack}
            isEditing={!!editingSubjectId}
          />
        )}

        {state.currentStep === 4 && (
          <SubjectSummaryStep
            fieldConfig={form.field_config}
            organizationId={form.organization_id}
            caseTypeId={caseTypeId}
            subjects={state.formData.subjects}
            onEditSubject={handleEditSubject}
            onRemoveSubject={removeSubject}
            onAddSubject={handleAddSubject}
            onAddSubjectOfType={handleAddSubjectOfType}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {state.currentStep === 5 && (
          <SupportingFilesStep
            fieldConfig={form.field_config}
            files={state.formData.files}
            requestId={state.requestId}
            organizationId={form.organization_id}
            onAddFiles={addFiles}
            onUpdateFile={updateFile}
            onRemoveFile={removeFile}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        )}

        {state.currentStep === 6 && state.formData.step1 && state.formData.step2 && (
          <CaseSummaryStep
            fieldConfig={form.field_config}
            organizationId={form.organization_id}
            step1Data={state.formData.step1}
            step2Data={state.formData.step2}
            subjects={state.formData.subjects}
            files={state.formData.files}
            isSubmitting={isSubmitting}
            onSubmit={handleFinalSubmit}
            onBack={goBack}
            onEditStep={handleEditStep}
          />
        )}
      </div>
    </div>
  );
}

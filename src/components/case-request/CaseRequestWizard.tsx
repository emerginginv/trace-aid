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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

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
    const newSubject = createEmptySubject(false);
    setEditingSubjectId(null);
    // We'll handle adding in handleSubjectSubmit
    goToStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!state.formData.step1 || !state.formData.step2) {
      toast.error('Please complete all required steps');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the case request
      const { data: caseRequest, error: requestError } = await supabase
        .from('case_requests')
        .insert({
          organization_id: form.organization_id,
          source_form_id: form.id,
          case_type_id: state.formData.step1.case_type_id,
          submitted_client_name: state.formData.step1.submitted_client_name,
          submitted_client_country: state.formData.step1.submitted_client_country,
          submitted_client_address1: state.formData.step1.submitted_client_address1,
          submitted_client_address2: state.formData.step1.submitted_client_address2,
          submitted_client_address3: state.formData.step1.submitted_client_address3,
          submitted_client_city: state.formData.step1.submitted_client_city,
          submitted_client_state: state.formData.step1.submitted_client_state,
          submitted_client_zip: state.formData.step1.submitted_client_zip,
          submitted_contact_first_name: state.formData.step1.submitted_contact_first_name,
          submitted_contact_middle_name: state.formData.step1.submitted_contact_middle_name,
          submitted_contact_last_name: state.formData.step1.submitted_contact_last_name,
          submitted_contact_email: state.formData.step1.submitted_contact_email,
          submitted_contact_office_phone: state.formData.step1.submitted_contact_office_phone,
          submitted_contact_mobile_phone: state.formData.step1.submitted_contact_mobile_phone,
          submitted_contact_mobile_carrier: state.formData.step1.submitted_contact_mobile_carrier,
          submitted_contact_home_phone: state.formData.step1.submitted_contact_home_phone,
          case_services: state.formData.step2.case_services,
          claim_number: state.formData.step2.claim_number,
          budget_dollars: state.formData.step2.budget_dollars,
          budget_hours: state.formData.step2.budget_hours,
          notes_instructions: state.formData.step2.notes_instructions,
          custom_fields: state.formData.step2.custom_fields,
          status: 'pending',
        })
        .select('id, request_number')
        .single();

      if (requestError) throw requestError;

      // Create subjects
      if (state.formData.subjects.length > 0) {
        const subjectsToInsert = state.formData.subjects.map(subject => ({
          case_request_id: caseRequest.id,
          subject_type_id: subject.subject_type_id,
          is_primary: subject.is_primary,
          first_name: subject.first_name,
          middle_name: subject.middle_name,
          last_name: subject.last_name,
          country: subject.country,
          address1: subject.address1,
          address2: subject.address2,
          address3: subject.address3,
          city: subject.city,
          state: subject.state,
          zip: subject.zip,
          cell_phone: subject.cell_phone,
          alias: subject.alias,
          date_of_birth: subject.date_of_birth || null,
          age: subject.age,
          height: subject.height,
          weight: subject.weight,
          race: subject.race,
          sex: subject.sex,
          ssn: subject.ssn,
          email: subject.email,
          photo_url: subject.photo_url,
          custom_fields: subject.custom_fields,
        }));

        const { error: subjectsError } = await supabase
          .from('case_request_subjects')
          .insert(subjectsToInsert);

        if (subjectsError) throw subjectsError;
      }

      // Create file records
      const uploadedFiles = state.formData.files.filter(f => f.status === 'uploaded' && f.storage_path);
      if (uploadedFiles.length > 0) {
        const filesToInsert = uploadedFiles.map(file => ({
          case_request_id: caseRequest.id,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: file.storage_path!,
        }));

        const { error: filesError } = await supabase
          .from('case_request_files')
          .insert(filesToInsert);

        if (filesError) throw filesError;
      }

      setRequestId(caseRequest.id);
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

  // Show success screen
  if (isComplete) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-6" />
            <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              {form.success_message || 'Thank you for your submission. We will review your request and get back to you shortly.'}
            </p>
            <Button onClick={() => {
              setIsComplete(false);
              goToStep(1);
            }}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSubject = editingSubjectId
    ? state.formData.subjects.find(s => s.id === editingSubjectId)
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
            subject={currentSubject}
            onSubmit={handleSubjectSubmit}
            onBack={goBack}
            isEditing={!!editingSubjectId}
          />
        )}

        {state.currentStep === 4 && (
          <SubjectSummaryStep
            fieldConfig={form.field_config}
            subjects={state.formData.subjects}
            onEditSubject={handleEditSubject}
            onRemoveSubject={removeSubject}
            onAddSubject={handleAddSubject}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {state.currentStep === 5 && (
          <SupportingFilesStep
            fieldConfig={form.field_config}
            files={state.formData.files}
            requestId={state.requestId}
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
            organizationId={form.organization_id}
            step1Data={state.formData.step1}
            step2Data={state.formData.step2}
            subjects={state.formData.subjects}
            files={state.formData.files}
            isSubmitting={isSubmitting}
            onSubmit={handleFinalSubmit}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  );
}

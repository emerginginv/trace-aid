import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface CaseFormData {
  account_id: string;
  contact_id: string;
  status: string;
  title: string;
  case_number: string;
  description: string;
  due_date: Date | null;
  case_manager_id: string | null;
  case_manager_2_id: string | null;
  investigator_ids: string[];
  reference_number: string | null;
}

export interface WizardState {
  currentStep: WizardStep;
  draftCaseId: string | null;
  draftCaseNumber: string | null;
  organizationId: string | null;
  caseData: CaseFormData | null;
  subjectsCount: number;
  updatesCount: number;
  eventsCount: number;
  attachmentsCount: number;
  isSubmitting: boolean;
}

const initialState: WizardState = {
  currentStep: 1,
  draftCaseId: null,
  draftCaseNumber: null,
  organizationId: null,
  caseData: null,
  subjectsCount: 0,
  updatesCount: 0,
  eventsCount: 0,
  attachmentsCount: 0,
  isSubmitting: false,
};

export function useCaseWizard(organizationId: string | null) {
  const [state, setState] = useState<WizardState>({
    ...initialState,
    organizationId,
  });

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const goNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 6) as WizardStep,
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1) as WizardStep,
    }));
  }, []);

  const setDraftCase = useCallback((caseId: string, caseNumber: string, caseData: CaseFormData) => {
    setState(prev => ({
      ...prev,
      draftCaseId: caseId,
      draftCaseNumber: caseNumber,
      caseData,
    }));
  }, []);

  const updateCounts = useCallback((counts: {
    subjects?: number;
    updates?: number;
    events?: number;
    attachments?: number;
  }) => {
    setState(prev => ({
      ...prev,
      subjectsCount: counts.subjects ?? prev.subjectsCount,
      updatesCount: counts.updates ?? prev.updatesCount,
      eventsCount: counts.events ?? prev.eventsCount,
      attachmentsCount: counts.attachments ?? prev.attachmentsCount,
    }));
  }, []);

  const incrementCount = useCallback((type: 'subjects' | 'updates' | 'events' | 'attachments', amount = 1) => {
    setState(prev => ({
      ...prev,
      [`${type}Count`]: (prev as any)[`${type}Count`] + amount,
    }));
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState(prev => ({ ...prev, isSubmitting }));
  }, []);

  const approveDraft = useCallback(async (): Promise<boolean> => {
    if (!state.draftCaseId) return false;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update case to finalize it
      const { error } = await supabase
        .from("cases")
        .update({
          is_draft: false,
          status: "New",
          draft_approved_at: new Date().toISOString(),
          draft_approved_by: user.id,
        })
        .eq("id", state.draftCaseId);

      if (error) throw error;

      // Create audit event
      await supabase.from("audit_events").insert({
        organization_id: state.organizationId,
        actor_user_id: user.id,
        action: "case_created_and_approved",
        metadata: {
          case_id: state.draftCaseId,
          case_number: state.draftCaseNumber,
        },
      });

      toast.success("Case created successfully");
      return true;
    } catch (error) {
      console.error("Error approving draft:", error);
      toast.error("Failed to create case");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [state.draftCaseId, state.draftCaseNumber, state.organizationId, setSubmitting]);

  const cancelDraft = useCallback(async (): Promise<boolean> => {
    if (!state.draftCaseId) return true;

    setSubmitting(true);
    try {
      // Delete the draft case (cascades to related data)
      const { error } = await supabase
        .from("cases")
        .delete()
        .eq("id", state.draftCaseId);

      if (error) throw error;

      toast.success("Draft deleted");
      return true;
    } catch (error) {
      console.error("Error canceling draft:", error);
      toast.error("Failed to delete draft");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [state.draftCaseId, setSubmitting]);

  const reset = useCallback(() => {
    setState({ ...initialState, organizationId });
  }, [organizationId]);

  return {
    state,
    goToStep,
    goNext,
    goBack,
    setDraftCase,
    updateCounts,
    incrementCount,
    setSubmitting,
    approveDraft,
    cancelDraft,
    reset,
  };
}

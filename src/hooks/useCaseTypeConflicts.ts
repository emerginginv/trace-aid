import { useState, useRef, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CaseType } from "@/hooks/queries/useCaseTypesQuery";
import { logCaseTypeAudit, determineCaseTypeAuditAction } from "@/lib/caseTypeAuditLogger";
import type {
  CaseFormData,
  EditingCase,
  PendingDueDateChange,
  PendingServiceConflict,
  PendingBudgetConflict,
  CaseTypeAuditContext,
} from "@/components/case-form/types";

interface UseCaseTypeConflictsOptions {
  form: UseFormReturn<CaseFormData>;
  editingCase?: EditingCase;
  caseTypes: CaseType[];
  organizationId?: string;
  billingStatus?: { hasBilling: boolean; invoiceCount?: number };
  onCaseTypeChange: (caseTypeId: string | null) => void;
}

/**
 * Hook for managing case type change conflicts including:
 * - Budget strategy conflicts (hours_only, money_only, disabled)
 * - Service conflicts (allowed services restrictions)
 * - Due date recalculation
 */
export function useCaseTypeConflicts({
  form,
  editingCase,
  caseTypes,
  organizationId,
  billingStatus,
  onCaseTypeChange,
}: UseCaseTypeConflictsOptions) {
  // Due date dialog state
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
  const [pendingDueDateChange, setPendingDueDateChange] = useState<PendingDueDateChange | null>(null);

  // Service conflict dialog state
  const [serviceConflictDialogOpen, setServiceConflictDialogOpen] = useState(false);
  const [pendingServiceConflict, setPendingServiceConflict] = useState<PendingServiceConflict | null>(null);

  // Budget conflict dialog state
  const [budgetConflictDialogOpen, setBudgetConflictDialogOpen] = useState(false);
  const [pendingBudgetConflict, setPendingBudgetConflict] = useState<PendingBudgetConflict | null>(null);

  // Track audit context for Case Type changes
  const auditContextRef = useRef<CaseTypeAuditContext>({
    hadBudgetConflict: false,
    hadServiceConflict: false,
    servicesRemoved: [],
    hadDueDateChange: false,
    previousCaseTypeId: null,
    previousCaseTypeName: null,
    previousBudgetStrategy: null,
  });

  // Helper to check if budget conflict exists
  const checkBudgetConflict = useCallback((
    currentBudget: { budget_type: string; total_budget_hours: number | null; total_budget_amount: number | null },
    newStrategy: string
  ): boolean => {
    if (newStrategy === 'disabled') return true;
    if (newStrategy === 'hours_only' && currentBudget.total_budget_amount) return true;
    if (newStrategy === 'money_only' && currentBudget.total_budget_hours) return true;
    return false;
  }, []);

  // Apply the final case type change and log audit
  const applyCaseTypeChange = useCallback(async (caseTypeId: string | null, newDueDate?: Date) => {
    const caseType = caseTypeId ? caseTypes.find(ct => ct.id === caseTypeId) : null;
    
    onCaseTypeChange(caseTypeId);
    form.setValue("case_type_id", caseTypeId);
    
    if (newDueDate) {
      form.setValue("due_date", newDueDate);
      auditContextRef.current.hadDueDateChange = true;
    }
    
    // Clear budget fields if strategy is disabled
    if (caseType?.budget_strategy === 'disabled') {
      form.setValue("budget_hours", null);
      form.setValue("budget_dollars", null);
    }

    // Log the case type change for existing cases
    if (editingCase && organizationId) {
      const auditAction = determineCaseTypeAuditAction(
        auditContextRef.current.previousCaseTypeId,
        caseTypeId
      );
      
      if (auditAction && auditAction !== 'case_type_removed') {
        await logCaseTypeAudit({
          action: auditAction,
          organizationId,
          metadata: {
            caseId: editingCase.id,
            caseNumber: editingCase.case_number,
            previousCaseTypeId: auditContextRef.current.previousCaseTypeId,
            previousCaseTypeName: auditContextRef.current.previousCaseTypeName,
            previousBudgetStrategy: auditContextRef.current.previousBudgetStrategy,
            newCaseTypeId: caseTypeId,
            newCaseTypeName: caseType?.name || null,
            newBudgetStrategy: caseType?.budget_strategy || 'both',
            budgetConflictResolved: auditContextRef.current.hadBudgetConflict,
            serviceConflictResolved: auditContextRef.current.hadServiceConflict,
            servicesRemoved: auditContextRef.current.servicesRemoved,
            dueDateRecalculated: auditContextRef.current.hadDueDateChange,
            severity: 'MEDIUM',
          },
        });
      }
    }
  }, [caseTypes, editingCase, form, onCaseTypeChange, organizationId]);

  // Continue checking for due date after services are resolved
  const continueWithDueDateCheck = useCallback((caseTypeId: string) => {
    const caseType = caseTypes.find(ct => ct.id === caseTypeId);
    
    if (editingCase && caseType?.default_due_days && caseType.default_due_days > 0) {
      const currentDueDate = form.getValues("due_date") || null;
      const newDueDate = addDays(new Date(), caseType.default_due_days);
      
      setPendingDueDateChange({
        newCaseTypeId: caseTypeId,
        newDueDate,
        currentDueDate,
        defaultDays: caseType.default_due_days,
        caseTypeName: caseType.name,
      });
      setDueDateDialogOpen(true);
      return;
    }

    // No due date dialog needed, apply the change
    applyCaseTypeChange(caseTypeId);
  }, [applyCaseTypeChange, caseTypes, editingCase, form]);

  // Continue checking for service conflicts after budget is resolved
  const continueWithServiceConflictCheck = useCallback(async (caseTypeId: string) => {
    const caseType = caseTypes.find(ct => ct.id === caseTypeId);
    if (!caseType || !editingCase) {
      continueWithDueDateCheck(caseTypeId);
      return;
    }

    // Check for service conflicts
    if (caseType.allowed_service_ids && caseType.allowed_service_ids.length > 0) {
      const { data: currentInstances } = await supabase
        .from("case_service_instances")
        .select(`
          id, 
          case_service_id,
          case_services!inner(name, code)
        `)
        .eq("case_id", editingCase.id);

      const conflicting = currentInstances?.filter(
        instance => !caseType.allowed_service_ids!.includes(instance.case_service_id)
      ).map(instance => ({
        id: instance.id,
        name: (instance.case_services as any)?.name || 'Unknown',
        code: (instance.case_services as any)?.code || null,
      }));

      if (conflicting && conflicting.length > 0) {
        setPendingServiceConflict({
          newCaseTypeId: caseTypeId,
          newCaseTypeName: caseType.name,
          conflictingServices: conflicting,
        });
        setServiceConflictDialogOpen(true);
        return;
      }
    }

    // No service conflicts, continue to due date check
    continueWithDueDateCheck(caseTypeId);
  }, [caseTypes, continueWithDueDateCheck, editingCase]);

  // Main handler for case type changes
  const handleCaseTypeChange = useCallback(async (caseTypeId: string | null) => {
    // Check if locked due to billing
    if (editingCase && billingStatus?.hasBilling) {
      if (organizationId) {
        await logCaseTypeAudit({
          action: 'case_type_change_blocked',
          organizationId,
          metadata: {
            caseId: editingCase.id,
            caseNumber: editingCase.case_number,
            previousCaseTypeId: editingCase.case_type_id,
            previousCaseTypeName: caseTypes.find(ct => ct.id === editingCase.case_type_id)?.name || null,
            newCaseTypeId: caseTypeId,
            newCaseTypeName: caseTypeId ? caseTypes.find(ct => ct.id === caseTypeId)?.name || null : null,
            reason: 'Billing has already started for this case',
            severity: 'MEDIUM',
          },
        });
      }
      toast.error("Cannot change case type after billing has started");
      return;
    }
    
    // Track previous state for audit logging
    if (editingCase) {
      const previousCaseType = caseTypes.find(ct => ct.id === editingCase.case_type_id);
      auditContextRef.current = {
        ...auditContextRef.current,
        previousCaseTypeId: editingCase.case_type_id || null,
        previousCaseTypeName: previousCaseType?.name || null,
        previousBudgetStrategy: previousCaseType?.budget_strategy || null,
        hadBudgetConflict: false,
        hadServiceConflict: false,
        servicesRemoved: [],
        hadDueDateChange: false,
      };
    }
    
    if (!caseTypeId) {
      // Clearing case type
      if (editingCase?.case_type_id && organizationId) {
        await logCaseTypeAudit({
          action: 'case_type_removed',
          organizationId,
          metadata: {
            caseId: editingCase.id,
            caseNumber: editingCase.case_number,
            previousCaseTypeId: editingCase.case_type_id,
            previousCaseTypeName: caseTypes.find(ct => ct.id === editingCase.case_type_id)?.name || null,
            severity: 'MEDIUM',
          },
        });
      }
      applyCaseTypeChange(null);
      return;
    }

    const caseType = caseTypes.find(ct => ct.id === caseTypeId);
    if (!caseType) {
      applyCaseTypeChange(caseTypeId);
      return;
    }

    // For new cases, just apply with auto-set due date
    if (!editingCase) {
      if (caseType.default_due_days && caseType.default_due_days > 0) {
        const newDueDate = addDays(new Date(), caseType.default_due_days);
        form.setValue("due_date", newDueDate);
      }
      applyCaseTypeChange(caseTypeId);
      return;
    }

    // For editing existing cases, check conflicts in order: Budget → Services → Due Date
    const newStrategy = caseType.budget_strategy || 'both';

    // STEP 1: Check for budget conflicts
    const { data: currentBudget } = await supabase
      .from("case_budgets")
      .select("budget_type, total_budget_hours, total_budget_amount")
      .eq("case_id", editingCase.id)
      .maybeSingle();

    if (currentBudget && checkBudgetConflict(currentBudget, newStrategy)) {
      setPendingBudgetConflict({
        newCaseTypeId: caseTypeId,
        newCaseTypeName: caseType.name,
        newStrategy,
        currentBudget,
      });
      setBudgetConflictDialogOpen(true);
      return;
    }

    // No budget conflict, continue to service conflict check
    await continueWithServiceConflictCheck(caseTypeId);
  }, [applyCaseTypeChange, billingStatus, caseTypes, checkBudgetConflict, continueWithServiceConflictCheck, editingCase, form, organizationId]);

  // Handle cancelling budget conflict
  const handleCancelBudgetConflict = useCallback(() => {
    setPendingBudgetConflict(null);
  }, []);

  // Handle confirming budget conflict
  const handleConfirmBudgetConflict = useCallback(async () => {
    if (!pendingBudgetConflict || !editingCase) return;

    const { newCaseTypeId, newStrategy } = pendingBudgetConflict;
    auditContextRef.current.hadBudgetConflict = true;

    try {
      await supabase
        .from("cases")
        .update({ applied_budget_strategy: newStrategy })
        .eq("id", editingCase.id);

      if (newStrategy === 'disabled') {
        await supabase.from("case_budgets").delete().eq("case_id", editingCase.id);
        toast.success("Budget configuration removed");
      } else if (newStrategy === 'hours_only') {
        await supabase
          .from("case_budgets")
          .update({ total_budget_amount: null, budget_type: 'hours' })
          .eq("case_id", editingCase.id);
        toast.success("Dollar budget cleared");
      } else if (newStrategy === 'money_only') {
        await supabase
          .from("case_budgets")
          .update({ total_budget_hours: null, budget_type: 'money' })
          .eq("case_id", editingCase.id);
        toast.success("Hours budget cleared");
      }

      await continueWithServiceConflictCheck(newCaseTypeId);
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget configuration");
    }

    setPendingBudgetConflict(null);
  }, [continueWithServiceConflictCheck, editingCase, pendingBudgetConflict]);

  // Handle cancelling service conflict
  const handleCancelServiceConflict = useCallback(() => {
    setPendingServiceConflict(null);
  }, []);

  // Handle confirming service conflict
  const handleConfirmServiceConflict = useCallback(async () => {
    if (!pendingServiceConflict || !editingCase) return;

    const { newCaseTypeId, conflictingServices } = pendingServiceConflict;
    auditContextRef.current.hadServiceConflict = true;
    auditContextRef.current.servicesRemoved = conflictingServices.map(s => s.name);

    try {
      const conflictingIds = conflictingServices.map(s => s.id);
      if (conflictingIds.length > 0) {
        const { error } = await supabase
          .from("case_service_instances")
          .delete()
          .in("id", conflictingIds);

        if (error) {
          console.error("Error removing conflicting services:", error);
          toast.error("Failed to remove conflicting services");
          return;
        }
        
        toast.success(`Removed ${conflictingServices.length} incompatible service${conflictingServices.length !== 1 ? 's' : ''}`);
      }

      continueWithDueDateCheck(newCaseTypeId);
    } catch (error) {
      console.error("Error handling service conflict:", error);
      toast.error("Failed to update Case Type");
    }

    setPendingServiceConflict(null);
  }, [continueWithDueDateCheck, editingCase, pendingServiceConflict]);

  // Handle keeping current due date
  const handleKeepCurrentDueDate = useCallback(() => {
    if (pendingDueDateChange) {
      const { newCaseTypeId } = pendingDueDateChange;
      applyCaseTypeChange(newCaseTypeId);
    }
    setDueDateDialogOpen(false);
    setPendingDueDateChange(null);
  }, [applyCaseTypeChange, pendingDueDateChange]);

  // Handle updating to new due date
  const handleUpdateToNewDueDate = useCallback(() => {
    if (pendingDueDateChange) {
      const { newCaseTypeId, newDueDate } = pendingDueDateChange;
      applyCaseTypeChange(newCaseTypeId, newDueDate);
    }
    setDueDateDialogOpen(false);
    setPendingDueDateChange(null);
  }, [applyCaseTypeChange, pendingDueDateChange]);

  return {
    // Dialog states
    dueDateDialogOpen,
    setDueDateDialogOpen,
    serviceConflictDialogOpen,
    setServiceConflictDialogOpen,
    budgetConflictDialogOpen,
    setBudgetConflictDialogOpen,
    
    // Pending states
    pendingDueDateChange,
    pendingServiceConflict,
    pendingBudgetConflict,
    
    // Handlers
    handleCaseTypeChange,
    handleCancelBudgetConflict,
    handleConfirmBudgetConflict,
    handleCancelServiceConflict,
    handleConfirmServiceConflict,
    handleKeepCurrentDueDate,
    handleUpdateToNewDueDate,
  };
}

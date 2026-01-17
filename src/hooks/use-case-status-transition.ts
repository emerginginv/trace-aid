import { useCallback, useMemo } from "react";
import { useCaseStatuses, CaseStatus, CaseStatusCategory } from "./use-case-statuses";
import { usePermissions } from "./usePermissions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Validation result for status transitions
 */
export interface TransitionValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Hook for case status transition logic including validation,
 * workflow filtering, and default next status calculation.
 */
export function useCaseStatusTransition() {
  const {
    activeStatuses,
    categories,
    getStatusById,
    getCategoryById,
    getCategoryByName,
    isReadOnly,
    isReopenable,
    getNextStatus,
    getPrevStatus,
    getStatusesByCategoryId,
  } = useCaseStatuses();

  const { hasPermission } = usePermissions();

  /**
   * Get statuses available for a specific workflow
   */
  const getStatusesForWorkflow = useCallback((workflow: string = "standard"): CaseStatus[] => {
    return activeStatuses.filter(status => 
      status.workflows.includes(workflow)
    );
  }, [activeStatuses]);

  /**
   * Get active statuses for a workflow, grouped by category
   */
  const getStatusesGroupedByCategory = useCallback((workflow: string = "standard"): Map<CaseStatusCategory, CaseStatus[]> => {
    const workflowStatuses = getStatusesForWorkflow(workflow);
    const grouped = new Map<CaseStatusCategory, CaseStatus[]>();

    categories.sort((a, b) => a.sort_order - b.sort_order).forEach(category => {
      const categoryStatuses = workflowStatuses
        .filter(s => s.category_id === category.id)
        .sort((a, b) => a.rank_order - b.rank_order);
      
      if (categoryStatuses.length > 0) {
        grouped.set(category, categoryStatuses);
      }
    });

    return grouped;
  }, [categories, getStatusesForWorkflow]);

  /**
   * Validate if a status transition is allowed (frontend validation)
   * This mirrors the backend validation for immediate UI feedback
   */
  const canTransitionTo = useCallback((
    fromStatusId: string | null,
    toStatusId: string,
    workflow: string = "standard"
  ): TransitionValidationResult => {
    // Rule 1: Check if current status is read-only
    if (fromStatusId && isReadOnly(fromStatusId)) {
      return { valid: false, reason: "Current status is read-only" };
    }

    // Rule 2: Check if target status is in the workflow
    const toStatus = getStatusById(toStatusId);
    if (!toStatus) {
      return { valid: false, reason: "Target status not found" };
    }

    if (!toStatus.workflows.includes(workflow)) {
      return { valid: false, reason: "Target status is not available for this workflow" };
    }

    // Rule 3: Check permission
    if (!hasPermission("modify_case_status")) {
      return { valid: false, reason: "You don't have permission to change case status" };
    }

    return { valid: true };
  }, [isReadOnly, getStatusById, hasPermission]);

  /**
   * Get the default next status considering workflow constraints
   */
  const getDefaultNextStatus = useCallback((
    currentStatusId: string,
    workflow: string = "standard"
  ): CaseStatus | undefined => {
    const nextStatus = getNextStatus(currentStatusId);
    
    // Check if next status is in the workflow
    if (nextStatus && nextStatus.workflows.includes(workflow)) {
      return nextStatus;
    }

    // If no valid next status in same category, find first status in next category
    const currentStatus = getStatusById(currentStatusId);
    if (!currentStatus) return undefined;

    const currentCategory = getCategoryById(currentStatus.category_id);
    if (!currentCategory) return undefined;

    // Find next category
    const nextCategories = categories
      .filter(c => c.sort_order > currentCategory.sort_order)
      .sort((a, b) => a.sort_order - b.sort_order);

    for (const cat of nextCategories) {
      const statusesInCat = getStatusesByCategoryId(cat.id)
        .filter(s => s.is_active && s.workflows.includes(workflow))
        .sort((a, b) => a.rank_order - b.rank_order);
      
      if (statusesInCat.length > 0) {
        return statusesInCat[0];
      }
    }

    return undefined;
  }, [getNextStatus, getStatusById, getCategoryById, categories, getStatusesByCategoryId]);

  /**
   * Get the default previous status considering workflow constraints
   */
  const getDefaultPrevStatus = useCallback((
    currentStatusId: string,
    workflow: string = "standard"
  ): CaseStatus | undefined => {
    const prevStatus = getPrevStatus(currentStatusId);
    
    // Check if prev status is in the workflow
    if (prevStatus && prevStatus.workflows.includes(workflow)) {
      return prevStatus;
    }

    // If no valid prev status in same category, find last status in prev category
    const currentStatus = getStatusById(currentStatusId);
    if (!currentStatus) return undefined;

    const currentCategory = getCategoryById(currentStatus.category_id);
    if (!currentCategory) return undefined;

    // Find prev category
    const prevCategories = categories
      .filter(c => c.sort_order < currentCategory.sort_order)
      .sort((a, b) => b.sort_order - a.sort_order);

    for (const cat of prevCategories) {
      const statusesInCat = getStatusesByCategoryId(cat.id)
        .filter(s => s.is_active && s.workflows.includes(workflow))
        .sort((a, b) => b.rank_order - a.rank_order);
      
      if (statusesInCat.length > 0) {
        return statusesInCat[0];
      }
    }

    return undefined;
  }, [getPrevStatus, getStatusById, getCategoryById, categories, getStatusesByCategoryId]);

  /**
   * Check if case can be reopened (calls backend function)
   */
  const checkCanReopen = useCallback(async (caseId: string): Promise<TransitionValidationResult> => {
    try {
      const { data, error } = await supabase.rpc("can_reopen_case", { p_case_id: caseId });
      
      if (error) {
        console.error("Error checking reopen:", error);
        return { valid: false, reason: "Failed to check reopen status" };
      }

      const result = data as { allowed: boolean; reason?: string };
      return { 
        valid: result.allowed, 
        reason: result.reason 
      };
    } catch (err) {
      console.error("Error checking reopen:", err);
      return { valid: false, reason: "Failed to check reopen status" };
    }
  }, []);

  /**
   * Frontend check if reopen might be allowed (quick check without backend call)
   */
  const canPotentiallyReopen = useCallback((currentStatusId: string | null): boolean => {
    if (!currentStatusId) return false;
    return isReopenable(currentStatusId);
  }, [isReopenable]);

  /**
   * Get the first status in the "Open" category for reopening
   */
  const getFirstOpenStatus = useCallback((workflow: string = "standard"): CaseStatus | undefined => {
    const openCategory = getCategoryByName("Open");
    if (!openCategory) return undefined;

    const openStatuses = getStatusesByCategoryId(openCategory.id)
      .filter(s => s.is_active && s.workflows.includes(workflow))
      .sort((a, b) => a.rank_order - b.rank_order);

    return openStatuses[0];
  }, [getCategoryByName, getStatusesByCategoryId]);

  /**
   * Check if user has permission to modify case status
   */
  const canModifyStatus = useMemo(() => {
    return hasPermission("modify_case_status");
  }, [hasPermission]);

  /**
   * Check if current status blocks all transitions (is read-only)
   */
  const isStatusLocked = useCallback((statusId: string | null): boolean => {
    if (!statusId) return false;
    return isReadOnly(statusId);
  }, [isReadOnly]);

  return {
    // Workflow-aware status queries
    getStatusesForWorkflow,
    getStatusesGroupedByCategory,

    // Transition validation
    canTransitionTo,
    canModifyStatus,
    isStatusLocked,

    // Default navigation with workflow awareness
    getDefaultNextStatus,
    getDefaultPrevStatus,

    // Reopen logic
    checkCanReopen,
    canPotentiallyReopen,
    getFirstOpenStatus,
  };
}

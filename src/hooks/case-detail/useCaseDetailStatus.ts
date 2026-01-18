import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NotificationHelpers } from "@/lib/notifications";
import { useCaseLifecycleStatuses } from "@/hooks/use-case-lifecycle-statuses";
import { useCaseStatuses } from "@/hooks/use-case-statuses";
import { useCaseStatusTransition } from "@/hooks/use-case-status-transition";
import { useStatusDisplay } from "@/hooks/use-status-display";
import type { CaseData } from "./useCaseDetailData";

interface UseCaseDetailStatusOptions {
  caseData: CaseData | null;
  setCaseData: React.Dispatch<React.SetStateAction<CaseData | null>>;
  caseId: string | undefined;
}

/**
 * Hook for managing case status changes including both
 * legacy (status_key) and new (current_status_id) systems.
 */
export function useCaseDetailStatus({
  caseData,
  setCaseData,
  caseId,
}: UseCaseDetailStatusOptions) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Legacy status system
  const {
    executionStatuses,
    getStatusByKey,
    getDisplayName: getLegacyDisplayName,
    getStatusColor: getLifecycleStatusColor,
    isClosedStatus: isClosedLifecycleStatus,
    isLoading: legacyStatusesLoading,
  } = useCaseLifecycleStatuses();

  // New canonical status system
  const {
    statuses: newStatuses,
    activeStatuses,
    categories,
    getStatusById,
    getStatusDisplayName,
    getStatusColor: getNewStatusColor,
    isClosedCategory,
    getNextStatus,
    getPrevStatus,
    getCategoryByName,
    getStatusesByCategoryId,
    isLoading: newStatusesLoading,
  } = useCaseStatuses();

  // Status transition engine
  const {
    getStatusesForWorkflow,
    getStatusesGroupedByCategory,
    canTransitionTo,
    canModifyStatus,
    isStatusLocked,
    getDefaultNextStatus,
    getDefaultPrevStatus,
    checkCanReopen,
    canPotentiallyReopen,
    getFirstOpenStatus,
  } = useCaseStatusTransition();

  // Permission-aware status display
  const {
    canViewExactStatus,
    getDisplayName: getStatusDisplayNameByPermission,
    getDisplayStyle: getStatusDisplayStyleByPermission,
  } = useStatusDisplay();

  const statusesLoading = legacyStatusesLoading || newStatusesLoading;

  // Get status style for display (using lifecycle statuses)
  const getStatusStyle = useCallback((statusKey: string) => {
    const color = getLifecycleStatusColor(statusKey);
    if (color) {
      return {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
      };
    }
    return {};
  }, [getLifecycleStatusColor]);

  // Check if case is closed
  const isClosedCase = useCallback(() => {
    if (caseData?.current_status_id) {
      return isClosedCategory(caseData.current_status_id);
    }
    if (!caseData?.status_key) return false;
    return isClosedLifecycleStatus(caseData.status_key);
  }, [caseData, isClosedCategory, isClosedLifecycleStatus]);

  // Get current status display style (respects view_exact_status permission)
  const getCurrentStatusStyle = useCallback(() => {
    if (caseData?.current_status_id) {
      return getStatusDisplayStyleByPermission(caseData.current_status_id);
    }
    return getStatusStyle(caseData?.status_key || '');
  }, [caseData, getStatusDisplayStyleByPermission, getStatusStyle]);

  // Get current status display name (respects view_exact_status permission)
  const getCurrentStatusDisplayName = useCallback(() => {
    if (caseData?.current_status_id) {
      return getStatusDisplayNameByPermission(caseData.current_status_id);
    }
    return getLegacyDisplayName(caseData?.status_key || '') || caseData?.status || 'Unknown';
  }, [caseData, getStatusDisplayNameByPermission, getLegacyDisplayName]);

  // Handle status change using the NEW canonical status system
  const handleNewStatusChange = useCallback(async (newStatusId: string): Promise<boolean> => {
    if (!caseData || !caseId) return false;

    const oldStatusId = caseData.current_status_id;
    if (oldStatusId === newStatusId) return true;

    const previousCaseData = { ...caseData };
    const newStatus = getStatusById(newStatusId);
    if (!newStatus) {
      toast({ title: "Error", description: "Status not found", variant: "destructive" });
      return false;
    }

    // Validate transition
    const caseWorkflow = caseData.workflow || "standard";
    const validation = canTransitionTo(oldStatusId, newStatusId, caseWorkflow);

    if (!validation.valid) {
      toast({
        title: "Transition Blocked",
        description: validation.reason || "Status change not allowed",
        variant: "destructive"
      });
      return false;
    }

    const wasClosedCategory = oldStatusId ? isClosedCategory(oldStatusId) : false;
    const isNowClosedCategory = isClosedCategory(newStatusId);
    const isClosing = !wasClosedCategory && isNowClosedCategory;

    // Optimistic update
    setCaseData({
      ...caseData,
      current_status_id: newStatusId,
      current_category_id: newStatus.category_id,
      status: newStatus.name,
      status_entered_at: new Date().toISOString(),
      ...(isClosing ? {
        closed_by_user_id: "pending",
        closed_at: new Date().toISOString()
      } : {})
    });

    toast({
      title: "Status updated",
      description: isClosing ? "Case closed" : `Status changed to ${newStatus.name}`
    });

    setUpdatingStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const userName = profile?.full_name || user.email || "Unknown User";

      const updateData: Record<string, unknown> = {
        current_status_id: newStatusId,
        status: newStatus.name,
      };

      if (isClosing) {
        updateData.closed_by_user_id = user.id;
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("cases")
        .update(updateData)
        .eq("id", caseId);

      if (error) throw error;

      // Log activity
      const oldStatus = oldStatusId ? getStatusById(oldStatusId) : null;
      const activityDescription = isClosing
        ? `Case closed by ${userName}`
        : `Status changed from "${oldStatus?.name || 'Unknown'}" to "${newStatus.name}" by ${userName}`;

      await supabase.from("case_activities").insert({
        case_id: caseId,
        user_id: user.id,
        activity_type: "Status Change",
        title: isClosing ? "Case Closed" : "Status Changed",
        description: activityDescription,
        status: "completed"
      });

      await NotificationHelpers.caseStatusChanged(caseData.case_number, newStatus.name, caseId);

      // Confirm the update
      setCaseData(prev => prev ? {
        ...prev,
        current_status_id: newStatusId,
        current_category_id: newStatus.category_id,
        status: newStatus.name,
        status_entered_at: new Date().toISOString(),
        ...(isClosing ? {
          closed_by_user_id: user.id,
          closed_at: new Date().toISOString()
        } : {})
      } : null);

      return true;
    } catch (error) {
      console.error("Error updating status:", error);
      setCaseData(previousCaseData);
      toast({
        title: "Error",
        description: "Failed to update case status. Change reverted.",
        variant: "destructive"
      });
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  }, [caseData, caseId, getStatusById, canTransitionTo, isClosedCategory, setCaseData]);

  // Handle legacy status change (status_key based)
  const handleStatusChange = useCallback(async (newStatusKey: string): Promise<boolean> => {
    if (!caseData || !caseId) return false;
    
    const oldStatusKey = caseData.status_key;
    if (oldStatusKey === newStatusKey) return true;
    
    const previousCaseData = { ...caseData };
    const newStatusItem = getStatusByKey(newStatusKey);
    const isClosing = newStatusItem?.status_type === 'closed';
    const oldStatusItem = oldStatusKey ? getStatusByKey(oldStatusKey) : null;
    const wasOpen = oldStatusItem?.status_type === 'open';
    const displayName = newStatusItem?.display_name || newStatusKey;

    setCaseData({
      ...caseData,
      status: displayName,
      status_key: newStatusKey,
      ...(isClosing && wasOpen ? {
        closed_by_user_id: "pending",
        closed_at: new Date().toISOString()
      } : {})
    });

    toast({
      title: "Status updated",
      description: isClosing && wasOpen ? "Case closed" : `Status changed to ${displayName}`
    });

    setUpdatingStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const userName = profile?.full_name || user.email || "Unknown User";

      const updateData: any = {
        status: displayName,
        status_key: newStatusKey
      };

      if (isClosing && wasOpen) {
        updateData.closed_by_user_id = user.id;
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("cases")
        .update(updateData)
        .eq("id", caseId)
        .eq("user_id", user.id);

      if (error) throw error;

      let activityDescription = `Status changed from "${oldStatusItem?.display_name || oldStatusKey}" to "${displayName}" by ${userName}`;
      if (isClosing && wasOpen) {
        activityDescription = `Case closed by ${userName}`;
      }

      await supabase.from("case_activities").insert({
        case_id: caseId,
        user_id: user.id,
        activity_type: "Status Change",
        title: isClosing && wasOpen ? "Case Closed" : "Status Changed",
        description: activityDescription,
        status: "completed"
      });

      await NotificationHelpers.caseStatusChanged(caseData.case_number, displayName, caseId);

      setCaseData(prev => prev ? {
        ...prev,
        status: displayName,
        status_key: newStatusKey,
        ...(isClosing && wasOpen ? {
          closed_by_user_id: user.id,
          closed_at: new Date().toISOString()
        } : {})
      } : null);

      return true;
    } catch (error) {
      console.error("Error updating status:", error);
      setCaseData(previousCaseData);
      toast({
        title: "Error",
        description: "Failed to update case status. Change reverted.",
        variant: "destructive"
      });
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  }, [caseData, caseId, getStatusByKey, setCaseData]);

  return {
    // Status state
    updatingStatus,
    statusesLoading,
    
    // Legacy status system exports
    executionStatuses,
    getStatusByKey,
    getLegacyDisplayName,
    getLifecycleStatusColor,
    
    // New status system exports
    activeStatuses,
    categories,
    getStatusById,
    getNextStatus,
    getPrevStatus,
    isClosedCategory,
    
    // Transition engine exports
    checkCanReopen,
    canPotentiallyReopen,
    getFirstOpenStatus,
    
    // Permission-aware display
    canViewExactStatus,
    
    // Helper functions
    getStatusStyle,
    isClosedCase,
    getCurrentStatusStyle,
    getCurrentStatusDisplayName,
    
    // Status change handlers
    handleNewStatusChange,
    handleStatusChange,
  };
}

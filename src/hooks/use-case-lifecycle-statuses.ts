import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * Case Lifecycle Status interface
 */
export interface CaseLifecycleStatus {
  id: string;
  status_key: string;
  display_name: string;
  phase: "intake" | "execution";
  phase_order: number;
  status_type: "open" | "closed";
  color: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
}

/**
 * Case Status Transition interface
 */
export interface CaseStatusTransition {
  id: string;
  from_status_key: string;
  to_status_key: string;
  description: string | null;
  is_active: boolean;
}

/**
 * Phase definitions
 */
export const LIFECYCLE_PHASES = {
  INTAKE: "intake",
  EXECUTION: "execution",
} as const;

/**
 * Status key constants for type-safe usage
 */
export const STATUS_KEYS = {
  // Intake Phase
  REQUESTED: "requested",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  DECLINED: "declined",
  // Execution Phase
  NEW: "new",
  ASSIGNED: "assigned",
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  AWAITING_CLIENT: "awaiting_client",
  AWAITING_RECORDS: "awaiting_records",
  COMPLETED: "completed",
  CLOSED: "closed",
  CANCELLED: "cancelled",
} as const;

export type StatusKey = (typeof STATUS_KEYS)[keyof typeof STATUS_KEYS];

/**
 * Hook to fetch case lifecycle statuses for the current organization.
 * Provides phase-aware helpers and maintains backward compatibility.
 */
export function useCaseLifecycleStatuses() {
  const { organization } = useOrganization();

  // Fetch lifecycle statuses
  const {
    data: statuses = [],
    isLoading: isLoadingStatuses,
    error: statusesError,
    refetch: refetchStatuses,
  } = useQuery({
    queryKey: ["case-lifecycle-statuses", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("case_lifecycle_statuses")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("phase")
        .order("phase_order");

      if (error) throw error;
      return (data || []) as CaseLifecycleStatus[];
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch transitions
  const {
    data: transitions = [],
    isLoading: isLoadingTransitions,
    error: transitionsError,
    refetch: refetchTransitions,
  } = useQuery({
    queryKey: ["case-status-transitions", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("case_status_transitions")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_active", true);

      if (error) throw error;
      return (data || []) as CaseStatusTransition[];
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  });

  // === PHASE HELPERS ===

  /** Get all intake phase statuses */
  const intakeStatuses = statuses.filter((s) => s.phase === "intake");

  /** Get all execution phase statuses */
  const executionStatuses = statuses.filter((s) => s.phase === "execution");

  /** Get open statuses (both phases) */
  const openStatuses = statuses.filter((s) => s.status_type === "open");

  /** Get closed statuses (both phases) */
  const closedStatuses = statuses.filter((s) => s.status_type === "closed");

  /** Get open execution statuses (for case list filtering) */
  const openExecutionStatuses = executionStatuses.filter(
    (s) => s.status_type === "open"
  );

  /** Get closed execution statuses */
  const closedExecutionStatuses = executionStatuses.filter(
    (s) => s.status_type === "closed"
  );

  // === STATUS LOOKUP HELPERS ===

  /** Get a status by its key */
  const getStatusByKey = (statusKey: string): CaseLifecycleStatus | undefined => {
    return statuses.find((s) => s.status_key === statusKey);
  };

  /** Get status display name by key */
  const getDisplayName = (statusKey: string): string => {
    const status = getStatusByKey(statusKey);
    return status?.display_name || statusKey;
  };

  /** Get status color by key */
  const getStatusColor = (statusKey: string): string | null => {
    const status = getStatusByKey(statusKey);
    return status?.color || null;
  };

  /** Check if a status is closed */
  const isClosedStatus = (statusKey: string): boolean => {
    const status = getStatusByKey(statusKey);
    return status?.status_type === "closed";
  };

  /** Check if a status is in the intake phase */
  const isIntakeStatus = (statusKey: string): boolean => {
    const status = getStatusByKey(statusKey);
    return status?.phase === "intake";
  };

  /** Check if a status is in the execution phase */
  const isExecutionStatus = (statusKey: string): boolean => {
    const status = getStatusByKey(statusKey);
    return status?.phase === "execution";
  };

  /** Get the phase of a status */
  const getStatusPhase = (statusKey: string): "intake" | "execution" | null => {
    const status = getStatusByKey(statusKey);
    return status?.phase || null;
  };

  // === TRANSITION HELPERS ===

  /** Get allowed transitions from a given status */
  const getAllowedTransitions = (fromStatusKey: string): CaseStatusTransition[] => {
    return transitions.filter((t) => t.from_status_key === fromStatusKey);
  };

  /** Get allowed next statuses from a given status */
  const getAllowedNextStatuses = (fromStatusKey: string): CaseLifecycleStatus[] => {
    const allowedTransitions = getAllowedTransitions(fromStatusKey);
    const nextStatusKeys = allowedTransitions.map((t) => t.to_status_key);
    return statuses.filter((s) => nextStatusKeys.includes(s.status_key));
  };

  /** Check if a transition is allowed */
  const isTransitionAllowed = (
    fromStatusKey: string,
    toStatusKey: string
  ): boolean => {
    return transitions.some(
      (t) =>
        t.from_status_key === fromStatusKey && t.to_status_key === toStatusKey
    );
  };

  // === BACKWARD COMPATIBILITY ===
  // These match the old useCaseStatusPicklists interface

  /** @deprecated Use executionStatuses instead */
  const caseStatuses = executionStatuses;

  /** Refetch all data */
  const refetch = () => {
    refetchStatuses();
    refetchTransitions();
  };

  return {
    // All statuses
    statuses,
    transitions,

    // Phase-grouped statuses
    intakeStatuses,
    executionStatuses,

    // Status type groupings
    openStatuses,
    closedStatuses,
    openExecutionStatuses,
    closedExecutionStatuses,

    // Lookup helpers
    getStatusByKey,
    getDisplayName,
    getStatusColor,
    isClosedStatus,
    isIntakeStatus,
    isExecutionStatus,
    getStatusPhase,

    // Transition helpers
    getAllowedTransitions,
    getAllowedNextStatuses,
    isTransitionAllowed,

    // Backward compatibility
    caseStatuses,

    // Loading states
    isLoading: isLoadingStatuses || isLoadingTransitions,
    isLoadingStatuses,
    isLoadingTransitions,
    error: statusesError || transitionsError,
    refetch,
  };
}

/**
 * Hook to get intake statuses only (for case request workflows)
 */
export function useIntakeStatuses() {
  const { intakeStatuses, isLoading, error, ...rest } = useCaseLifecycleStatuses();
  
  return {
    statuses: intakeStatuses,
    isLoading,
    error,
    ...rest,
  };
}

/**
 * Hook to get execution statuses only (for active case workflows)
 */
export function useExecutionStatuses() {
  const { executionStatuses, isLoading, error, ...rest } = useCaseLifecycleStatuses();
  
  return {
    statuses: executionStatuses,
    isLoading,
    error,
    ...rest,
  };
}

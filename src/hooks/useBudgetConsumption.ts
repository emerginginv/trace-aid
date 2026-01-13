import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BudgetConsumption {
  hasBudget: boolean;
  budgetType: string | null;
  hardCap: boolean;
  hoursAuthorized: number;
  hoursConsumed: number;
  hoursRemaining: number;
  hoursUtilizationPct: number;
  amountAuthorized: number;
  amountConsumed: number;
  amountRemaining: number;
  amountUtilizationPct: number;
  isWarning: boolean;
  isExceeded: boolean;
  isBlocked: boolean;
  hoursFromActivities: number;
  hoursFromServices: number;
  amountFromActivities: number;
  amountFromServices: number;
}

export interface BudgetCheckResult {
  canProceed: boolean;
  warningMessage: string | null;
  budgetType: string | null;
  hardCap: boolean;
  hoursRemaining: number | null;
  amountRemaining: number | null;
  wouldExceedHours: boolean;
  wouldExceedAmount: boolean;
}

export function useBudgetConsumption(caseId: string) {
  const [consumption, setConsumption] = useState<BudgetConsumption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsumption = useCallback(async () => {
    if (!caseId) {
      setConsumption(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.rpc(
        "get_realtime_budget_status",
        { p_case_id: caseId }
      );

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const row = data[0];
        setConsumption({
          hasBudget: row.has_budget,
          budgetType: row.budget_type,
          hardCap: row.hard_cap,
          hoursAuthorized: row.hours_authorized || 0,
          hoursConsumed: row.hours_consumed || 0,
          hoursRemaining: row.hours_remaining || 0,
          hoursUtilizationPct: row.hours_utilization_pct || 0,
          amountAuthorized: row.amount_authorized || 0,
          amountConsumed: row.amount_consumed || 0,
          amountRemaining: row.amount_remaining || 0,
          amountUtilizationPct: row.amount_utilization_pct || 0,
          isWarning: row.is_warning || false,
          isExceeded: row.is_exceeded || false,
          isBlocked: row.is_blocked || false,
          hoursFromActivities: row.hours_from_activities || 0,
          hoursFromServices: row.hours_from_services || 0,
          amountFromActivities: row.amount_from_activities || 0,
          amountFromServices: row.amount_from_services || 0,
        });
      } else {
        setConsumption(null);
      }
    } catch (err: any) {
      console.error("Error fetching budget consumption:", err);
      setError(err.message);
      setConsumption(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchConsumption();
  }, [fetchConsumption]);

  // Check if a proposed action would exceed budget
  const checkBeforeAction = useCallback(
    async (
      additionalHours: number = 0,
      additionalAmount: number = 0,
      actionType: string = "activity"
    ): Promise<BudgetCheckResult | null> => {
      if (!caseId) return null;

      try {
        const { data, error } = await supabase.rpc("check_budget_cap", {
          p_case_id: caseId,
          p_additional_hours: additionalHours,
          p_additional_amount: additionalAmount,
          p_action_type: actionType,
        });

        if (error) throw error;

        if (data && data.length > 0) {
          const row = data[0];
          return {
            canProceed: row.can_proceed,
            warningMessage: row.warning_message,
            budgetType: row.budget_type,
            hardCap: row.hard_cap,
            hoursRemaining: row.hours_remaining,
            amountRemaining: row.amount_remaining,
            wouldExceedHours: row.would_exceed_hours,
            wouldExceedAmount: row.would_exceed_amount,
          };
        }
        return null;
      } catch (err: any) {
        console.error("Error checking budget cap:", err);
        return null;
      }
    },
    [caseId]
  );

  return {
    consumption,
    loading,
    error,
    refetch: fetchConsumption,
    checkBeforeAction,
  };
}

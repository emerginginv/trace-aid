import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CaseBudget {
  id: string;
  case_id: string;
  organization_id: string;
  budget_type: "hours" | "money" | "both";
  total_budget_hours: number | null;
  total_budget_amount: number | null;
  hard_cap: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetCheckResult {
  can_proceed: boolean;
  warning_message: string | null;
  budget_type: string | null;
  hard_cap: boolean;
  hours_remaining: number | null;
  amount_remaining: number | null;
  would_exceed_hours: boolean;
  would_exceed_amount: boolean;
}

export function useCaseBudget(caseId: string) {
  const [budget, setBudget] = useState<CaseBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(async () => {
    if (!caseId) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("case_budgets")
        .select("*")
        .eq("case_id", caseId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setBudget(data as CaseBudget | null);
    } catch (err: any) {
      console.error("Error fetching case budget:", err);
      setError(err.message);
      setBudget(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const checkBudgetCap = useCallback(async (
    additionalHours: number = 0,
    additionalAmount: number = 0
  ): Promise<BudgetCheckResult | null> => {
    if (!caseId) return null;

    try {
      const { data, error } = await supabase.rpc("check_budget_cap", {
        p_case_id: caseId,
        p_additional_hours: additionalHours,
        p_additional_amount: additionalAmount,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0] as BudgetCheckResult;
      }
      
      return null;
    } catch (err: any) {
      console.error("Error checking budget cap:", err);
      return null;
    }
  }, [caseId]);

  const deleteBudget = useCallback(async () => {
    if (!budget?.id) return false;

    try {
      const { error } = await supabase
        .from("case_budgets")
        .delete()
        .eq("id", budget.id);

      if (error) throw error;
      setBudget(null);
      return true;
    } catch (err: any) {
      console.error("Error deleting budget:", err);
      setError(err.message);
      return false;
    }
  }, [budget?.id]);

  return {
    budget,
    loading,
    error,
    refetch: fetchBudget,
    checkBudgetCap,
    deleteBudget,
  };
}

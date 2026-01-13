import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BudgetViolation {
  id: string;
  caseId: string;
  organizationId: string;
  userId: string;
  violationType: "warning" | "exceeded" | "blocked";
  budgetScope: "case" | "service";
  serviceInstanceId: string | null;
  hoursAtViolation: number | null;
  amountAtViolation: number | null;
  hoursLimit: number | null;
  amountLimit: number | null;
  actionAttempted: string | null;
  actionBlocked: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export function useBudgetViolations(caseId?: string, limit: number = 20) {
  const [violations, setViolations] = useState<BudgetViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("budget_violation_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (caseId) {
        query = query.eq("case_id", caseId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped: BudgetViolation[] = (data || []).map((row: any) => ({
        id: row.id,
        caseId: row.case_id,
        organizationId: row.organization_id,
        userId: row.user_id,
        violationType: row.violation_type,
        budgetScope: row.budget_scope,
        serviceInstanceId: row.service_instance_id,
        hoursAtViolation: row.hours_at_violation,
        amountAtViolation: row.amount_at_violation,
        hoursLimit: row.hours_limit,
        amountLimit: row.amount_limit,
        actionAttempted: row.action_attempted,
        actionBlocked: row.action_blocked,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      }));

      setViolations(mapped);
    } catch (err: any) {
      console.error("Error fetching budget violations:", err);
      setError(err.message);
      setViolations([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, limit]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  return {
    violations,
    loading,
    error,
    refetch: fetchViolations,
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceBudgetLimit {
  id: string;
  case_service_instance_id: string;
  case_id: string;
  organization_id: string;
  max_hours: number | null;
  max_amount: number | null;
  warning_threshold: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface ServiceBudgetStatus {
  instance_id: string;
  service_name: string;
  max_hours: number | null;
  max_amount: number | null;
  warning_threshold: number;
  hours_consumed: number;
  amount_consumed: number;
  hours_utilization_pct: number;
  amount_utilization_pct: number;
  hours_remaining: number;
  amount_remaining: number;
  is_hours_warning: boolean;
  is_amount_warning: boolean;
  is_hours_exceeded: boolean;
  is_amount_exceeded: boolean;
}

export interface ServiceBudgetCheckResult {
  can_proceed: boolean;
  warning_message: string | null;
  service_name: string | null;
  hours_remaining: number | null;
  amount_remaining: number | null;
  would_exceed_hours: boolean;
  would_exceed_amount: boolean;
  has_case_hard_cap: boolean;
}

export function useServiceBudgetLimits(caseId: string) {
  const [limits, setLimits] = useState<ServiceBudgetLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("case_service_budget_limits")
        .select("*")
        .eq("case_id", caseId);

      if (fetchError) throw fetchError;
      setLimits((data as ServiceBudgetLimit[]) || []);
    } catch (err: any) {
      console.error("Error fetching service budget limits:", err);
      setError(err.message);
      setLimits([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const getServiceBudgetStatus = useCallback(async (
    instanceId: string
  ): Promise<ServiceBudgetStatus | null> => {
    try {
      const { data, error } = await supabase.rpc("get_service_budget_status", {
        p_case_service_instance_id: instanceId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        return data[0] as ServiceBudgetStatus;
      }
      return null;
    } catch (err: any) {
      console.error("Error getting service budget status:", err);
      return null;
    }
  }, []);

  const checkServiceBudget = useCallback(async (
    instanceId: string,
    additionalHours: number = 0,
    additionalAmount: number = 0
  ): Promise<ServiceBudgetCheckResult | null> => {
    try {
      const { data, error } = await supabase.rpc("check_service_budget_before_activity", {
        p_case_service_instance_id: instanceId,
        p_additional_hours: additionalHours,
        p_additional_amount: additionalAmount,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        return data[0] as ServiceBudgetCheckResult;
      }
      return null;
    } catch (err: any) {
      console.error("Error checking service budget:", err);
      return null;
    }
  }, []);

  const createLimit = useCallback(async (
    instanceId: string,
    organizationId: string,
    data: {
      max_hours?: number | null;
      max_amount?: number | null;
      warning_threshold?: number;
      notes?: string | null;
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("case_service_budget_limits")
        .insert({
          case_service_instance_id: instanceId,
          case_id: caseId,
          organization_id: organizationId,
          max_hours: data.max_hours,
          max_amount: data.max_amount,
          warning_threshold: data.warning_threshold ?? 80,
          notes: data.notes,
          created_by: user.id,
        });

      if (error) throw error;
      await fetchLimits();
      return true;
    } catch (err: any) {
      console.error("Error creating service budget limit:", err);
      setError(err.message);
      return false;
    }
  }, [caseId, fetchLimits]);

  const updateLimit = useCallback(async (
    limitId: string,
    data: {
      max_hours?: number | null;
      max_amount?: number | null;
      warning_threshold?: number;
      notes?: string | null;
    }
  ) => {
    try {
      const { error } = await supabase
        .from("case_service_budget_limits")
        .update(data)
        .eq("id", limitId);

      if (error) throw error;
      await fetchLimits();
      return true;
    } catch (err: any) {
      console.error("Error updating service budget limit:", err);
      setError(err.message);
      return false;
    }
  }, [fetchLimits]);

  const deleteLimit = useCallback(async (limitId: string) => {
    try {
      const { error } = await supabase
        .from("case_service_budget_limits")
        .delete()
        .eq("id", limitId);

      if (error) throw error;
      await fetchLimits();
      return true;
    } catch (err: any) {
      console.error("Error deleting service budget limit:", err);
      setError(err.message);
      return false;
    }
  }, [fetchLimits]);

  return {
    limits,
    loading,
    error,
    refetch: fetchLimits,
    getServiceBudgetStatus,
    checkServiceBudget,
    createLimit,
    updateLimit,
    deleteLimit,
  };
}

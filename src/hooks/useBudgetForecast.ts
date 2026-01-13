import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Budget forecast data structure per SYSTEM PROMPT 9
 * Includes actual consumption, pending billing items, and forecast totals
 */
export interface BudgetForecast {
  // Actual consumption (approved items only)
  hoursConsumed: number;
  amountConsumed: number;
  
  // Pending billing items (NOT definitively consumed per SYSTEM PROMPT 9)
  pendingHours: number;
  pendingAmount: number;
  pendingCount: number;
  
  // Forecast (actual + pending)
  hoursForecast: number;
  amountForecast: number;
  
  // Budget limits
  hoursAuthorized: number;
  amountAuthorized: number;
  
  // Utilization percentages (actual)
  hoursUtilizationPct: number;
  amountUtilizationPct: number;
  
  // Utilization percentages (forecast)
  hoursForecastUtilizationPct: number;
  amountForecastUtilizationPct: number;
  
  // Status flags (actual)
  isWarning: boolean;
  isExceeded: boolean;
  
  // Status flags (forecast) - SYSTEM PROMPT 9: Pending may trigger warnings
  isForecastWarning: boolean;
  isForecastExceeded: boolean;
  
  // Hard cap - SYSTEM PROMPT 9: May block approval later
  hardCap: boolean;
  
  // Budget exists
  hasBudget: boolean;
}

/**
 * Budget forecast warning result for billing item creation
 */
export interface BudgetForecastWarning {
  isForecastWarning: boolean;
  isForecastExceeded: boolean;
  hoursForecastUtilizationPct: number;
  amountForecastUtilizationPct: number;
  hardCap: boolean;
  pendingCount: number;
}

/**
 * Hook for fetching and managing budget forecast data
 * Per SYSTEM PROMPT 9: Update budget forecast consumption using pending billing items
 */
export function useBudgetForecast(caseId: string) {
  const [forecast, setForecast] = useState<BudgetForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async (): Promise<BudgetForecast | null> => {
    if (!caseId) {
      setForecast(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.rpc(
        "get_budget_forecast",
        { p_case_id: caseId }
      );

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const row = data[0];
        const forecastData: BudgetForecast = {
          hoursConsumed: row.hours_consumed || 0,
          amountConsumed: row.amount_consumed || 0,
          pendingHours: row.pending_hours || 0,
          pendingAmount: row.pending_amount || 0,
          pendingCount: row.pending_count || 0,
          hoursForecast: row.hours_forecast || 0,
          amountForecast: row.amount_forecast || 0,
          hoursAuthorized: row.hours_authorized || 0,
          amountAuthorized: row.amount_authorized || 0,
          hoursUtilizationPct: row.hours_utilization_pct || 0,
          amountUtilizationPct: row.amount_utilization_pct || 0,
          hoursForecastUtilizationPct: row.hours_forecast_utilization_pct || 0,
          amountForecastUtilizationPct: row.amount_forecast_utilization_pct || 0,
          isWarning: row.is_warning || false,
          isExceeded: row.is_exceeded || false,
          isForecastWarning: row.is_forecast_warning || false,
          isForecastExceeded: row.is_forecast_exceeded || false,
          hardCap: row.hard_cap || false,
          hasBudget: row.has_budget || false,
        };
        setForecast(forecastData);
        return forecastData;
      } else {
        setForecast(null);
        return null;
      }
    } catch (err: any) {
      console.error("Error fetching budget forecast:", err);
      setError(err.message);
      setForecast(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return {
    forecast,
    loading,
    error,
    refetch: fetchForecast,
  };
}

/**
 * Fetch budget forecast without hook (for use in callbacks)
 */
export async function fetchBudgetForecastOnce(caseId: string): Promise<BudgetForecastWarning | null> {
  if (!caseId) return null;

  try {
    const { data, error } = await supabase.rpc(
      "get_budget_forecast",
      { p_case_id: caseId }
    );

    if (error) throw error;

    if (data && data.length > 0) {
      const row = data[0];
      return {
        isForecastWarning: row.is_forecast_warning || false,
        isForecastExceeded: row.is_forecast_exceeded || false,
        hoursForecastUtilizationPct: row.hours_forecast_utilization_pct || 0,
        amountForecastUtilizationPct: row.amount_forecast_utilization_pct || 0,
        hardCap: row.hard_cap || false,
        pendingCount: row.pending_count || 0,
      };
    }
    return null;
  } catch (err) {
    console.error("Error fetching budget forecast:", err);
    return null;
  }
}

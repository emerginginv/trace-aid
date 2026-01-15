/**
 * useQuickBill Hook
 * 
 * Orchestrates the "Quick Bill" workflow that combines:
 * 1. Mark event as completed
 * 2. Create case_updates record linked to the event
 * 3. Create case_finances billing item linked to the update
 * 
 * This provides a one-click billing experience for events while
 * maintaining the "Updates are the source of truth" rule.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBillingEligibility, BillingEligibilityResult } from "./useBillingEligibility";
import { fetchBudgetForecastOnce, BudgetForecastWarning } from "./useBudgetForecast";
import { logBillingAudit } from "@/lib/billingAuditLogger";

export interface QuickBillParams {
  eventId: string;
  caseId: string;
  organizationId: string;
  workSummary: string;
  // Time confirmation fields
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  // For flat/per_activity pricing
  quantity?: number;
}

export interface QuickBillResult {
  success: boolean;
  error?: string;
  updateId?: string;
  billingItemId?: string;
  budgetWarning?: BudgetForecastWarning;
}

export interface QuickBillEligibility extends BillingEligibilityResult {
  eventTitle: string;
  eventDescription?: string;
  eventDate?: string;
  isCompleted: boolean;
}

export function useQuickBill() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { evaluate: evaluateBillingEligibility } = useBillingEligibility();

  /**
   * Check if an event is eligible for Quick Bill
   */
  const checkEligibility = useCallback(async (eventId: string): Promise<QuickBillEligibility | null> => {
    try {
      // Fetch event details
      const { data: event, error: eventError } = await supabase
        .from("case_activities")
        .select(`
          id,
          title,
          description,
          due_date,
          status,
          activity_type,
          case_service_instance_id,
          case_id,
          organization_id
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        console.error("Failed to fetch event:", eventError);
        return null;
      }

      // Must be an event
      if (event.activity_type !== "event") {
        return null;
      }

      // Must have a service linked
      if (!event.case_service_instance_id) {
        return null;
      }

      // Check billing eligibility using existing hook logic
      const eligibility = await evaluateBillingEligibility({
        activityId: eventId,
        caseServiceInstanceId: event.case_service_instance_id,
      });

      if (!eligibility.isEligible) {
        return null;
      }

      return {
        ...eligibility,
        eventTitle: event.title,
        eventDescription: event.description || undefined,
        eventDate: event.due_date || undefined,
        isCompleted: event.status === "completed",
      };
    } catch (error) {
      console.error("Error checking Quick Bill eligibility:", error);
      return null;
    }
  }, [evaluateBillingEligibility]);

  /**
   * Execute the Quick Bill workflow
   */
  const executeQuickBill = useCallback(async (params: QuickBillParams): Promise<QuickBillResult> => {
    const {
      eventId,
      caseId,
      organizationId,
      workSummary,
      startDate,
      startTime,
      endDate,
      endTime,
      quantity: providedQuantity,
    } = params;

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Step 1: Fetch event and validate
      const { data: event, error: eventError } = await supabase
        .from("case_activities")
        .select(`
          id,
          title,
          case_service_instance_id,
          organization_id
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        return { success: false, error: "Event not found" };
      }

      if (!event.case_service_instance_id) {
        return { success: false, error: "Event is not linked to a service" };
      }

      // Step 2: Get billing eligibility details
      const eligibility = await evaluateBillingEligibility({
        activityId: eventId,
        caseServiceInstanceId: event.case_service_instance_id,
      });

      if (!eligibility.isEligible) {
        return { success: false, error: eligibility.reason || "Event is not eligible for billing" };
      }

      // Step 3: Mark event as completed
      const { error: completeError } = await supabase
        .from("case_activities")
        .update({
          status: "completed",
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (completeError) {
        console.error("Failed to complete event:", completeError);
        return { success: false, error: "Failed to complete event" };
      }

      // Step 4: Create case update linked to the event
      const { data: update, error: updateError } = await supabase
        .from("case_updates")
        .insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: organizationId,
          title: `Billing Summary: ${event.title}`,
          description: workSummary,
          linked_activity_id: eventId,
          update_type: "Billing",
        })
        .select("id")
        .single();

      if (updateError || !update) {
        console.error("Failed to create update:", updateError);
        // Rollback: un-complete the event
        await supabase
          .from("case_activities")
          .update({
            status: "scheduled",
            completed: false,
            completed_at: null,
          })
          .eq("id", eventId);
        return { success: false, error: "Failed to create billing update" };
      }

      // Step 5: Calculate quantity based on pricing model and confirmed times
      let quantity = providedQuantity || eligibility.quantity || 1;
      const pricingModel = eligibility.pricingModel;
      
      if ((pricingModel === "hourly" || pricingModel === "daily") && 
          startDate && startTime && endDate && endTime) {
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);
        const diffMs = end.getTime() - start.getTime();
        
        if (diffMs > 0) {
          if (pricingModel === "hourly") {
            quantity = Math.max(0.25, diffMs / (1000 * 60 * 60));
          } else if (pricingModel === "daily") {
            quantity = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          }
        }
      }

      // Step 6: Create billing item (via case_finances)
      // We use a direct insert here since we have a valid update_id, bypassing the event guard
      const rate = eligibility.serviceRate || 0;
      const amount = rate * quantity;
      const billingDescription = buildBillingDescription(
        eligibility.serviceName || "Service",
        pricingModel || "hourly",
        quantity,
        rate
      );

      const { data: billingItem, error: billingError } = await supabase
        .from("case_finances")
        .insert({
          case_id: caseId,
          account_id: eligibility.accountId || null,
          case_service_instance_id: event.case_service_instance_id,
          activity_id: eventId,
          update_id: update.id,
          billing_type: "time",
          pricing_model: pricingModel,
          quantity: quantity,
          unit_price: rate,
          amount: amount,
          status: "pending_review",
          user_id: user.id,
          organization_id: organizationId,
          finance_type: "time",
          description: billingDescription,
          hourly_rate: pricingModel === "hourly" ? rate : null,
          hours: pricingModel === "hourly" ? quantity : null,
          date: new Date().toISOString().split("T")[0],
          category: pricingModel,
          notes: eligibility.pricingProfileId
            ? `Quick Bill from event. Pricing Profile: ${eligibility.pricingProfileId}`
            : "Quick Bill from event",
        })
        .select("id")
        .single();

      if (billingError || !billingItem) {
        console.error("Failed to create billing item:", billingError);
        // Rollback: delete the update and un-complete the event
        await supabase.from("case_updates").delete().eq("id", update.id);
        await supabase
          .from("case_activities")
          .update({
            status: "scheduled",
            completed: false,
            completed_at: null,
          })
          .eq("id", eventId);
        return { success: false, error: "Failed to create billing item" };
      }

      // Step 7: Update service instance
      await supabase
        .from("case_service_instances")
        .update({
          quantity_actual: quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.case_service_instance_id);

      // Step 8: Log audit event
      await logBillingAudit({
        action: "quick_bill_completed",
        organizationId: organizationId,
        metadata: {
          eventId,
          updateId: update.id,
          billingItemId: billingItem.id,
          caseId,
          serviceName: eligibility.serviceName,
          pricingModel,
          quantity,
          rate,
          amount,
        },
      });

      // Step 9: Check budget forecast
      const budgetWarning = await fetchBudgetForecastOnce(caseId);

      return {
        success: true,
        updateId: update.id,
        billingItemId: billingItem.id,
        budgetWarning: budgetWarning || undefined,
      };
    } catch (error) {
      console.error("Error in executeQuickBill:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    } finally {
      setIsProcessing(false);
    }
  }, [evaluateBillingEligibility]);

  /**
   * Complete event without billing (skip billing option)
   */
  const completeWithoutBilling = useCallback(async (
    eventId: string,
    caseId: string,
    organizationId: string,
    workSummary: string
  ): Promise<{ success: boolean; error?: string; updateId?: string }> => {
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Fetch event title
      const { data: event } = await supabase
        .from("case_activities")
        .select("title")
        .eq("id", eventId)
        .single();

      // Mark event as completed
      const { error: completeError } = await supabase
        .from("case_activities")
        .update({
          status: "completed",
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (completeError) {
        return { success: false, error: "Failed to complete event" };
      }

      // Create update without billing
      const { data: update, error: updateError } = await supabase
        .from("case_updates")
        .insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: organizationId,
          title: `Completed: ${event?.title || "Event"}`,
          description: workSummary,
          linked_activity_id: eventId,
          update_type: "Progress",
        })
        .select("id")
        .single();

      if (updateError) {
        // Rollback
        await supabase
          .from("case_activities")
          .update({ status: "scheduled", completed: false, completed_at: null })
          .eq("id", eventId);
        return { success: false, error: "Failed to create update" };
      }

      await logBillingAudit({
        action: "quick_bill_skipped",
        organizationId,
        metadata: { eventId, updateId: update.id, caseId },
      });

      return { success: true, updateId: update.id };
    } catch (error) {
      console.error("Error in completeWithoutBilling:", error);
      return { success: false, error: "Unknown error occurred" };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    checkEligibility,
    executeQuickBill,
    completeWithoutBilling,
    isProcessing,
  };
}

function buildBillingDescription(
  serviceName: string,
  pricingModel: string,
  quantity: number,
  rate: number
): string {
  const formattedRate = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(rate);

  switch (pricingModel) {
    case "hourly":
      return `${serviceName} - ${quantity.toFixed(2)} hours @ ${formattedRate}/hr`;
    case "daily":
      return `${serviceName} - ${quantity} day${quantity !== 1 ? "s" : ""} @ ${formattedRate}/day`;
    case "per_activity":
      return `${serviceName} - Activity @ ${formattedRate}`;
    case "flat":
      return `${serviceName} - Flat fee @ ${formattedRate}`;
    default:
      return `${serviceName} - ${quantity} units @ ${formattedRate}`;
  }
}

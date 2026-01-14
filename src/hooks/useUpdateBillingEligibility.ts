/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM PROMPT 12 COMPLIANCE: NON-BILLING RULE FOR GENERAL UPDATES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Updates that are NOT linked to a task or event must:
 * - Never display billing prompts
 * - Never request time confirmation
 * - Never create billing items
 * - Remain narrative-only records
 * 
 * IMPLEMENTATION (GATE 1 - lines 46-54):
 * → If linkedActivityId is null/undefined, immediately return isEligible: false
 * → This prevents any downstream billing logic from executing
 * → UpdateForm.tsx skips evaluation entirely if no linked activity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBillingEligibility, BillingEligibilityResult } from "./useBillingEligibility";
import { BillingEvaluationDiagnostics } from "@/types/billing";

export interface UpdateBillingEligibilityParams {
  linkedActivityId: string | null | undefined;
}

export interface UpdateBillingEligibilityResult extends BillingEligibilityResult {
  // Additional context for update-specific flow
  activityAlreadyBilled?: boolean;
  // Structured diagnostics for admin visibility (PART 3)
  diagnostics?: BillingEvaluationDiagnostics;
}

/**
 * Hook to check billing eligibility specifically for case updates.
 * 
 * Per SYSTEM PROMPT 4, billing eligibility for updates requires ALL conditions:
 * 1. Update is linked to a task/event (linked_activity_id IS NOT NULL)
 * 2. Activity is linked to Case Service Instance (case_activities.case_service_instance_id IS NOT NULL)
 * 3. Service Instance is billable (case_service_instances.billable = true OR case_services.is_billable = true)
 * 4. Pricing rule exists (service_pricing_rules check via profile hierarchy)
 * 5. Activity has NOT already generated a billing item (case_finances WHERE activity_id = X)
 */
export function useUpdateBillingEligibility() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<UpdateBillingEligibilityResult | null>(null);
  const { evaluate: evaluateBase } = useBillingEligibility();

  const evaluate = useCallback(async ({ linkedActivityId }: UpdateBillingEligibilityParams): Promise<UpdateBillingEligibilityResult> => {
    setIsEvaluating(true);

    // Initialize diagnostics object (PART 3: Admin Diagnostics)
    const diagnostics: BillingEvaluationDiagnostics = {
      has_linked_activity: false,
      has_service_instance: false,
      service_billable: false,
      pricing_rule_found: false,
      already_billed: false,
      eligible_for_billing: false,
      evaluated_at: new Date().toISOString(),
      context: {},
    };

    try {
      // GATE 1: Update must be linked to a task/event
      if (!linkedActivityId) {
        diagnostics.failure_reason = "Update is not linked to a task or event";
        const notEligible: UpdateBillingEligibilityResult = {
          isEligible: false,
          reason: "Update is not linked to a task or event",
          diagnostics,
        };
        setResult(notEligible);
        return notEligible;
      }
      
      diagnostics.has_linked_activity = true;
      diagnostics.context!.activityId = linkedActivityId;

      // Fetch the linked activity to get case_service_instance_id
      const { data: activityData, error: activityError } = await supabase
        .from("case_activities")
        .select("id, title, case_service_instance_id, case_id")
        .eq("id", linkedActivityId)
        .single();

      if (activityError || !activityData) {
        diagnostics.failure_reason = "Could not find linked activity";
        const notEligible: UpdateBillingEligibilityResult = {
          isEligible: false,
          reason: "Could not find linked activity",
          diagnostics,
        };
        setResult(notEligible);
        return notEligible;
      }

      // GATE 2: Activity must be linked to a Case Service Instance
      if (!activityData.case_service_instance_id) {
        diagnostics.failure_reason = "Linked activity is not associated with a service";
        const notEligible: UpdateBillingEligibilityResult = {
          isEligible: false,
          reason: "Linked activity is not associated with a service",
          diagnostics,
        };
        setResult(notEligible);
        return notEligible;
      }

      diagnostics.has_service_instance = true;
      diagnostics.context!.serviceInstanceId = activityData.case_service_instance_id;

      // GATE 5 (Early check): Activity must NOT already have a billing item
      const { data: existingBillingItem, error: billingCheckError } = await supabase
        .from("case_finances")
        .select("id")
        .eq("activity_id", linkedActivityId)
        .in("finance_type", ["time", "expense", "billing_item"])
        .limit(1)
        .maybeSingle();

      if (billingCheckError) {
        console.error("Error checking for existing billing item:", billingCheckError);
      }

      if (existingBillingItem) {
        diagnostics.already_billed = true;
        diagnostics.failure_reason = "This activity has already generated a billing item";
        const notEligible: UpdateBillingEligibilityResult = {
          isEligible: false,
          reason: "This activity has already generated a billing item",
          activityAlreadyBilled: true,
          diagnostics,
        };
        setResult(notEligible);
        return notEligible;
      }

      // GATES 3 & 4: Delegate to base billing eligibility hook
      const baseResult = await evaluateBase({
        activityId: linkedActivityId,
        caseServiceInstanceId: activityData.case_service_instance_id
      });

      // Update diagnostics based on base result
      diagnostics.service_billable = baseResult.isEligible || !baseResult.reason?.includes("not billable");
      diagnostics.pricing_rule_found = baseResult.isEligible || !baseResult.reason?.includes("pricing rule");
      diagnostics.eligible_for_billing = baseResult.isEligible;
      diagnostics.context!.serviceName = baseResult.serviceName;
      diagnostics.context!.pricingModel = baseResult.pricingModel;
      if (!baseResult.isEligible) {
        diagnostics.failure_reason = baseResult.reason;
      }

      const finalResult: UpdateBillingEligibilityResult = {
        ...baseResult,
        activityAlreadyBilled: false,
        diagnostics,
      };

      setResult(finalResult);
      return finalResult;
    } catch (error) {
      console.error("Error evaluating update billing eligibility:", error);
      diagnostics.failure_reason = "Error evaluating billing eligibility";
      const notEligible: UpdateBillingEligibilityResult = {
        isEligible: false,
        reason: "Error evaluating billing eligibility",
        diagnostics,
      };
      setResult(notEligible);
      return notEligible;
    } finally {
      setIsEvaluating(false);
    }
  }, [evaluateBase]);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    evaluate,
    reset,
    isEvaluating,
    result
  };
}

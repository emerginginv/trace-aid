/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * useUpdateBillingEligibility - PRIMARY BILLING ELIGIBILITY HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This is the ONLY hook that can return isEligible: true for billing.
 * 
 * REQUIREMENTS for billing eligibility:
 * 1. Update must be linked to an EVENT (activity_type = 'event', NOT 'task')
 * 2. Update must have a completed narrative (description IS NOT NULL/empty)
 * 3. Event must be linked to a billable Case Service Instance
 * 4. Pricing rule must exist for the service
 * 5. Activity has NOT already generated a billing item
 * 
 * TODO: Billing duration now derived from Time Entries.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPRECATED: Direct activity completion billing (useBillingEligibility)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The old workflow where completing an event would trigger a billing prompt
 * is DEPRECATED. Billing is now triggered via the Updates workflow only.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBillingEligibility, BillingEligibilityResult } from "./useBillingEligibility";
import { BillingEvaluationDiagnostics } from "@/types/billing";

export interface UpdateBillingEligibilityParams {
  linkedActivityId: string | null | undefined;
  /** The update narrative description - REQUIRED for billing eligibility */
  updateDescription?: string | null;
}

export interface UpdateBillingEligibilityResult extends BillingEligibilityResult {
  // Additional context for update-specific flow
  activityAlreadyBilled?: boolean;
  // Structured diagnostics for admin visibility (PART 3)
  diagnostics?: BillingEvaluationDiagnostics;
  // Activity type to control billing UI flow
  activityType?: 'task' | 'event';
}

/**
 * Hook to check billing eligibility for case updates.
 * 
 * This is the ONLY hook that can return isEligible: true for billing.
 * 
 * REQUIREMENTS (ALL must be met):
 * 1. Update is linked to an EVENT (activity_type = 'event', NOT 'task')
 * 2. Update has a completed narrative (updateDescription is not empty)
 * 3. Event is linked to Case Service Instance (case_activities.case_service_instance_id IS NOT NULL)
 * 4. Service Instance is billable (case_service_instances.billable = true OR case_services.is_billable = true)
 * 5. Pricing rule exists (service_pricing_rules check via profile hierarchy)
 * 6. Activity has NOT already generated a billing item (case_finances WHERE activity_id = X)
 */
export function useUpdateBillingEligibility() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<UpdateBillingEligibilityResult | null>(null);
  const { evaluate: evaluateBase } = useBillingEligibility();

  const evaluate = useCallback(async ({ linkedActivityId, updateDescription }: UpdateBillingEligibilityParams): Promise<UpdateBillingEligibilityResult> => {
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
      // GATE 0: Update must have a completed narrative
      const hasNarrative = updateDescription && updateDescription.trim().length > 0;
      if (!hasNarrative) {
        diagnostics.failure_reason = "Update narrative is required for billing eligibility";
        const notEligible: UpdateBillingEligibilityResult = {
          isEligible: false,
          reason: "Update narrative is required for billing eligibility",
          diagnostics,
        };
        setResult(notEligible);
        return notEligible;
      }

      // GATE 1: Update must be linked to an activity
      if (!linkedActivityId) {
        diagnostics.failure_reason = "Update is not linked to an event";
        const notEligible: UpdateBillingEligibilityResult = {
          isEligible: false,
          reason: "Update is not linked to an event",
          diagnostics,
        };
        setResult(notEligible);
        return notEligible;
      }
      
      diagnostics.has_linked_activity = true;
      diagnostics.context!.activityId = linkedActivityId;

      // Fetch the linked activity to get case_service_instance_id AND verify it's an EVENT
      const { data: activityData, error: activityError } = await supabase
        .from("case_activities")
        .select("id, title, case_service_instance_id, case_id, activity_type")
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

      // Store activity type for UI flow control
      const activityType = activityData.activity_type as 'task' | 'event';
      diagnostics.context!.activityType = activityType;

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
        activityType: activityData.activity_type as 'task' | 'event',
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

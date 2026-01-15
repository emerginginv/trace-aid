/**
 * useBillingEligibility Hook
 * 
 * Evaluates whether an activity is eligible for billing based on multiple gates.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM PROMPT 7 COMPLIANCE: AUTOMATIC PRICING RESOLUTION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Pricing is resolved automatically using the following priority order:
 * 
 * 1. Case-level pricing profile (case.pricing_profile_id)
 * 2. Account-level default pricing profile (accounts.default_pricing_profile_id)
 * 3. Organization default pricing profile (pricing_profiles.is_default = true)
 * 
 * CRITICAL RULE:
 * Do NOT prompt the user to select pricing. The system automatically resolves
 * the applicable pricing profile based on the hierarchy above.
 * 
 * IMPLEMENTATION:
 * → Lines 166-210: Pricing profile resolution logic
 * → First checks case.pricing_profile_id
 * → If null, uses account.default_pricing_profile_id via case.accounts relation
 * → If still null, fetches organization default pricing profile
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM PROMPT 7B COMPLIANCE: FLAT-FEE SAFEGUARD
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * If the service pricing model is flat_fee:
 * - Allow only ONE billing item per Case Service Instance
 * - If a billing item already exists:
 *   → Block creation
 *   → Display: "This service has already been billed under a flat fee."
 * 
 * IMPLEMENTATION (lines 315-352):
 * 1. Check if instance has invoice_line_item_id (already invoiced)
 * 2. Check for existing billing items in case_finances
 * 3. Return isEligible: false with warning message
 * 
 * DOUBLE-CHECK in useBillingItemCreation.ts (lines 123-152):
 * - Prevents race conditions by re-validating at creation time
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BillingEligibilityResult {
  isEligible: boolean;
  reason?: string;
  serviceInstanceId?: string;
  serviceName?: string;
  serviceRate?: number;
  priceUnit?: string;
  pricingModel?: string;
  quantity?: number;
  estimatedAmount?: number;
  activityId?: string;
  activityTitle?: string;
  // Time confirmation fields per SYSTEM PROMPT 6
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  // Audit and creation fields per SYSTEM PROMPT 8
  caseId?: string;
  organizationId?: string;
  accountId?: string;  // Required per SYSTEM PROMPT 8
  pricingProfileId?: string;
  pricingRuleId?: string;
  pricingRuleSnapshot?: Record<string, unknown>;
}

interface EvaluateParams {
  activityId: string;
  caseServiceInstanceId?: string | null;
}

export function useBillingEligibility() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<BillingEligibilityResult | null>(null);

  const evaluate = useCallback(async ({ activityId, caseServiceInstanceId }: EvaluateParams): Promise<BillingEligibilityResult> => {
    setIsEvaluating(true);
    
    try {
      // ═══════════════════════════════════════════════════════════════════════════════
      // DEPRECATED: This hook is no longer the primary billing eligibility evaluator.
      // ═══════════════════════════════════════════════════════════════════════════════
      // Billing eligibility MUST now be evaluated via useUpdateBillingEligibility,
      // which requires:
      //   1. A linked EVENT (activity_type = 'event')
      //   2. A completed update narrative
      // 
      // This hook is retained as a helper for service/pricing validation only.
      // It should NOT be called directly for billing decisions.
      // TODO: Billing moved to Updates workflow.
      // ═══════════════════════════════════════════════════════════════════════════════
      
      // GATE 1: Activity must be linked to a Case Service Instance
      if (!caseServiceInstanceId) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: "Activity is not linked to a service"
        };
        setResult(notEligible);
        return notEligible;
      }

      // Fetch the service instance with its service details
      const { data: instanceData, error: instanceError } = await supabase
        .from("case_service_instances")
        .select(`
          id,
          billable,
          billed_at,
          locked_at,
          quantity_actual,
          scheduled_start,
          scheduled_end,
          case_id,
          case_service_id,
          invoice_line_item_id,
          organization_id,
          case_services (
            id,
            name,
            is_billable,
            default_rate,
            budget_unit
          )
        `)
        .eq("id", caseServiceInstanceId)
        .single();

      if (instanceError || !instanceData) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: "Could not find linked service instance"
        };
        setResult(notEligible);
        return notEligible;
      }

      const service = instanceData.case_services;

      // GATE 2: Service Instance must be marked billable
      // Check instance-level billable first, then fall back to service-level is_billable
      const isBillable = instanceData.billable !== null 
        ? instanceData.billable 
        : service?.is_billable;
        
      if (!isBillable) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: "Service is not billable"
        };
        setResult(notEligible);
        return notEligible;
      }

      // GATE 5: Check if already billed or locked (check early to avoid unnecessary queries)
      if (instanceData.billed_at) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: "Service has already been billed"
        };
        setResult(notEligible);
        return notEligible;
      }

      if (instanceData.locked_at) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: "Service is locked by an invoice"
        };
        setResult(notEligible);
        return notEligible;
      }

      // GATE 3: Pricing rule must exist for the service
      // Get case details for pricing profile resolution and account_id (per SYSTEM PROMPT 8)
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select(`
          pricing_profile_id,
          organization_id,
          account_id,
          accounts (
            default_pricing_profile_id
          )
        `)
        .eq("id", instanceData.case_id)
        .single();

      if (caseError || !caseData) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: "Could not resolve case details"
        };
        setResult(notEligible);
        return notEligible;
      }

      // Determine applicable pricing profile(s) with priority:
      // 1. Case's pricing_profile_id
      // 2. Account's default_pricing_profile_id
      // 3. Organization's default pricing profile
      const profileIds: string[] = [];
      
      if (caseData.pricing_profile_id) {
        profileIds.push(caseData.pricing_profile_id);
      }
      
      if (caseData.accounts?.default_pricing_profile_id) {
        profileIds.push(caseData.accounts.default_pricing_profile_id);
      }

      // If no explicit profiles, get org default
      if (profileIds.length === 0 && caseData.organization_id) {
        const { data: defaultProfile } = await supabase
          .from("pricing_profiles")
          .select("id")
          .eq("organization_id", caseData.organization_id)
          .eq("is_default", true)
          .limit(1)
          .maybeSingle();
          
        if (defaultProfile?.id) {
          profileIds.push(defaultProfile.id);
        }
      }

      // Check if pricing rule exists for this service under any applicable profile
      let pricingRule: { id: string; rate: number; pricing_model: string; pricing_profile_id: string } | null = null;
      
      if (profileIds.length > 0) {
        const { data: ruleData } = await supabase
          .from("service_pricing_rules")
          .select("id, default_rate, pricing_model, pricing_profile_id")
          .eq("case_service_id", instanceData.case_service_id)
          .in("pricing_profile_id", profileIds)
          .limit(1)
          .maybeSingle();
          
        if (ruleData) {
          pricingRule = { ...ruleData, rate: ruleData.default_rate };
        }
      }

      if (!pricingRule) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: "No pricing rule found for this service"
        };
        setResult(notEligible);
        return notEligible;
      }

      // GATE 4: Quantifiable data must exist based on pricing model
      const pricingModel = pricingRule.pricing_model;
      let quantity: number | undefined;

      // ═══════════════════════════════════════════════════════════════════════════════
      // TODO: Billing duration now derived from Time Entries.
      // ═══════════════════════════════════════════════════════════════════════════════
      // DEPRECATED: The following case_activities fields are NO LONGER used for billing:
      //   - start_time
      //   - end_time
      //   - due_date
      //   - end_date
      // These fields remain for scheduling/display purposes only.
      // Duration for billing should come from linked Time Entry records.
      // ═══════════════════════════════════════════════════════════════════════════════
      
      // Fetch activity data for title/type only - NOT for billing duration
      const { data: activityData } = await supabase
        .from("case_activities")
        .select("title, activity_type")
        .eq("id", activityId)
        .limit(1)
        .maybeSingle();

      // DEPRECATED: Event duration calculation from activity fields
      // This logic block is disabled - duration should come from Time Entries
      const activityDurationHours: number | undefined = undefined;
      const activityDurationDays: number | undefined = undefined;
      // Previously calculated from: due_date, end_date, start_time, end_time
      // Now: Billing duration now derived from Time Entries.

      switch (pricingModel) {
        case "hourly":
        case "daily": {
          // Check for duration data
          if (pricingModel === "hourly" && activityDurationHours) {
            quantity = activityDurationHours;
          } else if (pricingModel === "daily" && activityDurationDays) {
            quantity = activityDurationDays;
          } else if (instanceData.quantity_actual && instanceData.quantity_actual > 0) {
            quantity = instanceData.quantity_actual;
          } else if (instanceData.scheduled_start && instanceData.scheduled_end) {
            // Calculate duration from scheduled times
            const start = new Date(instanceData.scheduled_start);
            const end = new Date(instanceData.scheduled_end);
            const diffMs = end.getTime() - start.getTime();
            
            if (pricingModel === "hourly") {
              quantity = Math.max(0.25, diffMs / (1000 * 60 * 60)); // Hours, minimum 15 min
            } else {
              quantity = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))); // Days
            }
          }
          
          if (!quantity || quantity <= 0) {
            const notEligible: BillingEligibilityResult = {
              isEligible: false,
              reason: "No duration/quantity recorded for this activity"
            };
            setResult(notEligible);
            return notEligible;
          }
          break;
        }
          
        case "per_activity":
          // Activity completion itself is the quantity
          quantity = 1;
          break;
          
        case "flat": {
          // FLAT-FEE ENFORCEMENT: Check if billing item already exists for this service instance
          // Check if service instance already has an invoice line item
          if (instanceData.invoice_line_item_id) {
            const notEligible: BillingEligibilityResult = {
              isEligible: false,
              reason: "This service has already been billed under a flat fee."
            };
            setResult(notEligible);
            return notEligible;
          }
          
          // Also check for existing pending billing items linked to this service instance
          const { data: existingBillingItem } = await supabase
            .from("case_finances")
            .select(`
              id,
              case_activities!inner (
                case_service_instance_id
              )
            `)
            .eq("case_id", instanceData.case_id)
            .eq("finance_type", "billing_item")
            .eq("case_activities.case_service_instance_id", caseServiceInstanceId)
            .limit(1)
            .maybeSingle();
            
          if (existingBillingItem) {
            const notEligible: BillingEligibilityResult = {
              isEligible: false,
              reason: "This service has already been billed under a flat fee."
            };
            setResult(notEligible);
            return notEligible;
          }
          
          quantity = 1;
          break;
        }
          
        default:
          // Unknown pricing model - require quantity_actual
          if (!instanceData.quantity_actual || instanceData.quantity_actual <= 0) {
            const notEligible: BillingEligibilityResult = {
              isEligible: false,
              reason: "No quantity recorded for this activity"
            };
            setResult(notEligible);
            return notEligible;
          }
          quantity = instanceData.quantity_actual;
      }


      // Activity title already loaded above (activityData)


      // Calculate estimated amount
      const estimatedAmount = pricingRule.rate * (quantity || 1);

      // All gates passed - eligible for billing prompt
      const eligible: BillingEligibilityResult = {
        isEligible: true,
        serviceInstanceId: instanceData.id,
        serviceName: service?.name,
        serviceRate: pricingRule.rate,
        priceUnit: pricingModel === "hourly" ? "hour" : 
                   pricingModel === "daily" ? "day" : 
                   pricingModel === "flat" ? "flat" : 
                   pricingModel === "per_activity" ? "activity" :
                   service?.budget_unit || "unit",
        pricingModel,
        quantity,
        estimatedAmount,
        activityId,
        activityTitle: activityData?.title,
        // DEPRECATED: Time confirmation fields from case_activities
        // TODO: Billing duration now derived from Time Entries.
        // These fields are no longer populated from activity scheduling fields.
        // startDate, startTime, endDate, endTime should come from Time Entry records.
        startDate: undefined,
        startTime: undefined,
        endDate: undefined,
        endTime: undefined,
        // Audit fields for billing item creation per SYSTEM PROMPT 8
        caseId: instanceData.case_id,
        organizationId: instanceData.organization_id,
        accountId: caseData?.account_id || undefined,  // Required per SYSTEM PROMPT 8
        pricingProfileId: pricingRule.pricing_profile_id,
        pricingRuleId: pricingRule.id,
        pricingRuleSnapshot: {
          id: pricingRule.id,
          rate: pricingRule.rate,
          pricing_model: pricingRule.pricing_model,
          captured_at: new Date().toISOString(),
        },
      };
      
      setResult(eligible);
      return eligible;
    } catch (error) {
      console.error("Error evaluating billing eligibility:", error);
      const notEligible: BillingEligibilityResult = {
        isEligible: false,
        reason: "Error evaluating eligibility"
      };
      setResult(notEligible);
      return notEligible;
    } finally {
      setIsEvaluating(false);
    }
  }, []);

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

/**
 * useBillingEligibility Hook
 * 
 * Evaluates whether an activity is eligible for billing based on multiple gates.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * BILLING RATE RESOLUTION (POST PRICING PROFILE REMOVAL)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Pricing is resolved using the following priority order:
 * 
 * 1. Account-specific rate via client_price_list
 * 2. Default rate from case_services table
 * 
 * CRITICAL RULE:
 * Do NOT prompt the user to select pricing. The system automatically resolves
 * the applicable rate based on the hierarchy above.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FLAT-FEE SAFEGUARD
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * If the service pricing model is flat_fee:
 * - Allow only ONE billing item per Case Service Instance
 * - If a billing item already exists:
 *   → Block creation
 *   → Display: "This service has already been billed under a flat fee."
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
  // Time confirmation fields
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  // Audit and creation fields
  caseId?: string;
  organizationId?: string;
  accountId?: string;
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

      // GATE 3: Check if already billed or locked
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

      // Get case details for account_id
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("organization_id, account_id")
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

      // GATE 4: Resolve billing rate
      // Priority: 1. client_price_list (account-specific), 2. case_services.default_rate
      let billingRate: number | null = null;
      let pricingModel = "hourly"; // Default model

      // Check for account-specific rate in client_price_list
      if (caseData.account_id && instanceData.case_service_id) {
        const today = new Date().toISOString().split("T")[0];
        const { data: clientRate } = await supabase
          .from("client_price_list")
          .select("custom_invoice_rate")
          .eq("account_id", caseData.account_id)
          .eq("finance_item_id", instanceData.case_service_id)
          .or(`effective_date.is.null,effective_date.lte.${today}`)
          .or(`end_date.is.null,end_date.gte.${today}`)
          .limit(1)
          .maybeSingle();

        if (clientRate?.custom_invoice_rate) {
          billingRate = clientRate.custom_invoice_rate;
        }
      }

      // Fallback to service default rate
      if (!billingRate && service?.default_rate) {
        billingRate = service.default_rate;
      }

      if (!billingRate) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: "No billing rate configured for this service"
        };
        setResult(notEligible);
        return notEligible;
      }

      // GATE 5: Quantifiable data must exist based on pricing model
      let quantity: number | undefined;

      // Fetch activity data for title only
      const { data: activityData } = await supabase
        .from("case_activities")
        .select("title, activity_type")
        .eq("id", activityId)
        .limit(1)
        .maybeSingle();

      switch (pricingModel) {
        case "hourly":
        case "daily": {
          if (instanceData.quantity_actual && instanceData.quantity_actual > 0) {
            quantity = instanceData.quantity_actual;
          } else if (instanceData.scheduled_start && instanceData.scheduled_end) {
            const start = new Date(instanceData.scheduled_start);
            const end = new Date(instanceData.scheduled_end);
            const diffMs = end.getTime() - start.getTime();
            
            if (pricingModel === "hourly") {
              quantity = Math.max(0.25, diffMs / (1000 * 60 * 60));
            } else {
              quantity = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
          quantity = 1;
          break;
          
        case "flat": {
          // FLAT-FEE ENFORCEMENT
          if (instanceData.invoice_line_item_id) {
            const notEligible: BillingEligibilityResult = {
              isEligible: false,
              reason: "This service has already been billed under a flat fee."
            };
            setResult(notEligible);
            return notEligible;
          }
          
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

      // Calculate estimated amount
      const estimatedAmount = billingRate * (quantity || 1);

      // All gates passed - eligible for billing
      const eligible: BillingEligibilityResult = {
        isEligible: true,
        serviceInstanceId: instanceData.id,
        serviceName: service?.name,
        serviceRate: billingRate,
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
        startDate: undefined,
        startTime: undefined,
        endDate: undefined,
        endTime: undefined,
        caseId: instanceData.case_id,
        organizationId: instanceData.organization_id,
        accountId: caseData?.account_id || undefined,
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

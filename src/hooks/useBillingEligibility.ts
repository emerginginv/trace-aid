/**
 * useBillingEligibility Hook
 * 
 * Evaluates whether an activity is eligible for billing based on multiple gates.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INVARIANT 1: CLIENT BILLING RATES LIVE ONLY ON THE ACCOUNT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * BILLING RATE RESOLUTION ORDER:
 * 1. Identify the Account (from case.account_id)
 * 2. Identify the Finance Item (from case_service_id)
 * 3. Pull rate from client_price_list (account-specific rate)
 * 4. Apply quantity based on pricing model
 * 5. Lock rate on invoice line item at invoice generation
 * 
 * STRICT RULES:
 * - Rates are resolved ONLY from client_price_list table
 * - NO FALLBACK to organization defaults (finance_items.default_invoice_rate)
 * - Billing is BLOCKED if no account-specific rate exists
 * - Invoices NEVER recalculate if rates change later
 * - Invoice line items store frozen/resolved rates at creation
 * 
 * NOTE: finance_items.default_invoice_rate is for UI SUGGESTION ONLY
 * (pre-populating forms when creating new account rates)
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

      // GATE 4: Resolve billing rate from client_price_list (INVARIANT 1)
      // Billing rates come ONLY from account-specific client_price_list - NO FALLBACK
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

      // NO FALLBACK: If no account-specific rate, billing is not eligible
      if (!billingRate) {
        const notEligible: BillingEligibilityResult = {
          isEligible: false,
          reason: `Missing billing rate: Configure rate for "${service?.name || 'this service'}" in Account > Billing Rates`
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

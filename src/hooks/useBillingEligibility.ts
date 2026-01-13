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
      // Get case details for pricing profile resolution
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select(`
          pricing_profile_id,
          organization_id,
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
      let pricingRule: { rate: number; pricing_model: string } | null = null;
      
      if (profileIds.length > 0) {
        const { data: ruleData } = await supabase
          .from("service_pricing_rules")
          .select("rate, pricing_model")
          .eq("case_service_id", instanceData.case_service_id)
          .in("pricing_profile_id", profileIds)
          .limit(1)
          .maybeSingle();
          
        if (ruleData) {
          pricingRule = ruleData;
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

      switch (pricingModel) {
        case "hourly":
        case "daily": {
          // Check for duration data
          if (instanceData.quantity_actual && instanceData.quantity_actual > 0) {
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
          
        case "flat":
          // Flat rate - always valid, quantity is 1
          quantity = 1;
          break;
          
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

      // Fetch activity title
      const { data: activityData } = await supabase
        .from("case_activities")
        .select("title")
        .eq("id", activityId)
        .single();

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
        activityTitle: activityData?.title
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

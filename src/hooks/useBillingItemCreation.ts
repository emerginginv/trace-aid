import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CreateBillingItemParams {
  activityId: string;
  caseServiceInstanceId: string;
  caseId: string;
  organizationId: string;
  serviceName: string;
  pricingModel: string;
  quantity: number;
  rate: number;
  pricingProfileId?: string;
  pricingRuleSnapshot?: Record<string, unknown>;
}

export interface CreateBillingItemResult {
  success: boolean;
  error?: string;
  billingItemId?: string;
}

export function useBillingItemCreation() {
  const [isCreating, setIsCreating] = useState(false);

  const createBillingItem = useCallback(async (params: CreateBillingItemParams): Promise<CreateBillingItemResult> => {
    const {
      activityId,
      caseServiceInstanceId,
      caseId,
      organizationId,
      serviceName,
      pricingModel,
      quantity,
      rate,
      pricingProfileId,
      pricingRuleSnapshot,
    } = params;

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // FLAT-FEE ENFORCEMENT: Check if billing item already exists for this service instance
      if (pricingModel === "flat") {
        // Check for existing billing record linked to this service instance
        const { data: existingBillingItem } = await supabase
          .from("case_finances")
          .select(`
            id,
            case_activities!inner (
              case_service_instance_id
            )
          `)
          .eq("case_id", caseId)
          .eq("finance_type", "billing_item")
          .eq("case_activities.case_service_instance_id", caseServiceInstanceId)
          .limit(1)
          .maybeSingle();

        // Also check if service instance already has an invoice line item
        const { data: serviceInstance } = await supabase
          .from("case_service_instances")
          .select("invoice_line_item_id")
          .eq("id", caseServiceInstanceId)
          .single();

        if (existingBillingItem || serviceInstance?.invoice_line_item_id) {
          return { 
            success: false, 
            error: "This service has already been billed under a flat-fee." 
          };
        }
      }

      // Calculate amount
      const amount = rate * quantity;

      // Create billing record in case_finances (pending billing item)
      const billingDescription = buildBillingDescription(serviceName, pricingModel, quantity, rate);
      
      const { data: billingItem, error: insertError } = await supabase
        .from("case_finances")
        .insert({
          case_id: caseId,
          organization_id: organizationId,
          user_id: user.id,
          activity_id: activityId,
          finance_type: "billing_item",
          description: billingDescription,
          amount: amount,
          hourly_rate: pricingModel === "hourly" ? rate : null,
          hours: pricingModel === "hourly" ? quantity : null,
          quantity: quantity,
          unit_price: rate,
          date: new Date().toISOString().split('T')[0],
          status: "pending",
          category: pricingModel,
          notes: pricingProfileId 
            ? `Pricing Profile: ${pricingProfileId}. ${pricingRuleSnapshot ? JSON.stringify(pricingRuleSnapshot) : ''}`
            : null,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating billing item:", insertError);
        return { success: false, error: insertError.message };
      }

      // Update service instance with quantity and mark ready for billing
      const { error: updateError } = await supabase
        .from("case_service_instances")
        .update({
          quantity_actual: quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseServiceInstanceId);

      if (updateError) {
        console.error("Error updating service instance:", updateError);
        // Don't fail the whole operation, billing item was created
      }

      return { 
        success: true, 
        billingItemId: billingItem.id 
      };
    } catch (error) {
      console.error("Error in createBillingItem:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      };
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createBillingItem,
    isCreating,
  };
}

/**
 * Build a descriptive billing description based on pricing model
 */
function buildBillingDescription(
  serviceName: string,
  pricingModel: string,
  quantity: number,
  rate: number
): string {
  const formattedRate = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(rate);

  switch (pricingModel) {
    case "hourly":
      return `${serviceName} - ${quantity.toFixed(2)} hours @ ${formattedRate}/hr`;
    case "daily":
      return `${serviceName} - ${quantity} day${quantity !== 1 ? 's' : ''} @ ${formattedRate}/day`;
    case "per_activity":
      return `${serviceName} - Activity @ ${formattedRate}`;
    case "flat":
      return `${serviceName} - Flat fee @ ${formattedRate}`;
    default:
      return `${serviceName} - ${quantity} units @ ${formattedRate}`;
  }
}

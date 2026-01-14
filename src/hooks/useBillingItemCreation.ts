import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchBudgetForecastOnce, BudgetForecastWarning } from "./useBudgetForecast";

export interface CreateBillingItemParams {
  activityId: string;
  caseServiceInstanceId: string;
  caseId: string;
  organizationId: string;
  accountId?: string;  // Required per SYSTEM PROMPT 8
  serviceName: string;
  pricingModel: string;
  quantity: number;
  rate: number;
  pricingProfileId?: string;
  pricingRuleSnapshot?: Record<string, unknown>;
  // SYSTEM PROMPT 9: New required fields
  updateId?: string;    // Links billing item to case_updates.id
  startTime?: string;   // ISO timestamp from confirmation
  endTime?: string;     // ISO timestamp from confirmation
}

/**
 * Determine billing_type based on pricing model per SYSTEM PROMPT 8
 * - 'time' for hourly/daily services
 * - 'expense' for per_activity/flat services
 */
function getBillingType(pricingModel: string): 'time' | 'expense' {
  switch (pricingModel) {
    case 'hourly':
    case 'daily':
      return 'time';
    case 'per_activity':
    case 'flat':
    default:
      return 'expense';
  }
}

/**
 * Result from creating a billing item
 * Per SYSTEM PROMPT 9: Includes budget warning info for pending items
 */
export interface CreateBillingItemResult {
  success: boolean;
  error?: string;
  billingItemId?: string;
  // SYSTEM PROMPT 9: Budget forecast warning info
  budgetWarning?: BudgetForecastWarning;
}

export function useBillingItemCreation() {
  const [isCreating, setIsCreating] = useState(false);

  const createBillingItem = useCallback(async (params: CreateBillingItemParams): Promise<CreateBillingItemResult> => {
    const {
      activityId,
      caseServiceInstanceId,
      caseId,
      organizationId,
      accountId,
      serviceName,
      pricingModel,
      quantity,
      rate,
      pricingProfileId,
      pricingRuleSnapshot,
      // SYSTEM PROMPT 9: New fields
      updateId,
      startTime,
      endTime,
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
      // Per SYSTEM PROMPT 9: Create Billing Item with status pending_review
      const billingDescription = buildBillingDescription(serviceName, pricingModel, quantity, rate);
      
      const { data: billingItem, error: insertError } = await supabase
        .from("case_finances")
        .insert({
          // Required fields per SYSTEM PROMPT 9
          case_id: caseId,
          account_id: accountId || null,                    // SYSTEM PROMPT 9
          case_service_instance_id: caseServiceInstanceId,  // SYSTEM PROMPT 9
          activity_id: activityId,                          // SYSTEM PROMPT 9
          update_id: updateId || null,                      // SYSTEM PROMPT 9: Link to case update
          billing_type: 'time',                             // SYSTEM PROMPT 9: Always 'time'
          start_time: startTime || null,                    // SYSTEM PROMPT 9: Confirmed start time
          end_time: endTime || null,                        // SYSTEM PROMPT 9: Confirmed end time
          pricing_model: pricingModel,
          quantity: quantity,
          unit_price: rate,                                 // rate
          amount: amount,
          status: "pending_review",                         // SYSTEM PROMPT 9: Always pending_review
          user_id: user.id,                                 // created_by
          
          // Additional context fields
          organization_id: organizationId,
          finance_type: 'time',                             // Match billing_type per SP9
          description: billingDescription,
          hourly_rate: pricingModel === "hourly" ? rate : null,
          hours: pricingModel === "hourly" ? quantity : null,
          date: new Date().toISOString().split('T')[0],
          category: pricingModel,                           // Keep for backwards compatibility
          notes: pricingProfileId 
            ? `Pricing Profile: ${pricingProfileId}. ${pricingRuleSnapshot ? JSON.stringify(pricingRuleSnapshot) : ''}`
            : null,
          // SYSTEM PROMPT 9 Rules:
          // - Do not approve automatically (status: 'pending_review')
          // - Do not invoice automatically (invoiced: false is default, invoice_id: null)
          // - Do not lock the update or activity (no locked_at update)
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

      // SYSTEM PROMPT 9: Check budget forecast after creating pending billing item
      // Pending billing items may trigger warnings but do NOT consume budget definitively
      const budgetWarning = await fetchBudgetForecastOnce(caseId);

      return { 
        success: true, 
        billingItemId: billingItem.id,
        budgetWarning: budgetWarning || undefined,
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

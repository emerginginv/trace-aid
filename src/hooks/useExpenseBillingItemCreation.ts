/**
 * useExpenseBillingItemCreation Hook
 * 
 * Creates pending expense billing items from case updates.
 * Maintains full audit trail linking expense to source update.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPENSE-FROM-UPDATE WORKFLOW
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Allows users to create expense items (mileage, materials, filing fees, etc.)
 * directly from the update workflow, with the same audit linkage as time entries.
 * 
 * REQUIRED FIELDS:
 * - case_id
 * - organization_id
 * - update_id (links expense to source update for audit trail)
 * - activity_id (optional - links to task/event)
 * - category (expense category: mileage, materials, etc.)
 * - description
 * - quantity
 * - unit_price
 * - amount (calculated)
 * - finance_type = 'expense'
 * - billing_type = 'expense'
 * - status = 'pending_review'
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchBudgetForecastOnce, BudgetForecastWarning } from "./useBudgetForecast";
import { logBillingAudit } from "@/lib/billingAuditLogger";

export interface ExpenseCategory {
  value: string;
  label: string;
  defaultRate: number | null;
  unit?: string;
}

/**
 * Standard expense categories with optional default rates
 */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { value: 'mileage', label: 'Mileage', defaultRate: 0.67, unit: 'mile' },
  { value: 'filing_fees', label: 'Filing Fees', defaultRate: null },
  { value: 'materials', label: 'Materials/Supplies', defaultRate: null },
  { value: 'meals', label: 'Meals', defaultRate: null },
  { value: 'lodging', label: 'Lodging', defaultRate: null },
  { value: 'parking', label: 'Parking/Tolls', defaultRate: null },
  { value: 'service_fees', label: 'Service of Process', defaultRate: null },
  { value: 'travel', label: 'Travel (non-mileage)', defaultRate: null },
  { value: 'other', label: 'Other', defaultRate: null },
];

export interface CreateExpenseParams {
  /** Links expense to the source update for audit trail */
  updateId: string;
  /** Links expense to task/event (optional) */
  activityId?: string;
  caseId: string;
  organizationId: string;
  accountId?: string;
  caseServiceInstanceId?: string;
  /** Expense category (mileage, materials, etc.) */
  category: string;
  /** Description of the expense */
  description: string;
  /** Number of units (e.g., 45 miles) */
  quantity: number;
  /** Price per unit (e.g., $0.67/mile) */
  unitPrice: number;
}

export interface CreateExpenseResult {
  success: boolean;
  error?: string;
  expenseId?: string;
  budgetWarning?: BudgetForecastWarning;
}

export function useExpenseBillingItemCreation() {
  const [isCreating, setIsCreating] = useState(false);

  const createExpenseItem = useCallback(async (params: CreateExpenseParams): Promise<CreateExpenseResult> => {
    const {
      updateId,
      activityId,
      caseId,
      organizationId,
      accountId,
      caseServiceInstanceId,
      category,
      description,
      quantity,
      unitPrice,
    } = params;

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Calculate total amount
      const amount = unitPrice * quantity;

      // Build expense description
      const categoryLabel = EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category;
      const categoryUnit = EXPENSE_CATEGORIES.find(c => c.value === category)?.unit;
      
      let expenseDescription = description;
      if (category === 'mileage' && quantity > 0) {
        expenseDescription = `${description} - ${quantity} ${categoryUnit || 'mile'}${quantity !== 1 ? 's' : ''} @ $${unitPrice.toFixed(2)}/${categoryUnit || 'mile'}`;
      } else if (quantity > 1) {
        expenseDescription = `${description} - ${quantity} @ $${unitPrice.toFixed(2)} each`;
      }

      // Create expense record in case_finances
      const { data: expenseItem, error: insertError } = await supabase
        .from("case_finances")
        .insert({
          case_id: caseId,
          organization_id: organizationId,
          user_id: user.id,
          account_id: accountId || null,
          case_service_instance_id: caseServiceInstanceId || null,
          activity_id: activityId || null,
          update_id: updateId,                    // Links to source update for audit trail
          finance_type: 'expense',                // Expense type
          billing_type: 'expense',                // Expense billing
          category: category,                     // Expense category
          description: expenseDescription,
          quantity: quantity,
          unit_price: unitPrice,
          amount: amount,
          status: 'pending',               // Always pending
          date: new Date().toISOString().split('T')[0],
          // Not time-based - no start/end times
          start_time: null,
          end_time: null,
          hours: null,
          hourly_rate: null,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating expense item:", insertError);
        return { success: false, error: insertError.message };
      }

      // Log expense creation audit event
      await logBillingAudit({
        action: 'expense_billing_item_created',
        organizationId: organizationId,
        metadata: {
          billingItemId: expenseItem.id,
          updateId: updateId,
          activityId: activityId,
          caseId: caseId,
          source: 'update_form',
          // Expense-specific fields
          expenseCategory: category,
          quantity: quantity,
          rate: unitPrice,
          amount: amount,
        },
      });

      // Check budget forecast after creating expense
      const budgetWarning = await fetchBudgetForecastOnce(caseId);

      return {
        success: true,
        expenseId: expenseItem.id,
        budgetWarning: budgetWarning || undefined,
      };
    } catch (error) {
      console.error("Error in createExpenseItem:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createExpenseItem,
    isCreating,
  };
}

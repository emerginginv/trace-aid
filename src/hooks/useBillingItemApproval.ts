import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Result of a billing item approval/rejection operation
 */
export interface ApprovalResult {
  success: boolean;
  error?: string;
  budgetBlocked?: boolean;
}

/**
 * Hook for billing item approval workflow with budget hard cap checks
 * 
 * SYSTEM PROMPT 10 Rules:
 * - Only approved billing items may be invoiced
 * - Approval consumes budget definitively
 * - Rejected items remain linked to activity but are non-billable
 * - Budget hard caps may block approval
 */
export function useBillingItemApproval() {
  const [loading, setLoading] = useState(false);

  /**
   * Approve a pending billing item
   * Checks budget hard cap before approval - will be blocked if exceeded
   */
  const approveBillingItem = useCallback(async (
    billingItemId: string
  ): Promise<ApprovalResult> => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data, error } = await supabase.rpc("approve_billing_item", {
        p_billing_item_id: billingItemId,
        p_approver_id: user.id
      });

      if (error) {
        console.error("Error approving billing item:", error);
        return { success: false, error: error.message };
      }

      const result = data?.[0];
      
      if (!result?.success) {
        return {
          success: false,
          error: result?.error_message || "Approval failed",
          budgetBlocked: result?.budget_blocked || false
        };
      }

      return { success: true };
    } catch (err) {
      console.error("Error in approveBillingItem:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reject a pending billing item
   * Item remains linked to activity but is marked non-billable
   */
  const rejectBillingItem = useCallback(async (
    billingItemId: string,
    reason?: string
  ): Promise<ApprovalResult> => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data, error } = await supabase.rpc("reject_billing_item", {
        p_billing_item_id: billingItemId,
        p_rejector_id: user.id,
        p_reason: reason || null
      });

      if (error) {
        console.error("Error rejecting billing item:", error);
        return { success: false, error: error.message };
      }

      const result = data?.[0];
      
      if (!result?.success) {
        return {
          success: false,
          error: result?.error_message || "Rejection failed"
        };
      }

      return { success: true };
    } catch (err) {
      console.error("Error in rejectBillingItem:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    approveBillingItem,
    rejectBillingItem,
    loading
  };
}

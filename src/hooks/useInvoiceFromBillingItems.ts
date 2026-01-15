import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * SYSTEM PROMPT 11: Invoice Generation Rules
 * - Generate invoice line items only from approved billing items
 * - Invoices never read directly from activities
 * - Invoices never calculate quantities
 * - Invoices snapshot pricing at approval time
 * - Prevent double inclusion of billing items
 */

export interface ApprovedBillingItem {
  id: string;
  description: string;
  amount: number;
  quantity: number | null;
  unit_price: number | null;
  hourly_rate: number | null;
  hours: number | null;
  pricing_model: string | null;
  case_service_instance_id: string | null;
  activity_id: string | null;
  date: string;
  category: string | null;
  pricing_snapshot: {
    pricing_model?: string;
    unit_price?: number;
    quantity?: number;
    hours?: number;
    hourly_rate?: number;
    amount?: number;
    approved_at?: string;
    approved_by?: string;
  } | null;
}

export interface GenerateInvoiceResult {
  success: boolean;
  line_items_created: number;
  total_amount: number;
  skipped_not_approved: string[];
  skipped_already_invoiced: string[];
}

/**
 * Hook to fetch approved billing items that haven't been invoiced yet
 */
export function useApprovedBillingItems(caseId: string) {
  return useQuery({
    queryKey: ['approved-billing-items', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_finances")
        .select("*")
        .eq("case_id", caseId)
        .eq("finance_type", "billing_item")
        .eq("status", "approved")
        .is("invoice_id", null)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as ApprovedBillingItem[];
    },
    enabled: !!caseId,
  });
}

/**
 * Hook to generate invoice from approved billing items
 * Uses the database function that enforces all SYSTEM PROMPT 11 rules
 */
export function useGenerateInvoiceFromBillingItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      caseId,
      billingItemIds,
      accountId,
      organizationId,
      retainerToApply = 0,
    }: {
      caseId: string;
      billingItemIds: string[];
      accountId: string | null;
      organizationId: string;
      retainerToApply?: number;
    }) => {
      if (billingItemIds.length === 0) {
        throw new Error("No billing items selected");
      }

      // Get next invoice number
      const { data: invoiceCountData } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (invoiceCountData && invoiceCountData.length > 0) {
        const lastNumber = invoiceCountData[0].invoice_number;
        const match = lastNumber.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const invoiceNumber = `INV-${String(nextNumber).padStart(5, "0")}`;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          case_id: caseId,
          account_id: accountId,
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          status: "draft",
          total: 0, // Will be updated by the function
          retainer_applied: retainerToApply,
          user_id: user.id,
          date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate line items from billing items using the database function
      // This function enforces all SYSTEM PROMPT 11 rules:
      // - Only approved items
      // - No double inclusion
      // - Uses frozen pricing from approval time
      const { data: result, error: rpcError } = await supabase.rpc(
        'generate_invoice_from_billing_items',
        {
          p_invoice_id: invoice.id,
          p_billing_item_ids: billingItemIds,
        }
      );

      if (rpcError) throw rpcError;

      const typedResult = result as unknown as GenerateInvoiceResult;

      // Handle retainer if applicable - insert directly into retainer_funds table
      if (retainerToApply > 0) {
        const { data: userData } = await supabase.auth.getUser();
        // Deduct from retainer balance by inserting a negative amount
        await supabase.from("retainer_funds").insert({
          case_id: caseId,
          organization_id: organizationId,
          user_id: userData.user?.id,
          amount: -retainerToApply, // Negative amount for deduction
          note: `Applied to invoice ${invoiceNumber}`,
          invoice_id: invoice.id,
        });
      }

      return {
        invoice,
        result: typedResult,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approved-billing-items', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-finances', variables.caseId] });

      const { result } = data;
      if (result.skipped_not_approved.length > 0 || result.skipped_already_invoiced.length > 0) {
        toast({
          title: "Invoice Created with Warnings",
          description: `Created ${result.line_items_created} line items. ${result.skipped_not_approved.length} items skipped (not approved), ${result.skipped_already_invoiced.length} items skipped (already invoiced).`,
          variant: "default",
        });
      } else {
        toast({
          title: "Invoice Created",
          description: `Successfully created invoice with ${result.line_items_created} line items totaling $${result.total_amount.toFixed(2)}.`,
        });
      }
    },
    onError: (error) => {
      console.error("Error generating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice from billing items.",
        variant: "destructive",
      });
    },
  });
}

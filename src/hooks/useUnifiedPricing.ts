import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { FinanceItem } from "./useFinanceItems";

export interface UnifiedPricingItem {
  id: string; // finance_item_id
  name: string;
  description: string | null;
  rateType: "hourly" | "fixed" | "variable";
  expenseRate: number; // resolved expense/cost rate
  invoiceRate: number; // resolved invoice/billing rate
  isExpenseItem: boolean;
  isInvoiceItem: boolean;
  financeItemId: string;
}

export interface UseUnifiedPricingItemsOptions {
  userId?: string; // For employee-specific expense rates
  accountId?: string; // For client-specific invoice rates
  isExpenseItem?: boolean;
  isInvoiceItem?: boolean;
  isActive?: boolean;
}

/**
 * Hook to fetch unified pricing items from finance_items with resolved rates
 * This replaces the old service_pricing_rules-based approach
 */
export function useUnifiedPricingItems(options: UseUnifiedPricingItemsOptions = {}) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["unified-pricing-items", organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch finance items
      let query = supabase
        .from("finance_items")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_active", options.isActive ?? true)
        .order("display_order", { ascending: true });

      if (options.isExpenseItem !== undefined) {
        query = query.eq("is_expense_item", options.isExpenseItem);
      }
      if (options.isInvoiceItem !== undefined) {
        query = query.eq("is_invoice_item", options.isInvoiceItem);
      }

      const { data: items, error } = await query;
      if (error) throw error;

      // Resolve rates for each item
      const resolvedItems: UnifiedPricingItem[] = await Promise.all(
        (items || []).map(async (item: FinanceItem) => {
          let expenseRate = item.default_expense_rate || 0;
          let invoiceRate = item.default_invoice_rate || item.default_expense_rate || 0;

          // Resolve employee-specific expense rate if userId provided
          if (options.userId) {
            const { data: employeeRate } = await supabase
              .from("employee_price_list")
              .select("custom_expense_rate")
              .eq("finance_item_id", item.id)
              .eq("user_id", options.userId)
              .eq("organization_id", organization.id)
              .lte("effective_date", new Date().toISOString().split("T")[0])
              .or("end_date.is.null,end_date.gte." + new Date().toISOString().split("T")[0])
              .order("effective_date", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (employeeRate?.custom_expense_rate) {
              expenseRate = employeeRate.custom_expense_rate;
            }
          }

          // Resolve client-specific invoice rate if accountId provided
          if (options.accountId) {
            const { data: clientRate } = await supabase
              .from("client_price_list")
              .select("custom_invoice_rate")
              .eq("finance_item_id", item.id)
              .eq("account_id", options.accountId)
              .eq("organization_id", organization.id)
              .lte("effective_date", new Date().toISOString().split("T")[0])
              .or("end_date.is.null,end_date.gte." + new Date().toISOString().split("T")[0])
              .order("effective_date", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (clientRate?.custom_invoice_rate) {
              invoiceRate = clientRate.custom_invoice_rate;
            }
          }

          return {
            id: item.id,
            name: item.name,
            description: item.description,
            rateType: item.rate_type as "hourly" | "fixed" | "variable",
            expenseRate,
            invoiceRate,
            isExpenseItem: item.is_expense_item,
            isInvoiceItem: item.is_invoice_item,
            financeItemId: item.id,
          };
        })
      );

      return resolvedItems;
    },
    enabled: !!organization?.id,
  });
}

/**
 * Hook to resolve the expense rate for a specific finance item and user
 */
export function useResolveExpenseRate() {
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({
      financeItemId,
      userId,
    }: {
      financeItemId: string;
      userId: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      // Call the database function
      const { data, error } = await supabase.rpc("get_expense_rate_by_finance_item", {
        p_finance_item_id: financeItemId,
        p_user_id: userId,
        p_organization_id: organization.id,
        p_date: new Date().toISOString().split("T")[0],
      });

      if (error) {
        console.error("Error resolving expense rate:", error);
        // Fallback to fetching from finance_items directly
        const { data: item } = await supabase
          .from("finance_items")
          .select("default_expense_rate")
          .eq("id", financeItemId)
          .single();
        return item?.default_expense_rate || 0;
      }

      return data || 0;
    },
  });
}

/**
 * Hook to resolve the invoice rate for a specific finance item and account
 */
export function useResolveInvoiceRate() {
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({
      financeItemId,
      accountId,
    }: {
      financeItemId: string;
      accountId: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      // Call the database function
      const { data, error } = await supabase.rpc("get_invoice_rate_by_finance_item", {
        p_finance_item_id: financeItemId,
        p_account_id: accountId,
        p_organization_id: organization.id,
        p_date: new Date().toISOString().split("T")[0],
      });

      if (error) {
        console.error("Error resolving invoice rate:", error);
        // Fallback to fetching from finance_items directly
        const { data: item } = await supabase
          .from("finance_items")
          .select("default_invoice_rate, default_expense_rate")
          .eq("id", financeItemId)
          .single();
        return item?.default_invoice_rate || item?.default_expense_rate || 0;
      }

      return data || 0;
    },
  });
}

/**
 * Hook to get invoice rates for multiple entries in batch (for billing conversion)
 */
export function useBatchResolveInvoiceRates() {
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({
      entries,
      accountId,
    }: {
      entries: Array<{ id: string; financeItemId: string | null }>;
      accountId: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      const results: Map<string, number> = new Map();

      for (const entry of entries) {
        if (!entry.financeItemId) {
          results.set(entry.id, 0);
          continue;
        }

        const { data, error } = await supabase.rpc("get_invoice_rate_by_finance_item", {
          p_finance_item_id: entry.financeItemId,
          p_account_id: accountId,
          p_organization_id: organization.id,
          p_date: new Date().toISOString().split("T")[0],
        });

        if (error) {
          // Fallback
          const { data: item } = await supabase
            .from("finance_items")
            .select("default_invoice_rate, default_expense_rate")
            .eq("id", entry.financeItemId)
            .single();
          results.set(entry.id, item?.default_invoice_rate || item?.default_expense_rate || 0);
        } else {
          results.set(entry.id, data || 0);
        }
      }

      return results;
    },
  });
}

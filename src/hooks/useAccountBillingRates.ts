import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

/**
 * INVARIANT 1: Client billing rates live ONLY on the Account
 * This hook manages rates in client_price_list table
 */

export interface AccountBillingItem {
  id: string;
  name: string;
  description: string | null;
  rateType: "hourly" | "fixed" | "variable";
  defaultRate: number | null;  // Organization default from finance_items
  customRate: number | null;   // Account-specific from client_price_list
  effectiveDate: string | null;
  endDate: string | null;
  overrideId: string | null;
  notes: string | null;
}

export interface ClientPriceListEntry {
  id: string;
  finance_item_id: string;
  account_id: string;
  organization_id: string;
  custom_invoice_rate: number;
  effective_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string | null;
  created_by: string | null;
}

// Fetch all invoice-eligible finance items with resolved rates for a specific account
export function useAccountBillingItems(accountId: string | null) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["account-billing-items", organization?.id, accountId],
    queryFn: async () => {
      if (!organization?.id || !accountId) return [];

      // Fetch all invoice-eligible finance items
      const { data: financeItems, error: fiError } = await supabase
        .from("finance_items")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_invoice_item", true)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (fiError) throw fiError;

      // Fetch account-specific rates from client_price_list
      const { data: overrides, error: ovError } = await supabase
        .from("client_price_list")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("account_id", accountId);

      if (ovError) throw ovError;

      const today = new Date().toISOString().split("T")[0];

      // Map finance items with resolved rates
      // INVARIANT 1: Billing rates come ONLY from client_price_list
      const items: AccountBillingItem[] = (financeItems || []).map((fi) => {
        // Find active override for this finance item
        const override = overrides?.find(
          (ov) =>
            ov.finance_item_id === fi.id &&
            (!ov.effective_date || ov.effective_date <= today) &&
            (!ov.end_date || ov.end_date >= today)
        );

        return {
          id: fi.id,
          name: fi.name,
          description: fi.description,
          rateType: fi.rate_type as "hourly" | "fixed" | "variable",
          defaultRate: fi.default_invoice_rate ?? null,  // Org default
          customRate: override?.custom_invoice_rate ?? null,
          effectiveDate: override?.effective_date ?? null,
          endDate: override?.end_date ?? null,
          overrideId: override?.id ?? null,
          notes: override?.notes ?? null,
        };
      });

      return items;
    },
    enabled: !!organization?.id && !!accountId,
  });
}

// Fetch all client price list entries for an account
export function useClientPriceList(accountId: string | null) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["client-price-list", organization?.id, accountId],
    queryFn: async () => {
      if (!organization?.id || !accountId) return [];

      const { data, error } = await supabase
        .from("client_price_list")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientPriceListEntry[];
    },
    enabled: !!organization?.id && !!accountId,
  });
}

// Create or update client price list entry
export function useUpsertAccountRate() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: {
      financeItemId: string;
      accountId: string;
      customRate: number;
      effectiveDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
      existingId?: string | null;
    }) => {
      if (!organization?.id) throw new Error("No organization found");

      const { data: { user } } = await supabase.auth.getUser();

      if (input.existingId) {
        // Update existing
        const { data, error } = await supabase
          .from("client_price_list")
          .update({
            custom_invoice_rate: input.customRate,
            effective_date: input.effectiveDate || new Date().toISOString().split("T")[0],
            end_date: input.endDate || null,
            notes: input.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.existingId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new client price list entry
        const { data, error } = await supabase
          .from("client_price_list")
          .insert({
            finance_item_id: input.financeItemId,
            account_id: input.accountId,
            organization_id: organization.id,
            custom_invoice_rate: input.customRate,
            effective_date: input.effectiveDate || new Date().toISOString().split("T")[0],
            end_date: input.endDate || null,
            notes: input.notes || null,
            created_by: user?.id || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["account-billing-items"] });
      queryClient.invalidateQueries({ queryKey: ["client-price-list", organization?.id, variables.accountId] });
      toast.success("Billing rate saved successfully");
    },
    onError: (error) => {
      console.error("Error saving billing rate:", error);
      toast.error("Failed to save billing rate");
    },
  });
}

// Delete client price list entry (remove rate configuration)
export function useDeleteAccountRate() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, accountId }: { id: string; accountId: string }) => {
      const { error } = await supabase
        .from("client_price_list")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { accountId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["account-billing-items"] });
      queryClient.invalidateQueries({ queryKey: ["client-price-list", organization?.id, variables.accountId] });
      toast.success("Billing rate removed");
    },
    onError: (error) => {
      console.error("Error deleting billing rate:", error);
      toast.error("Failed to remove billing rate");
    },
  });
}

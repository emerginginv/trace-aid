import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export type RateType = "hourly" | "fixed" | "variable";

export interface FinanceItem {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_expense_item: boolean;
  is_invoice_item: boolean;
  rate_type: RateType;
  default_expense_rate: number | null;
  default_invoice_rate: number | null;
  default_tax_rate_id: string | null;
  invoice_as_flat_rate: boolean;
  classification_code: string | null;
  reference_id: string | null;
  item_code_id: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceItemInput {
  name: string;
  description?: string | null;
  is_expense_item: boolean;
  is_invoice_item: boolean;
  rate_type?: RateType;
  default_expense_rate?: number | null;
  default_invoice_rate?: number | null;
  default_tax_rate_id?: string | null;
  invoice_as_flat_rate?: boolean;
  classification_code?: string | null;
  reference_id?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export function useFinanceItems(options?: { 
  isExpenseItem?: boolean; 
  isInvoiceItem?: boolean;
  isActive?: boolean;
}) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["finance-items", organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from("finance_items")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order", { ascending: true });

      if (options?.isExpenseItem !== undefined) {
        query = query.eq("is_expense_item", options.isExpenseItem);
      }
      if (options?.isInvoiceItem !== undefined) {
        query = query.eq("is_invoice_item", options.isInvoiceItem);
      }
      if (options?.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching finance items:", error);
        throw error;
      }

      return data as FinanceItem[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateFinanceItem() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: FinanceItemInput) => {
      if (!organization?.id) throw new Error("No organization found");

      const { data, error } = await supabase
        .from("finance_items")
        .insert({
          ...input,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-items"] });
      toast.success("Finance item created successfully");
    },
    onError: (error) => {
      console.error("Error creating finance item:", error);
      toast.error("Failed to create finance item");
    },
  });
}

export function useUpdateFinanceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: FinanceItemInput & { id: string }) => {
      const { data, error } = await supabase
        .from("finance_items")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-items"] });
      toast.success("Finance item updated successfully");
    },
    onError: (error) => {
      console.error("Error updating finance item:", error);
      toast.error("Failed to update finance item");
    },
  });
}

export function useDeleteFinanceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-items"] });
      toast.success("Finance item deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting finance item:", error);
      toast.error("Failed to delete finance item");
    },
  });
}

export function useTaxRates() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["tax-rates", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("tax_rates")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error fetching tax rates:", error);
        throw error;
      }

      return data;
    },
    enabled: !!organization?.id,
  });
}

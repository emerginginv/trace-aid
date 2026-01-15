import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface StaffPricingItem {
  id: string;
  name: string;
  description: string | null;
  rateType: "hourly" | "fixed" | "variable";
  defaultRate: number | null;
  customRate: number | null;
  effectiveDate: string | null;
  endDate: string | null;
  overrideId: string | null;
  notes: string | null;
}

export interface EmployeePriceListEntry {
  id: string;
  finance_item_id: string;
  user_id: string;
  organization_id: string;
  custom_expense_rate: number;
  effective_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string | null;
  created_by: string | null;
}

// Fetch all finance items with resolved rates for a specific user
export function useStaffPricingItems(userId: string | null) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["staff-pricing-items", organization?.id, userId],
    queryFn: async () => {
      if (!organization?.id || !userId) return [];

      // Fetch all expense-eligible finance items
      const { data: financeItems, error: fiError } = await supabase
        .from("finance_items")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_expense_item", true)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (fiError) throw fiError;

      // Fetch employee overrides for this user
      const { data: overrides, error: ovError } = await supabase
        .from("employee_price_list")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("user_id", userId);

      if (ovError) throw ovError;

      const today = new Date().toISOString().split("T")[0];

      // Map finance items with resolved rates
      const items: StaffPricingItem[] = (financeItems || []).map((fi) => {
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
          defaultRate: fi.default_expense_rate,
          customRate: override?.custom_expense_rate ?? null,
          effectiveDate: override?.effective_date ?? null,
          endDate: override?.end_date ?? null,
          overrideId: override?.id ?? null,
          notes: override?.notes ?? null,
        };
      });

      return items;
    },
    enabled: !!organization?.id && !!userId,
  });
}

// Fetch all employee price list overrides for a user
export function useEmployeePriceList(userId: string | null) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["employee-price-list", organization?.id, userId],
    queryFn: async () => {
      if (!organization?.id || !userId) return [];

      const { data, error } = await supabase
        .from("employee_price_list")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmployeePriceListEntry[];
    },
    enabled: !!organization?.id && !!userId,
  });
}

// Create or update employee price list entry
export function useUpsertEmployeeRate() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: {
      financeItemId: string;
      userId: string;
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
          .from("employee_price_list")
          .update({
            custom_expense_rate: input.customRate,
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
        // Insert new employee price list entry
        const { data, error } = await supabase
          .from("employee_price_list")
          .insert({
            finance_item_id: input.financeItemId,
            user_id: input.userId,
            organization_id: organization.id,
            custom_expense_rate: input.customRate,
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
      queryClient.invalidateQueries({ queryKey: ["staff-pricing-items"] });
      queryClient.invalidateQueries({ queryKey: ["employee-price-list", organization?.id, variables.userId] });
      toast.success("Staff rate saved successfully");
    },
    onError: (error) => {
      console.error("Error saving staff rate:", error);
      toast.error("Failed to save staff rate");
    },
  });
}

// Delete employee price list entry (reset to default)
export function useDeleteEmployeeRate() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from("employee_price_list")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { userId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["staff-pricing-items"] });
      queryClient.invalidateQueries({ queryKey: ["employee-price-list", organization?.id, variables.userId] });
      toast.success("Rate reset to default");
    },
    onError: (error) => {
      console.error("Error deleting staff rate:", error);
      toast.error("Failed to reset rate");
    },
  });
}

// Fetch all investigators/staff members
export function useStaffMembers() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["staff-members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq("organization_id", organization.id);

      if (error) throw error;

      return (data || [])
        .filter((m) => m.profiles)
        .map((m) => ({
          id: (m.profiles as any).id,
          fullName: (m.profiles as any).full_name || (m.profiles as any).username || "Unknown",
          username: (m.profiles as any).username,
          avatarUrl: (m.profiles as any).avatar_url,
          role: m.role,
        }));
    },
    enabled: !!organization?.id,
  });
}

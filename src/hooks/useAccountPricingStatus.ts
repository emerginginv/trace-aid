import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * Hook for checking account pricing configuration completeness
 * Used to validate that billing rates are set before allowing invoicing
 */

interface PricingStatusItem {
  id: string;
  name: string;
  hasCustomRate: boolean;
  hasDefaultRate: boolean;
}

export interface PricingStatus {
  total: number;
  configured: number;
  unconfigured: number;
  items: PricingStatusItem[];
  unconfiguredItems: PricingStatusItem[];
  isComplete: boolean;
  canBill: boolean;
}

export function useAccountPricingStatus(accountId: string | null) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['account-pricing-status', accountId, organization?.id],
    queryFn: async (): Promise<PricingStatus> => {
      if (!organization?.id || !accountId) {
        return {
          total: 0,
          configured: 0,
          unconfigured: 0,
          items: [],
          unconfiguredItems: [],
          isComplete: true,
          canBill: true,
        };
      }

      // 1. Fetch all invoice-eligible finance_items for org
      const { data: financeItems, error: fiError } = await supabase
        .from("finance_items")
        .select("id, name, default_invoice_rate")
        .eq("organization_id", organization.id)
        .eq("is_invoice_item", true)
        .eq("is_active", true);

      if (fiError) throw fiError;

      if (!financeItems || financeItems.length === 0) {
        return {
          total: 0,
          configured: 0,
          unconfigured: 0,
          items: [],
          unconfiguredItems: [],
          isComplete: true,
          canBill: true,
        };
      }

      // 2. Check which have client_price_list entries for this account
      const { data: clientPrices, error: cpError } = await supabase
        .from("client_price_list")
        .select("finance_item_id, custom_invoice_rate")
        .eq("account_id", accountId)
        .eq("organization_id", organization.id);

      if (cpError) throw cpError;

      const clientPriceMap = new Map(
        (clientPrices || []).map(cp => [cp.finance_item_id, cp.custom_invoice_rate])
      );

      // 3. Calculate status metrics
      const items: PricingStatusItem[] = financeItems.map(fi => ({
        id: fi.id,
        name: fi.name,
        hasCustomRate: clientPriceMap.has(fi.id),
        hasDefaultRate: fi.default_invoice_rate !== null,
      }));

      const unconfiguredItems = items.filter(
        item => !item.hasCustomRate && !item.hasDefaultRate
      );

      const configured = items.length - unconfiguredItems.length;

      return {
        total: items.length,
        configured,
        unconfigured: unconfiguredItems.length,
        items,
        unconfiguredItems,
        isComplete: unconfiguredItems.length === 0,
        canBill: unconfiguredItems.length === 0,
      };
    },
    enabled: !!accountId && !!organization?.id,
  });
}

/**
 * Validate billing rates for specific billing item IDs before invoice generation
 * Returns list of items missing rates
 */
export async function validateBillingRatesForInvoice(
  billingItemIds: string[],
  accountId: string,
  organizationId: string
): Promise<{ id: string; name: string }[]> {
  if (billingItemIds.length === 0) return [];

  // Get the case_finances records with their descriptions
  const { data: billingItems, error: biError } = await supabase
    .from("case_finances")
    .select("id, description, category")
    .in("id", billingItemIds);

  if (biError) throw biError;

  // Get all finance_items for the org
  const { data: financeItems, error: fiError } = await supabase
    .from("finance_items")
    .select("id, name, default_invoice_rate")
    .eq("organization_id", organizationId)
    .eq("is_invoice_item", true)
    .eq("is_active", true);

  if (fiError) throw fiError;

  // Get client price list for this account
  const { data: clientPrices, error: cpError } = await supabase
    .from("client_price_list")
    .select("finance_item_id, custom_invoice_rate")
    .eq("account_id", accountId)
    .eq("organization_id", organizationId);

  if (cpError) throw cpError;

  const clientPriceMap = new Map(
    (clientPrices || []).map(cp => [cp.finance_item_id, cp.custom_invoice_rate])
  );

  // Build a map of which finance items have valid rates
  const financeItemsWithRates = new Set(
    (financeItems || [])
      .filter(fi => clientPriceMap.has(fi.id) || fi.default_invoice_rate !== null)
      .map(fi => fi.id)
  );

  // Check if there are any finance items without rates
  const unconfiguredFinanceItems = (financeItems || []).filter(
    fi => !clientPriceMap.has(fi.id) && fi.default_invoice_rate === null
  );

  // If any finance items lack rates, surface them as missing
  const missingRates: { id: string; name: string }[] = unconfiguredFinanceItems.map(fi => ({
    id: fi.id,
    name: fi.name,
  }));

  return missingRates;
}

/**
 * useBillingReviewQueue Hook
 * 
 * PART 8: Data fetching hook for the Billing Review Queue.
 * 
 * Fetches pending billing items with related case, account, and service data.
 * Supports filtering and sorting for efficient review workflows.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BillingReviewItem } from "@/types/billing";
import { useOrganization } from "@/contexts/OrganizationContext";

export type BillingReviewFilter = {
  status?: string;
  caseId?: string;
  accountId?: string;
};

export type BillingReviewSort = {
  field: 'created_at' | 'amount' | 'case_number';
  direction: 'asc' | 'desc';
};

export function useBillingReviewQueue(
  filter?: BillingReviewFilter,
  sort: BillingReviewSort = { field: 'created_at', direction: 'desc' }
) {
  const [items, setItems] = useState<BillingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const { organization } = useOrganization();

  const fetchItems = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query for billing items
      let query = supabase
        .from("case_finances")
        .select(`
          id,
          case_id,
          account_id,
          case_service_instance_id,
          activity_id,
          update_id,
          billing_type,
          description,
          quantity,
          hourly_rate,
          amount,
          status,
          created_at,
          notes,
          cases!inner (
            case_number,
            title
          ),
          accounts (
            name
          )
        `)
        .eq("organization_id", organization.id)
        .in("finance_type", ["time", "expense", "billing_item"]);

      // Apply status filter (default to pending_review)
      const statusFilter = filter?.status || 'pending_review';
      if (statusFilter !== 'all') {
        query = query.eq("status", statusFilter);
      }

      // Apply case filter
      if (filter?.caseId) {
        query = query.eq("case_id", filter.caseId);
      }

      // Apply account filter
      if (filter?.accountId) {
        query = query.eq("account_id", filter.accountId);
      }

      // Apply sorting
      if (sort.field === 'case_number') {
        query = query.order("created_at", { ascending: sort.direction === 'asc' });
      } else {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      }

      const { data, error: queryError } = await query.limit(100);

      if (queryError) {
        throw queryError;
      }

      // Transform data to match BillingReviewItem interface
      const transformedItems: BillingReviewItem[] = (data || []).map((item: any) => ({
        id: item.id,
        case_id: item.case_id,
        account_id: item.account_id,
        case_service_instance_id: item.case_service_instance_id,
        activity_id: item.activity_id,
        update_id: item.update_id,
        billing_type: item.billing_type,
        description: item.description,
        quantity: item.quantity,
        hourly_rate: item.hourly_rate,
        amount: item.amount,
        status: item.status,
        created_at: item.created_at,
        notes: item.notes,
        case_number: item.cases?.case_number,
        case_title: item.cases?.title,
        account_name: item.accounts?.name,
      }));

      setItems(transformedItems);

      // Fetch pending count separately
      const { count } = await supabase
        .from("case_finances")
        .select("id", { count: 'exact', head: true })
        .eq("organization_id", organization.id)
        .eq("status", "pending_review")
        .in("finance_type", ["time", "expense", "billing_item"]);

      setPendingCount(count || 0);
    } catch (err) {
      console.error("Error fetching billing review queue:", err);
      setError("Failed to load billing items");
    } finally {
      setLoading(false);
    }
  }, [organization?.id, filter?.status, filter?.caseId, filter?.accountId, sort.field, sort.direction]);

  // Fetch service names for items that have service instance IDs
  const enrichWithServiceNames = useCallback(async (itemsToEnrich: BillingReviewItem[]) => {
    const instanceIds = itemsToEnrich
      .map(item => item.case_service_instance_id)
      .filter((id): id is string => !!id);

    if (instanceIds.length === 0) return itemsToEnrich;

    const { data: instances } = await supabase
      .from("case_service_instances")
      .select(`
        id,
        case_services (
          name
        )
      `)
      .in("id", instanceIds);

    if (!instances) return itemsToEnrich;

    const serviceNameMap = new Map(
      instances.map((inst: any) => [inst.id, inst.case_services?.name])
    );

    return itemsToEnrich.map(item => ({
      ...item,
      service_name: item.case_service_instance_id 
        ? serviceNameMap.get(item.case_service_instance_id) 
        : undefined,
    }));
  }, []);

  // Fetch activity titles for items that have activity IDs
  const enrichWithActivityTitles = useCallback(async (itemsToEnrich: BillingReviewItem[]) => {
    const activityIds = itemsToEnrich
      .map(item => item.activity_id)
      .filter((id): id is string => !!id);

    if (activityIds.length === 0) return itemsToEnrich;

    const { data: activities } = await supabase
      .from("case_activities")
      .select("id, title")
      .in("id", activityIds);

    if (!activities) return itemsToEnrich;

    const activityTitleMap = new Map(
      activities.map((act: any) => [act.id, act.title])
    );

    return itemsToEnrich.map(item => ({
      ...item,
      activity_title: item.activity_id 
        ? activityTitleMap.get(item.activity_id) 
        : undefined,
    }));
  }, []);

  useEffect(() => {
    const loadAndEnrich = async () => {
      await fetchItems();
    };
    loadAndEnrich();
  }, [fetchItems]);

  // Enrich items after initial fetch
  useEffect(() => {
    if (items.length > 0) {
      const enrichItems = async () => {
        let enriched = await enrichWithServiceNames(items);
        enriched = await enrichWithActivityTitles(enriched);
        // Only update if there are actual changes
        const hasChanges = enriched.some((item, idx) => 
          item.service_name !== items[idx]?.service_name ||
          item.activity_title !== items[idx]?.activity_title
        );
        if (hasChanges) {
          setItems(enriched);
        }
      };
      enrichItems();
    }
  }, [items.length]); // Only re-enrich when count changes

  return {
    items,
    loading,
    error,
    pendingCount,
    refetch: fetchItems,
  };
}

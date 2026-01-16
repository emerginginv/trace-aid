/**
 * useBillingReviewQueue Hook
 * 
 * PART 8: Data fetching hook for the Billing Review Queue.
 * 
 * Fetches pending billing items with related case, account, and service data.
 * NOW queries from canonical time_entries and expense_entries tables.
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
      const statusFilter = filter?.status || 'pending';
      const allItems: BillingReviewItem[] = [];

      // Fetch time entries
      let timeQuery = supabase
        .from("time_entries")
        .select(`
          id,
          case_id,
          hours,
          rate,
          total,
          status,
          created_at,
          notes,
          item_type,
          event_id,
          update_id,
          cases!inner (
            case_number,
            title,
            account_id
          )
        `)
        .eq("organization_id", organization.id);

      if (statusFilter !== 'all') {
        timeQuery = timeQuery.eq("status", statusFilter as any);
      }
      if (filter?.caseId) {
        timeQuery = timeQuery.eq("case_id", filter.caseId);
      }

      const sortField = sort.field === 'amount' ? 'total' : sort.field;
      timeQuery = timeQuery.order(sortField, { ascending: sort.direction === 'asc' });

      const { data: timeData, error: timeError } = await timeQuery.limit(50);
      if (timeError) throw timeError;

      // Transform time entries
      allItems.push(...(timeData || []).map((item: any) => ({
        id: item.id,
        case_id: item.case_id,
        account_id: item.cases?.account_id || null,
        case_service_instance_id: null,
        activity_id: item.event_id,
        update_id: item.update_id,
        billing_type: 'time',
        description: item.notes || item.item_type || 'Time Entry',
        quantity: item.hours || 1,
        hourly_rate: item.rate,
        amount: item.total,
        status: item.status,
        created_at: item.created_at,
        notes: item.notes,
        case_number: item.cases?.case_number,
        case_title: item.cases?.title,
        account_name: undefined,
        finance_type: 'time' as const,
      })));

      // Fetch expense entries
      let expenseQuery = supabase
        .from("expense_entries")
        .select(`
          id,
          case_id,
          quantity,
          rate,
          total,
          status,
          created_at,
          notes,
          item_type,
          event_id,
          update_id,
          cases!inner (
            case_number,
            title,
            account_id
          )
        `)
        .eq("organization_id", organization.id);

      if (statusFilter !== 'all') {
        expenseQuery = expenseQuery.eq("status", statusFilter as any);
      }
      if (filter?.caseId) {
        expenseQuery = expenseQuery.eq("case_id", filter.caseId);
      }

      const expenseSortField = sort.field === 'amount' ? 'total' : sort.field;
      expenseQuery = expenseQuery.order(expenseSortField, { ascending: sort.direction === 'asc' });

      const { data: expenseData, error: expenseError } = await expenseQuery.limit(50);
      if (expenseError) throw expenseError;

      // Transform expense entries
      allItems.push(...(expenseData || []).map((item: any) => ({
        id: item.id,
        case_id: item.case_id,
        account_id: item.cases?.account_id || null,
        case_service_instance_id: null,
        activity_id: item.event_id,
        update_id: item.update_id,
        billing_type: 'expense',
        description: item.notes || item.item_type || 'Expense',
        quantity: item.quantity || 1,
        hourly_rate: item.rate,
        amount: item.total,
        status: item.status,
        created_at: item.created_at,
        notes: item.notes,
        case_number: item.cases?.case_number,
        case_title: item.cases?.title,
        account_name: undefined,
        finance_type: 'expense' as const,
      })));

      // Sort combined results
      allItems.sort((a, b) => {
        if (sort.field === 'amount') {
          return sort.direction === 'asc' 
            ? (a.amount || 0) - (b.amount || 0)
            : (b.amount || 0) - (a.amount || 0);
        }
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return sort.direction === 'asc' ? aDate - bDate : bDate - aDate;
      });

      setItems(allItems.slice(0, 100));

      // Fetch pending count from both tables
      const [{ count: timeCount }, { count: expenseCount }] = await Promise.all([
        supabase
          .from("time_entries")
          .select("id", { count: 'exact', head: true })
          .eq("organization_id", organization.id)
          .eq("status", "pending"),
        supabase
          .from("expense_entries")
          .select("id", { count: 'exact', head: true })
          .eq("organization_id", organization.id)
          .eq("status", "pending"),
      ]);

      setPendingCount((timeCount || 0) + (expenseCount || 0));
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

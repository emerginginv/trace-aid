import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBillingItemApproval } from "@/hooks/useBillingItemApproval";
import { 
  fetchCombinedFinances, 
  deleteFinanceRecord, 
  updateFinanceStatus,
  type UnifiedFinanceRecord 
} from "@/lib/financeUtils";

export interface Finance {
  id: string;
  finance_type: string;
  amount: number;
  description: string;
  date: string;
  due_date?: string;
  status: string;
  created_at: string;
  subject_id?: string;
  activity_id?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  billing_frequency?: string;
  invoice_number?: string;
  notes?: string;
  hours?: number;
  hourly_rate?: number;
  quantity?: number;
  unit_price?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date?: string;
  status: string;
  total: number;
  total_paid?: number;
  retainer_applied?: number;
  notes?: string;
  created_at: string;
}

interface UseCaseFinancesResult {
  finances: Finance[];
  invoices: Invoice[];
  subjects: any[];
  activities: any[];
  retainerTotal: number;
  loading: boolean;
  fetchFinances: () => Promise<void>;
  handleDelete: (id: string, financeType?: string) => Promise<void>;
  handleApprove: (id: string, financeType?: string) => Promise<void>;
  handleReject: (id: string, financeType?: string) => Promise<void>;
}

/**
 * Hook for managing case financial data.
 * 
 * MIGRATED: Now fetches from canonical time_entries and expense_entries tables
 * instead of the deprecated case_finances table.
 */
export function useCaseFinances(caseId: string): UseCaseFinancesResult {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [retainerTotal, setRetainerTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const { approveBillingItem, rejectBillingItem } = useBillingItemApproval();

  const fetchFinances = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!memberData) return;

      // MIGRATED: Fetch from canonical tables instead of case_finances
      const { combined } = await fetchCombinedFinances(memberData.organization_id, {
        caseId,
      });

      // Transform to Finance interface
      const financeData: Finance[] = combined.map((record: UnifiedFinanceRecord) => ({
        id: record.id,
        finance_type: record.finance_type,
        amount: record.amount,
        description: record.description || record.notes || record.category || '',
        date: record.date,
        status: record.status,
        created_at: record.created_at,
        activity_id: record.activity_id,
        category: record.category,
        notes: record.notes,
        hours: record.hours,
        hourly_rate: record.hourly_rate,
        quantity: record.quantity,
        unit_price: record.unit_price,
      }));

      setFinances(financeData);

      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id)
        .order("date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      const { data: retainerData, error: retainerError } = await supabase
        .from("retainer_funds")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id);

      if (retainerError) throw retainerError;
      const retainerBalance = (retainerData || []).reduce((sum, fund) => sum + Number(fund.amount), 0);
      setRetainerTotal(retainerBalance);

      const { data: subjectsData } = await supabase
        .from("case_subjects")
        .select("id, name, subject_type")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id);
      setSubjects(subjectsData || []);

      const { data: activitiesData } = await supabase
        .from("case_activities")
        .select("id, title, activity_type")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id);
      setActivities(activitiesData || []);

    } catch (error) {
      console.error("Error fetching finances:", error);
      toast({
        title: "Error",
        description: "Failed to load finances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchFinances();

    // Subscribe to both canonical tables for real-time updates
    const timeEntriesChannel = supabase
      .channel('time-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `case_id=eq.${caseId}`
        },
        () => fetchFinances()
      )
      .subscribe();

    const expenseEntriesChannel = supabase
      .channel('expense-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_entries',
          filter: `case_id=eq.${caseId}`
        },
        () => fetchFinances()
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `case_id=eq.${caseId}`
        },
        () => fetchFinances()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timeEntriesChannel);
      supabase.removeChannel(expenseEntriesChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [caseId, fetchFinances]);

  const handleDelete = useCallback(async (id: string, financeType?: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      // Determine finance type from existing data if not provided
      const type = financeType || finances.find(f => f.id === id)?.finance_type;
      
      if (type === 'time' || type === 'expense') {
        // MIGRATED: Delete from canonical table
        const result = await deleteFinanceRecord(id, type);
        if (!result.success) throw new Error(result.error);
      } else {
        // Fallback for legacy billing_item types still in case_finances
        const { error } = await supabase
          .from("case_finances")
          .delete()
          .eq("id", id);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      fetchFinances();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  }, [fetchFinances, finances]);

  const handleApprove = useCallback(async (id: string, financeType?: string) => {
    try {
      if (financeType === "billing_item") {
        const result = await approveBillingItem(id);
        
        if (!result.success) {
          toast({
            title: result.budgetBlocked ? "Approval Blocked" : "Error",
            description: result.error || "Failed to approve billing item",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Success",
          description: "Billing item approved. Budget consumption updated.",
        });
      } else {
        // Determine type from existing data
        const type = financeType || finances.find(f => f.id === id)?.finance_type;
        
        if (type === 'time' || type === 'expense') {
          // MIGRATED: Update in canonical table
          const result = await updateFinanceStatus(id, type, 'approved');
          if (!result.success) throw new Error(result.error);
        } else {
          // Fallback for legacy types
          const { error } = await supabase
            .from("case_finances")
            .update({ status: "approved" })
            .eq("id", id);
          if (error) throw error;
        }

        toast({
          title: "Success",
          description: "Entry approved successfully",
        });
      }
      fetchFinances();
    } catch (error) {
      console.error("Error approving:", error);
      toast({
        title: "Error",
        description: "Failed to approve",
        variant: "destructive",
      });
    }
  }, [approveBillingItem, fetchFinances, finances]);

  const handleReject = useCallback(async (id: string, financeType?: string) => {
    try {
      if (financeType === "billing_item") {
        const result = await rejectBillingItem(id);
        
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to reject billing item",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Success",
          description: "Billing item rejected. Item remains linked but non-billable.",
        });
      } else {
        // Determine type from existing data
        const type = financeType || finances.find(f => f.id === id)?.finance_type;
        
        if (type === 'time' || type === 'expense') {
          // MIGRATED: Update in canonical table
          const result = await updateFinanceStatus(id, type, 'declined');
          if (!result.success) throw new Error(result.error);
        } else {
          // Fallback for legacy types
          const { error } = await supabase
            .from("case_finances")
            .update({ status: "rejected" })
            .eq("id", id);
          if (error) throw error;
        }

        toast({
          title: "Success",
          description: "Entry rejected",
        });
      }
      fetchFinances();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast({
        title: "Error",
        description: "Failed to reject",
        variant: "destructive",
      });
    }
  }, [rejectBillingItem, fetchFinances, finances]);

  return {
    finances,
    invoices,
    subjects,
    activities,
    retainerTotal,
    loading,
    fetchFinances,
    handleDelete,
    handleApprove,
    handleReject,
  };
}

export default useCaseFinances;

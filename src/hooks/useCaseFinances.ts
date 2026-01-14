import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBillingItemApproval } from "@/hooks/useBillingItemApproval";

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
  handleDelete: (id: string) => Promise<void>;
  handleApprove: (id: string, financeType?: string) => Promise<void>;
  handleReject: (id: string, financeType?: string) => Promise<void>;
}

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

      const { data, error } = await supabase
        .from("case_finances")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id)
        .order("date", { ascending: false });

      if (error) throw error;
      setFinances(data || []);

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

    const financesChannel = supabase
      .channel('case-finances-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_finances',
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
      supabase.removeChannel(financesChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [caseId, fetchFinances]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const { error } = await supabase
        .from("case_finances")
        .delete()
        .eq("id", id);

      if (error) throw error;

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
  }, [fetchFinances]);

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
        const { error } = await supabase
          .from("case_finances")
          .update({ status: "approved" })
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Expense approved successfully",
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
  }, [approveBillingItem, fetchFinances]);

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
        const { error } = await supabase
          .from("case_finances")
          .update({ status: "rejected" })
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Expense rejected",
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
  }, [rejectBillingItem, fetchFinances]);

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

import { useEffect, useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { FinancesTabSkeleton, ExpensesTabSkeleton, TimeTabSkeleton, InvoicesTabSkeleton, CreateInvoiceTabSkeleton } from "./CaseTabSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Pencil, Trash2, Search, CheckCircle, XCircle, AlertCircle, Calendar, TrendingUp, Clock, MoreVertical, Lock, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FinanceForm } from "./FinanceForm";
import { FinancialEntryDialog } from "./FinancialEntryDialog";
import { InvoiceFromExpenses } from "./InvoiceFromExpenses";
import { InvoiceFromServices } from "./InvoiceFromServices";
import { InvoiceDetail } from "./InvoiceDetail";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format } from "date-fns";
import { useBillingItemApproval } from "@/hooks/useBillingItemApproval";
import { CaseTimeExpensesReview } from "./finances/CaseTimeExpensesReview";
import { CaseBillingTab } from "./finances/CaseBillingTab";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";

interface Finance {
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

const EXPENSE_COLUMNS: ColumnDefinition[] = [
  { key: "date", label: "Date" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", hideable: false },
];

const TIME_COLUMNS: ColumnDefinition[] = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "hours", label: "Hours" },
  { key: "rate", label: "Rate" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", hideable: false },
];

export const CaseFinances = ({ caseId, isClosedCase = false, caseStatusKey }: { caseId: string; isClosedCase?: boolean; caseStatusKey?: string | null }) => {
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [finances, setFinances] = useState<Finance[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFinance, setEditingFinance] = useState<Finance | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [retainerTotal, setRetainerTotal] = useState<number>(0);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [defaultFinanceType, setDefaultFinanceType] = useState<"expense" | "time">("expense");
  const [financialEntryOpen, setFinancialEntryOpen] = useState(false);
  
  // Sorting states
  const { sortColumn: expenseSortColumn, sortDirection: expenseSortDirection, handleSort: handleExpenseSort } = useSortPreference("case-finances-expenses", "date", "desc");
  const { sortColumn: timeSortColumn, sortDirection: timeSortDirection, handleSort: handleTimeSort } = useSortPreference("case-finances-time", "date", "desc");

  // Permission checks
  const canViewFinances = hasPermission('view_finances');
  const canAddFinances = hasPermission('add_finances');
  const canEditFinances = hasPermission('edit_finances');
  const canDeleteFinances = hasPermission('delete_finances');

  const { visibility: expenseVisibility, isVisible: isExpenseVisible, toggleColumn: toggleExpenseColumn, resetToDefaults: resetExpenseDefaults } = useColumnVisibility("case-finances-expense-columns", EXPENSE_COLUMNS);
  const { visibility: timeVisibility, isVisible: isTimeVisible, toggleColumn: toggleTimeColumn, resetToDefaults: resetTimeDefaults } = useColumnVisibility("case-finances-time-columns", TIME_COLUMNS);

  useEffect(() => {
    fetchFinances();

    // Set up realtime subscription for finance updates
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
        () => {
          fetchFinances();
        }
      )
      .subscribe();

    // Set up realtime subscription for invoices updates
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
        () => {
          fetchFinances();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(financesChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [caseId]);

  const fetchFinances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
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

      // Fetch invoices from the new invoices table
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id)
        .order("date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch retainer funds from retainer_funds table
      const { data: retainerData, error: retainerError } = await supabase
        .from("retainer_funds")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id);

      if (retainerError) throw retainerError;
      
      // Calculate retainer balance from retainer_funds table
      const retainerBalance = (retainerData || []).reduce((sum, fund) => sum + Number(fund.amount), 0);
      setRetainerTotal(retainerBalance);

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("case_subjects")
        .select("id, name, subject_type")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id);

      if (!subjectsError) {
        setSubjects(subjectsData || []);
      }

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("case_activities")
        .select("id, title, activity_type")
        .eq("case_id", caseId)
        .eq("organization_id", memberData.organization_id);

      if (!activitiesError) {
        setActivities(activitiesData || []);
      }
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
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      retainer: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      expense: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      time: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      invoice: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[type] || "bg-muted";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      paid: "bg-green-500/10 text-green-500 border-green-500/20",
      partial: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      overdue: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[status] || "bg-muted";
  };

  const calculateTotals = () => {
    const expenseTotal = finances
      .filter((f) => f.finance_type === "expense")
      .reduce((sum, f) => sum + Number(f.amount), 0);
    
    // Calculate invoice total from the invoices array, not finances
    const invoiceTotal = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    return { retainerTotal, expenseTotal, invoiceTotal };
  };

  const calculateInvoiceMetrics = () => {
    // Use the invoices array instead of filtering finances
    
    // Unpaid invoices (pending, sent, partial, overdue)
    const unpaidInvoices = invoices.filter(inv => 
      inv.status === "pending" || inv.status === "sent" || inv.status === "partial" || inv.status === "overdue"
    );
    
    const unpaidCount = unpaidInvoices.length;
    const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    
    // Overdue invoices
    const overdueInvoices = invoices.filter(inv => inv.status === "overdue");
    const overdueCount = overdueInvoices.length;
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    
    // Upcoming invoices (due in next 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingInvoices = invoices
      .filter(inv => {
        if (!inv.due_date || inv.status === "paid") return false;
        const dueDate = new Date(inv.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);
    
    return {
      unpaidCount,
      unpaidTotal,
      overdueCount,
      overdueTotal,
      upcomingInvoices,
    };
  };

  const totals = calculateTotals();
  const invoiceMetrics = calculateInvoiceMetrics();

  const getDueDateLabel = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Due Tomorrow";
    if (diffDays > 1 && diffDays <= 7) return `Due in ${diffDays} days`;
    return "Upcoming";
  };

  const getDueDateColor = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (diffDays === 1) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  const handleEdit = (finance: Finance) => {
    setEditingFinance(finance);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
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
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingFinance(null);
  };

  const { approveBillingItem, rejectBillingItem } = useBillingItemApproval();

  const handleApprove = async (id: string, financeType?: string) => {
    try {
      if (financeType === "billing_item") {
        // Use budget-checked approval for billing items
        const result = await approveBillingItem(id);
        
        if (!result.success) {
          if (result.budgetBlocked) {
            toast({
              title: "Approval Blocked",
              description: result.error || "Budget hard cap exceeded. Cannot approve this billing item.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: result.error || "Failed to approve billing item",
              variant: "destructive",
            });
          }
          return;
        }
        
        toast({
          title: "Success",
          description: "Billing item approved. Budget consumption updated.",
        });
      } else {
        // Existing expense approval logic
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
  };

  const handleReject = async (id: string, financeType?: string) => {
    try {
      if (financeType === "billing_item") {
        // Use rejection function for billing items
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
        // Existing expense rejection logic
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
  };

  const filteredFinances = finances.filter(finance => {
    const matchesSearch = searchQuery === '' || 
      finance.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finance.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finance.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || finance.finance_type === typeFilter;
    
    const matchesStatus = statusFilter === 'all' || finance.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const expenseFinances = filteredFinances.filter(
    (f) => f.finance_type === "expense"
  );

  const timeFinances = filteredFinances.filter(
    (f) => f.finance_type === "time"
  );

  const timeMetrics = timeFinances.reduce(
    (acc, curr) => ({
      totalHours: acc.totalHours + (curr.hours || 0),
      totalAmount: acc.totalAmount + Number(curr.amount),
    }),
    { totalHours: 0, totalAmount: 0 }
  );

  const isLoading = loading || permissionsLoading;

  // Check view permission
  if (!isLoading && !canViewFinances) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          
          <p className="text-muted-foreground mb-4 max-w-md">
            Financial data is restricted based on your role and case assignment.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-4 max-w-md">
            <div className="flex items-start gap-2 text-sm text-left">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Why?</span>
                <p className="text-muted-foreground mt-1">
                  Billing rates, client invoices, and expense details require management oversight. This protects both client confidentiality and internal pricing.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground max-w-md">
            Investigators can view their own time entries on the My Time page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Tabs defaultValue="time-expenses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-1">
          <TabsTrigger value="time-expenses" className="text-xs sm:text-sm px-2 sm:px-3">Time & Expenses</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs sm:text-sm px-2 sm:px-3">Billing</TabsTrigger>
          <TabsTrigger value="financial-summary" className="text-xs sm:text-sm px-2 sm:px-3">Financial Summary</TabsTrigger>
        </TabsList>

        {/* TIME & EXPENSES - Aggregation and Review View */}
        <TabsContent value="time-expenses" className="space-y-6 animate-fade-in">
          {isLoading ? (
            <ExpensesTabSkeleton />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Time & Expenses</h2>
                  <p className="text-muted-foreground">Review and approve entries from all updates</p>
                </div>
              </div>

              <CaseTimeExpensesReview
                caseId={caseId}
                organizationId={organization?.id || ""}
                canApprove={canEditFinances}
              />
            </>
          )}
        </TabsContent>

        {/* BILLING - Invoice History and Unbilled Items */}
        <TabsContent value="billing" className="space-y-6 animate-fade-in">
          {isLoading ? (
            <InvoicesTabSkeleton />
          ) : (
            <CaseBillingTab
              caseId={caseId}
              organizationId={organization?.id || ""}
            />
          )}
        </TabsContent>

        {/* FINANCIAL SUMMARY - Retainers, Invoices, Balances */}
        <TabsContent value="financial-summary" className="space-y-6 animate-fade-in">
          {isLoading ? (
            <InvoicesTabSkeleton />
          ) : (
            <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Financial Summary</h2>
              <p className="text-muted-foreground">
                Retainers, invoices, and payment status
              </p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    const exportColumns: ExportColumn[] = [
                      { key: "invoice_number", label: "Invoice #" },
                      { key: "date", label: "Date", format: (v) => format(new Date(v), "MMM d, yyyy") },
                      { key: "status", label: "Status", format: (v) => v?.charAt(0).toUpperCase() + v?.slice(1) || "-" },
                      { key: "total", label: "Amount", format: (v) => `$${Number(v).toFixed(2)}`, align: "right" },
                      { key: "retainer_applied", label: "Retainer Applied", format: (v) => v ? `$${Number(v).toFixed(2)}` : "-", align: "right" },
                      { key: "total_paid", label: "Paid", format: (v) => v ? `$${Number(v).toFixed(2)}` : "$0.00", align: "right" },
                    ];
                    exportToCSV(invoices, exportColumns, "case-invoices");
                  }}>
                    Export to CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const exportColumns: ExportColumn[] = [
                      { key: "invoice_number", label: "Invoice #" },
                      { key: "date", label: "Date", format: (v) => format(new Date(v), "MMM d, yyyy") },
                      { key: "status", label: "Status", format: (v) => v?.charAt(0).toUpperCase() + v?.slice(1) || "-" },
                      { key: "total", label: "Amount", format: (v) => `$${Number(v).toFixed(2)}`, align: "right" },
                    ];
                    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
                    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.total_paid || 0), 0);
                    exportToPDF(invoices, exportColumns, "Case Invoices", "case-invoices", [
                      { label: "Total Invoiced", value: `$${totalInvoiced.toFixed(2)}` },
                      { label: "Total Paid", value: `$${totalPaid.toFixed(2)}` }
                    ]);
                  }}>
                    Export to PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Retainer</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${totals.retainerTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invoiceMetrics.unpaidCount}</div>
                <p className="text-xs text-muted-foreground">${invoiceMetrics.unpaidTotal.toFixed(2)} outstanding</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Invoiced</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">${totals.invoiceTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Warning */}
          {invoiceMetrics.overdueCount > 0 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-500 mb-1">
                      {invoiceMetrics.overdueCount} {invoiceMetrics.overdueCount === 1 ? 'invoice is' : 'invoices are'} overdue
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Total outstanding: <span className="font-bold text-red-500">${invoiceMetrics.overdueTotal.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <h3 className="text-lg font-semibold">Invoices</h3>

            {invoices.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No invoices created yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => window.location.href = `/invoices/${invoice.id}`}
                      >
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold">${Number(invoice.total).toFixed(2)}</div>
                          {invoice.retainer_applied > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Retainer: -${Number(invoice.retainer_applied).toFixed(2)}
                            </div>
                          )}
                          {(() => {
                            // Calculate correct balance: total - total_paid
                            const totalPaid = Number(invoice.total_paid || 0);
                            const balanceDue = Math.max(0, Number(invoice.total) - totalPaid);
                            if (balanceDue !== Number(invoice.total) && balanceDue > 0) {
                              return (
                                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                  Due: ${balanceDue.toFixed(2)}
                                </div>
                              );
                            } else if (balanceDue === 0 && totalPaid > 0) {
                              return (
                                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                                  Paid in Full
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {(canEditFinances || canDeleteFinances) ? (
                            <div className="flex justify-end gap-1">
                              {canEditFinances && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Convert invoice to finance format for editing
                                    const financeData = {
                                      id: invoice.id,
                                      finance_type: 'invoice',
                                      amount: invoice.total,
                                      description: invoice.invoice_number,
                                      date: invoice.date,
                                      due_date: invoice.due_date,
                                      status: invoice.status,
                                      invoice_number: invoice.invoice_number,
                                      notes: invoice.notes,
                                      created_at: invoice.created_at
                                    };
                                    handleEdit(financeData);
                                  }}
                                  title="Edit invoice"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeleteFinances && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(invoice.id)}
                                  title="Delete invoice"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <FinanceForm
        caseId={caseId}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={fetchFinances}
        editingFinance={editingFinance}
        defaultFinanceType={defaultFinanceType}
        organizationId={organization?.id || ""}
      />

      <FinancialEntryDialog
        caseId={caseId}
        organizationId={organization?.id || ""}
        open={financialEntryOpen}
        onOpenChange={setFinancialEntryOpen}
        onSuccess={fetchFinances}
      />

      {selectedInvoiceId && (
        <InvoiceDetail
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </>
  );
};
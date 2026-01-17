import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Pencil, Trash2, Check, X, Plus, Download, FileSpreadsheet, FileText, CheckCircle2, XCircle, CalendarIcon, Receipt, MoreVertical } from "lucide-react";
import { ImportTemplateDropdown } from "@/components/ui/import-template-button";

import { ResponsiveButton } from "@/components/ui/responsive-button";
import { FinanceForm } from "@/components/case-detail/FinanceForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import html2pdf from "html2pdf.js";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { ExpensesPageSkeleton } from "@/components/ui/list-page-skeleton";

// Expense interface matching expense_entries table
interface Expense {
  id: string;
  case_id: string;
  created_at: string;
  case_title: string;
  case_number: string;
  item_type: string;
  quantity: number;
  rate: number;       // Pay rate (internal cost)
  total: number;      // Pay total (internal cost)
  status: string;
  notes: string | null;
  user_name?: string;
}

interface Case {
  id: string;
  title: string;
  case_number: string;
}

const AllExpenses = () => {
  useSetBreadcrumbs([{ label: "Expenses" }]);
  
  const { organization } = useOrganization();
  const { isAdmin, isManager } = useUserRole();
  const canViewRates = isAdmin || isManager;
  
  // Define columns dynamically based on role
  const COLUMNS: ColumnDefinition[] = useMemo(() => {
    const cols: ColumnDefinition[] = [
      { key: "select", label: "Select", hideable: false },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
      { key: "case", label: "Case" },
      { key: "category", label: "Type" },
      { key: "quantity", label: "Quantity" },
    ];
    
    if (canViewRates) {
      cols.push({ key: "rate", label: "Pay Rate" });
      cols.push({ key: "total", label: "Pay Total" });
    }
    
    cols.push(
      { key: "actions", label: "Actions", hideable: false }
    );
    
    return cols;
  }, [canViewRates]);
  
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  // viewMode state removed - always use list view
  
  // Filter states
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  
  // Sorting states
  const { sortColumn, sortDirection, handleSort } = useSortPreference("expenses", "date", "desc");

  // Bulk selection state
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Add expense/time dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [financeFormType, setFinanceFormType] = useState<"expense" | "time">("expense");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("expenses-columns", COLUMNS);

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchExpenseData();
    }
  }, [organization?.id]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedExpenses(new Set());
  }, [expenseSearch, expenseStatusFilter, dateFrom, dateTo]);

  const fetchExpenseData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const orgId = organization.id;

      // Fetch all cases first (needed for joins and dropdown)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("organization_id", orgId)
        .order("case_number", { ascending: false });

      if (casesError) throw casesError;

      setCases(casesData || []);
      const casesMap = new Map(casesData?.map(c => [c.id, c]) || []);

      // Fetch all expenses from expense_entries (canonical table)
      const { data: expenseData, error: expenseError } = await supabase
        .from("expense_entries")
        .select(`
          id, case_id, created_at, quantity, rate, total, status, item_type, notes,
          profiles:user_id (full_name)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (expenseError) throw expenseError;

      const formattedExpenses: Expense[] = expenseData?.map((exp: any) => {
        const caseInfo = casesMap.get(exp.case_id);
        return {
          id: exp.id,
          case_id: exp.case_id,
          created_at: exp.created_at,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          item_type: exp.item_type || "Other",
          quantity: parseFloat(exp.quantity) || 1,
          rate: parseFloat(exp.rate) || 0,
          total: parseFloat(exp.total) || 0,
          status: exp.status,
          notes: exp.notes,
          user_name: exp.profiles?.full_name,
        };
      }) || [];

      setExpenses(formattedExpenses);
    } catch (error: any) {
      console.error("Error fetching expense data:", error);
      toast.error("Failed to load expense data");
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filteredExpenses = expenses.filter((expense) => {
    const searchLower = expenseSearch.toLowerCase();
    const matchesSearch =
      expense.case_title.toLowerCase().includes(searchLower) ||
      expense.case_number.toLowerCase().includes(searchLower) ||
      (expense.item_type?.toLowerCase().includes(searchLower) ?? false);
    
    const matchesStatus =
      expenseStatusFilter === "all" ||
      (expenseStatusFilter === "committed" && expense.status === "committed") ||
      (expenseStatusFilter === "approved" && expense.status === "approved") ||
      (expenseStatusFilter === "rejected" && expense.status === "rejected") ||
      (expenseStatusFilter === "pending" && expense.status === "pending");
    
    // Date range filter
    const expenseDate = new Date(expense.created_at);
    const matchesDateFrom = !dateFrom || expenseDate >= dateFrom;
    const matchesDateTo = !dateTo || expenseDate <= dateTo;
    
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  // Sorted data
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn as keyof Expense];
    let bVal: any = b[sortColumn as keyof Expense];
    
    if (sortColumn === "case") {
      aVal = a.case_title;
      bVal = b.case_title;
    }
    
    if (sortColumn === "category") {
      aVal = a.item_type;
      bVal = b.item_type;
    }
    
    if (sortColumn === "date") {
      aVal = a.created_at;
      bVal = b.created_at;
    }
    
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;
    
    if (sortColumn === "date") {
      return sortDirection === "asc"
        ? new Date(aVal).getTime() - new Date(bVal).getTime()
        : new Date(bVal).getTime() - new Date(aVal).getTime();
    }
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return 0;
  });

  // Get pending expenses for bulk selection
  const pendingExpenses = sortedExpenses.filter(exp => exp.status === "pending");

  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set(selectedExpenses);
    pendingExpenses.forEach(exp => {
      if (checked) {
        newSelected.add(exp.id);
      } else {
        newSelected.delete(exp.id);
      }
    });
    setSelectedExpenses(newSelected);
  };

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    const newSelected = new Set(selectedExpenses);
    if (checked) {
      newSelected.add(expenseId);
    } else {
      newSelected.delete(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedExpenses.size === 0) return;
    
    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedExpenses);
      const { error } = await supabase
        .from("expense_entries")
        .update({ status: "approved" })
        .in("id", ids);

      if (error) throw error;

      toast.success(`${ids.length} expense${ids.length > 1 ? 's' : ''} approved`);
      setSelectedExpenses(new Set());
      fetchExpenseData();
    } catch (error) {
      console.error("Error approving expenses:", error);
      toast.error("Failed to approve expenses");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedExpenses.size === 0) return;
    
    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedExpenses);
      const { error } = await supabase
        .from("expense_entries")
        .update({ status: "declined" as any })
        .in("id", ids);

      if (error) throw error;

      toast.success(`${ids.length} expense${ids.length > 1 ? 's' : ''} rejected`);
      setSelectedExpenses(new Set());
      fetchExpenseData();
    } catch (error) {
      console.error("Error rejecting expenses:", error);
      toast.error("Failed to reject expenses");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Helper to get status display name
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "committed": return "Billed";
      case "approved": return "Approved (Ready for Billing)";
      case "rejected": return "Rejected";
      case "pending": return "Pending";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Export functions
  const exportToCSV = () => {
    // Build headers based on role visibility
    const headers = ["Date", "Case Number", "Case Title", "Type", "Quantity"];
    if (canViewRates) {
      headers.push("Pay Rate", "Pay Total");
    }
    headers.push("Status");
    
    const rows = filteredExpenses.map(exp => {
      const row: (string | number)[] = [
        format(new Date(exp.created_at), "yyyy-MM-dd"),
        exp.case_number,
        exp.case_title,
        exp.item_type || "",
        exp.quantity || 1,
      ];
      
      if (canViewRates) {
        row.push(exp.rate.toFixed(2), exp.total.toFixed(2));
      }
      
      row.push(getStatusDisplay(exp.status));
      return row;
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Expenses exported to CSV");
  };

  const exportToPDF = () => {
    // Build table headers based on role
    const rateHeaders = canViewRates ? `
      <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Pay Rate</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Pay Total</th>
    ` : '';
    
    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="margin-bottom: 8px; font-size: 24px;">Expenses Report</h1>
        <p style="margin-bottom: 4px; color: #666; font-size: 12px;">Internal expense tracking for investigator reimbursement</p>
        <p style="margin-bottom: 20px; color: #666; font-size: 14px;">Generated: ${format(new Date(), "MMMM d, yyyy")}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Case</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Type</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Qty</th>
              ${rateHeaders}
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses.map(exp => {
              const rateColumns = canViewRates ? `
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${exp.rate.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${exp.total.toFixed(2)}</td>
              ` : '';
              return `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(exp.created_at), "MMM d, yyyy")}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${exp.case_number} - ${exp.case_title}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${exp.item_type || "-"}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${exp.quantity || 1}</td>
                  ${rateColumns}
                  <td style="border: 1px solid #ddd; padding: 8px;">${getStatusDisplay(exp.status)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
          ${canViewRates ? `
          <tfoot>
            <tr style="background: #f3f4f6; font-weight: bold;">
              <td colspan="5" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${filteredExpenses.reduce((sum, e) => sum + e.total, 0).toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;"></td>
            </tr>
          </tfoot>
          ` : ''}
        </table>
      </div>
    `;
    
    html2pdf()
      .set({
        margin: 10,
        filename: `expenses-${format(new Date(), "yyyy-MM-dd")}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
      })
      .from(printContent)
      .save();
    
    toast.success("Expenses exported to PDF");
  };

  const openAddExpense = () => {
    setFinanceFormType("expense");
    setSelectedCaseId("");
    setShowAddDialog(true);
  };

  const handleCaseSelected = () => {
    setShowAddDialog(false);
    setShowExpenseForm(true);
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "committed":
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case "approved":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
    }
  };

  if (loading) {
    return <ExpensesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-2">
            Internal expense tracking for investigator reimbursement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddExpense}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedExpenses.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedExpenses.size} expense{selectedExpenses.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleBulkApprove}
                  disabled={isBulkProcessing}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleBulkReject}
                  disabled={isBulkProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedExpenses(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case, type..."
            value={expenseSearch}
            onChange={(e) => setExpenseSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={expenseStatusFilter} onValueChange={setExpenseStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="committed">Billed</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[140px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[140px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setDateFrom(undefined);
              setDateTo(undefined);
            }}
            title="Clear date filters"
            className="h-10 w-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <ColumnVisibility
          columns={COLUMNS}
          visibility={visibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ResponsiveButton
              icon={<Download className="h-4 w-4" />}
              label="Export"
              variant="outline"
              size="sm"
              className="h-10"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ImportTemplateDropdown 
          options={[
            { fileName: "10_Expenses.csv", label: "Expenses Template" },
          ]} 
        />
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedExpenses.length} expense{sortedExpenses.length !== 1 ? 's' : ''}
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No expenses yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by adding your first expense
            </p>
            <Button className="gap-2" onClick={openAddExpense}>
              <Plus className="w-4 h-4" />
              Add First Expense
            </Button>
          </CardContent>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No expenses match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isVisible("select") && (
                  <SortableTableHead
                    column=""
                    label=""
                    sortColumn=""
                    sortDirection="asc"
                    onSort={() => {}}
                    className="w-[40px]"
                  />
                )}
                {isVisible("date") && (
                  <SortableTableHead
                    column="date"
                    label="Date"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("status") && (
                  <SortableTableHead
                    column="status"
                    label="Status"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("case") && (
                  <SortableTableHead
                    column="case"
                    label="Case"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("category") && (
                  <SortableTableHead
                    column="category"
                    label="Type"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("quantity") && (
                  <SortableTableHead
                    column="quantity"
                    label="Quantity"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {canViewRates && isVisible("rate") && (
                  <SortableTableHead
                    column="rate"
                    label="Pay Rate"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right w-[100px]"
                  />
                )}
                {canViewRates && isVisible("total") && (
                  <SortableTableHead
                    column="total"
                    label="Pay Total"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right w-[100px]"
                  />
                )}
                {isVisible("actions") && (
                  <TableHead className="w-[60px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExpenses.map((expense) => {
                const isPending = expense.status === "pending";
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {isPending ? (
                        <Checkbox
                          checked={selectedExpenses.has(expense.id)}
                          onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
                        />
                      ) : (
                        <div className="w-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className={getStatusBadge(expense.status)}>
                        {getStatusDisplay(expense.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{expense.case_number}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{expense.case_title}</div>
                    </TableCell>
                    <TableCell>{expense.item_type || "N/A"}</TableCell>
                    <TableCell>
                      {(expense.quantity || 1).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </TableCell>
                    {canViewRates && (
                      <>
                        <TableCell className="text-right w-[100px]">
                          ${expense.rate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right w-[100px] font-medium">
                          ${expense.total.toFixed(2)}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          {isPending && (
                            <>
                              <DropdownMenuItem 
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("expense_entries")
                                    .update({ status: "approved" })
                                    .eq("id", expense.id);
                                  
                                  if (error) {
                                    toast.error("Failed to approve expense");
                                  } else {
                                    toast.success("Expense approved");
                                    fetchExpenseData();
                                  }
                                }}
                                className="text-green-600"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("expense_entries")
                                    .update({ status: "declined" as any })
                                    .eq("id", expense.id);
                                  
                                  if (error) {
                                    toast.error("Failed to reject expense");
                                  } else {
                                    toast.success("Expense rejected");
                                    fetchExpenseData();
                                  }
                                }}
                                className="text-red-600"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={async () => {
                              const { data, error } = await supabase
                                .from("expense_entries")
                                .select("*")
                                .eq("id", expense.id)
                                .single();
                              
                              if (error) {
                                toast.error("Failed to load expense details");
                              } else {
                                setEditingExpense(data);
                                setShowExpenseForm(true);
                              }
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this expense?")) {
                                const { error } = await supabase
                                  .from("expense_entries")
                                  .delete()
                                  .eq("id", expense.id);
                                
                                if (error) {
                                  toast.error("Failed to delete expense");
                                } else {
                                  toast.success("Expense deleted");
                                  fetchExpenseData();
                                }
                              }
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add Expense Dialog - Case Selection */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Select a case to add an expense to
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a case..." />
            </SelectTrigger>
            <SelectContent>
              {cases.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.case_number} - {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!selectedCaseId}
              onClick={handleCaseSelected}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Expense Dialog */}
      {showExpenseForm && (
        <FinanceForm
          caseId={selectedCaseId || editingExpense?.case_id || ""}
          open={showExpenseForm}
          onOpenChange={(open) => {
            if (!open) {
              setShowExpenseForm(false);
              setEditingExpense(null);
              setSelectedCaseId("");
            }
          }}
          onSuccess={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
            setSelectedCaseId("");
            fetchExpenseData();
          }}
          editingFinance={editingExpense}
          defaultFinanceType={financeFormType}
          organizationId={organization?.id || ""}
        />
      )}
    </div>
  );
};

export default AllExpenses;
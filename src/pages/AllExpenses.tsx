import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Pencil, Trash2, Check, X, Plus, Clock, Download, FileSpreadsheet, FileText, CheckCircle2, XCircle, CalendarIcon, LayoutGrid, List, Receipt } from "lucide-react";
import { FinanceForm } from "@/components/case-detail/FinanceForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import html2pdf from "html2pdf.js";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { ExpensesPageSkeleton } from "@/components/ui/list-page-skeleton";

interface Expense {
  id: string;
  case_id: string;
  date: string;
  case_title: string;
  case_number: string;
  category: string | null;
  amount: number;
  status: string | null;
  invoiced: boolean;
  quantity: number | null;
}

interface Case {
  id: string;
  title: string;
  case_number: string;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "select", label: "Select", hideable: false },
  { key: "date", label: "Date" },
  { key: "case", label: "Case" },
  { key: "category", label: "Category" },
  { key: "quantity", label: "Quantity" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", hideable: false },
];

const AllExpenses = () => {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
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

      // Fetch all expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from("case_finances")
        .select("id, case_id, date, amount, category, status, invoiced, quantity")
        .eq("organization_id", orgId)
        .eq("finance_type", "expense")
        .order("date", { ascending: false });

      if (expenseError) throw expenseError;

      const formattedExpenses: Expense[] = expenseData?.map((exp: any) => {
        const caseInfo = casesMap.get(exp.case_id);
        return {
          id: exp.id,
          case_id: exp.case_id,
          date: exp.date,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          category: exp.category,
          amount: parseFloat(exp.amount),
          status: exp.status,
          invoiced: exp.invoiced,
          quantity: exp.quantity ? parseFloat(exp.quantity) : null,
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
      (expense.category?.toLowerCase().includes(searchLower) ?? false);
    
    const matchesStatus =
      expenseStatusFilter === "all" ||
      (expenseStatusFilter === "invoiced" && expense.invoiced) ||
      (expenseStatusFilter === "approved" && !expense.invoiced && expense.status === "approved") ||
      (expenseStatusFilter === "rejected" && expense.status === "rejected") ||
      (expenseStatusFilter === "pending" && !expense.invoiced && expense.status === "pending");
    
    // Date range filter
    const expenseDate = new Date(expense.date);
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
  const pendingExpenses = sortedExpenses.filter(exp => exp.status === "pending" && !exp.invoiced);
  const allPendingSelected = pendingExpenses.length > 0 && 
    pendingExpenses.every(exp => selectedExpenses.has(exp.id));
  const somePendingSelected = pendingExpenses.some(exp => selectedExpenses.has(exp.id));

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
        .from("case_finances")
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
        .from("case_finances")
        .update({ status: "rejected" })
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

  // Export functions
  const exportToCSV = () => {
    const headers = ["Date", "Case Number", "Case Title", "Category", "Quantity", "Amount", "Status"];
    const rows = filteredExpenses.map(exp => [
      format(new Date(exp.date), "yyyy-MM-dd"),
      exp.case_number,
      exp.case_title,
      exp.category || "",
      exp.quantity || 1,
      exp.amount.toFixed(2),
      exp.invoiced ? "Invoiced" : (exp.status || "Pending")
    ]);
    
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
    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="margin-bottom: 8px; font-size: 24px;">Expenses Report</h1>
        <p style="margin-bottom: 20px; color: #666; font-size: 14px;">Generated: ${format(new Date(), "MMMM d, yyyy")}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Case</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Category</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Qty</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses.map(exp => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(exp.date), "MMM d, yyyy")}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${exp.case_number} - ${exp.case_title}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${exp.category || "-"}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${exp.quantity || 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${exp.amount.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${exp.invoiced ? "Invoiced" : (exp.status || "Pending")}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr style="background: #f3f4f6; font-weight: bold;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;"></td>
            </tr>
          </tfoot>
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

  const openAddTime = () => {
    setFinanceFormType("time");
    setSelectedCaseId("");
    setShowAddDialog(true);
  };

  const handleCaseSelected = () => {
    setShowAddDialog(false);
    setShowExpenseForm(true);
  };

  if (loading) {
    return <ExpensesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-2">
            Manage expenses across all cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddExpense}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          <Button variant="outline" onClick={openAddTime}>
            <Clock className="h-4 w-4 mr-2" />
            Add Time
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

      {/* Search and Filters - Outside Card */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case, category..."
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
            <SelectItem value="invoiced">Invoiced</SelectItem>
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
            <Button variant="outline" size="sm" className="h-10">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
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
        <div className="flex gap-1 border rounded-md p-1 h-10">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-7 w-7 p-0"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 w-7 p-0"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedExpenses.map((expense) => {
            const isPending = expense.status === "pending" && !expense.invoiced;
            return (
              <Card key={expense.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{expense.case_title}</div>
                      <div className="text-sm text-muted-foreground">{expense.case_number}</div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        expense.invoiced
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : expense.status === "approved"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : expense.status === "rejected"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}
                    >
                      {expense.invoiced ? "Invoiced" : expense.status || "Pending"}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{format(new Date(expense.date), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <span>{expense.category || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">${expense.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    {isPending && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("case_finances")
                              .update({ status: "approved" })
                              .eq("id", expense.id);
                            
                            if (error) {
                              toast.error("Failed to approve expense");
                            } else {
                              toast.success("Expense approved");
                              fetchExpenseData();
                            }
                          }}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("case_finances")
                              .update({ status: "rejected" })
                              .eq("id", expense.id);
                            
                            if (error) {
                              toast.error("Failed to reject expense");
                            } else {
                              toast.success("Expense rejected");
                              fetchExpenseData();
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const { data, error } = await supabase
                          .from("case_finances")
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
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this expense?")) {
                          const { error } = await supabase
                            .from("case_finances")
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
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
            {sortedExpenses.map((expense) => {
              const isPending = expense.status === "pending" && !expense.invoiced;
              return (
                <Card key={expense.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{expense.case_title}</div>
                        <div className="text-sm text-muted-foreground">{expense.case_number}</div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expense.invoiced
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : expense.status === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : expense.status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {expense.invoiced ? "Invoiced" : expense.status || "Pending"}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Date: {format(new Date(expense.date), "MMM d, yyyy")}</div>
                      <div>Category: {expense.category || "N/A"}</div>
                      <div className="font-medium">Amount: ${expense.amount.toFixed(2)}</div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      {isPending && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("case_finances")
                                .update({ status: "approved" })
                                .eq("id", expense.id);
                              
                              if (error) {
                                toast.error("Failed to approve expense");
                              } else {
                                toast.success("Expense approved");
                                fetchExpenseData();
                              }
                            }}
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("case_finances")
                                .update({ status: "rejected" })
                                .eq("id", expense.id);
                              
                              if (error) {
                                toast.error("Failed to reject expense");
                              } else {
                                toast.success("Expense rejected");
                                fetchExpenseData();
                              }
                            }}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden sm:block">
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
                      label="Category"
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
                  {isVisible("amount") && (
                    <SortableTableHead
                      column="amount"
                      label="Amount"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-right"
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
                  {isVisible("actions") && (
                    <SortableTableHead
                      column=""
                      label="Actions"
                      sortColumn=""
                      sortDirection="asc"
                      onSort={() => {}}
                      className="text-right"
                    />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpenses.map((expense) => {
                  const isPending = expense.status === "pending" && !expense.invoiced;
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
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{expense.case_title}</div>
                          <div className="text-sm text-muted-foreground">
                            {expense.case_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{expense.category || "N/A"}</TableCell>
                      <TableCell>
                        {(expense.quantity || 1).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            expense.invoiced
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : expense.status === "approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : expense.status === "rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {expense.invoiced ? "Invoiced" : expense.status || "Pending"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isPending && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("case_finances")
                                    .update({ status: "approved" })
                                    .eq("id", expense.id);
                                  
                                  if (error) {
                                    toast.error("Failed to approve expense");
                                  } else {
                                    toast.success("Expense approved");
                                    fetchExpenseData();
                                  }
                                }}
                                title="Approve expense"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("case_finances")
                                    .update({ status: "rejected" })
                                    .eq("id", expense.id);
                                  
                                  if (error) {
                                    toast.error("Failed to reject expense");
                                  } else {
                                    toast.success("Expense rejected");
                                    fetchExpenseData();
                                  }
                                }}
                                title="Reject expense"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              const { data, error } = await supabase
                                .from("case_finances")
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
                            title="Edit expense"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this expense?")) {
                                const { error } = await supabase
                                  .from("case_finances")
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
                            title="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Add Expense/Time Dialog - Case Selection */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {financeFormType === "expense" ? "Add Expense" : "Add Time Entry"}
            </DialogTitle>
            <DialogDescription>
              Select a case to add {financeFormType === "expense" ? "an expense" : "a time entry"} to
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

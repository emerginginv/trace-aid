import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Loader2, DollarSign, Receipt, Wallet, Search, Eye, Pencil, Trash2, CircleDollarSign, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import RecordPaymentModal from "@/components/case-detail/RecordPaymentModal";
import { EditInvoiceDialog } from "@/components/case-detail/EditInvoiceDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RetainerBalance {
  case_id: string;
  case_title: string;
  case_number: string;
  balance: number;
  last_topup: string | null;
}

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

interface Invoice {
  id: string;
  invoice_number: string | null;
  case_title: string;
  case_number: string;
  case_id: string;
  date: string;
  amount: number;
  status: string | null;
  due_date: string | null;
  balance_due?: number;
  total_paid?: number;
}

const Finance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalRetainerBalance, setTotalRetainerBalance] = useState(0);
  const [totalOutstandingExpenses, setTotalOutstandingExpenses] = useState(0);
  const [totalUnpaidInvoices, setTotalUnpaidInvoices] = useState(0);
  const [retainerBalances, setRetainerBalances] = useState<RetainerBalance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Filter states
  const [retainerSearch, setRetainerSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [showPayModal, setShowPayModal] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [retainerMap, setRetainerMap] = useState<Record<string, number>>({});
  
  // Pagination states
  const [retainerPage, setRetainerPage] = useState(1);
  const [retainerPageSize, setRetainerPageSize] = useState(15);
  const [expensePage, setExpensePage] = useState(1);
  const [expensePageSize, setExpensePageSize] = useState(15);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(15);
  
  // Collapsible states
  const [retainerOpen, setRetainerOpen] = useState(true);
  const [expensesOpen, setExpensesOpen] = useState(true);
  const [invoicesOpen, setInvoicesOpen] = useState(true);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!memberData) return;

      // Fetch all cases first (needed for joins)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("organization_id", memberData.organization_id);

      if (casesError) throw casesError;

      const casesMap = new Map(casesData?.map(c => [c.id, c]) || []);

      // Fetch retainer balances by case
      const { data: retainerData, error: retainerError } = await supabase
        .from("retainer_funds")
        .select("case_id, amount, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (retainerError) throw retainerError;

      // Aggregate retainer balances by case
      const balanceMap = new Map<string, RetainerBalance>();
      retainerData?.forEach((fund: any) => {
        const caseId = fund.case_id;
        const caseInfo = casesMap.get(caseId);
        
        if (!balanceMap.has(caseId)) {
          balanceMap.set(caseId, {
            case_id: caseId,
            case_title: caseInfo?.title || "Unknown",
            case_number: caseInfo?.case_number || "N/A",
            balance: 0,
            last_topup: null,
          });
        }
        const current = balanceMap.get(caseId)!;
        current.balance += parseFloat(fund.amount);
        if (!current.last_topup || fund.created_at > current.last_topup) {
          current.last_topup = fund.created_at;
        }
      });

      const balances = Array.from(balanceMap.values());
      setRetainerBalances(balances);
      setTotalRetainerBalance(balances.reduce((sum, b) => sum + b.balance, 0));
      
      // Create retainer map for quick lookup by case_id
      const caseRetainerMap: Record<string, number> = {};
      balances.forEach(b => {
        caseRetainerMap[b.case_id] = b.balance;
      });
      setRetainerMap(caseRetainerMap);

      // Fetch all expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from("case_finances")
        .select("id, case_id, date, amount, category, status, invoiced, quantity")
        .eq("organization_id", memberData.organization_id)
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
      setTotalOutstandingExpenses(
        formattedExpenses
          .filter((e) => !e.invoiced && (e.status === "approved" || e.status === "pending"))
          .reduce((sum, e) => sum + e.amount, 0)
      );

      // Fetch all invoices from new invoices table
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, case_id, invoice_number, date, total, status, due_date, balance_due, total_paid")
        .eq("organization_id", memberData.organization_id)
        .order("date", { ascending: false });

      if (invoiceError) throw invoiceError;

      const formattedInvoices: Invoice[] = invoiceData?.map((inv: any) => {
        const caseInfo = casesMap.get(inv.case_id);
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          case_id: inv.case_id,
          date: inv.date,
          amount: parseFloat(inv.total),
          status: inv.status,
          due_date: inv.due_date,
          balance_due: inv.balance_due ? parseFloat(inv.balance_due) : undefined,
          total_paid: inv.total_paid ? parseFloat(inv.total_paid) : 0,
        };
      }) || [];

      setInvoices(formattedInvoices);
      setTotalUnpaidInvoices(
        formattedInvoices
          .filter((i) => i.status === "unpaid")
          .reduce((sum, i) => sum + i.amount, 0)
      );
    } catch (error: any) {
      console.error("Error fetching finance data:", error);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filteredRetainerBalances = retainerBalances.filter((balance) => {
    const searchLower = retainerSearch.toLowerCase();
    return (
      balance.case_title.toLowerCase().includes(searchLower) ||
      balance.case_number.toLowerCase().includes(searchLower)
    );
  });

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
      (expenseStatusFilter === "pending" && !expense.invoiced && expense.status === "pending");
    
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = invoiceSearch.toLowerCase();
    const matchesSearch =
      invoice.case_title.toLowerCase().includes(searchLower) ||
      invoice.case_number.toLowerCase().includes(searchLower) ||
      (invoice.invoice_number?.toLowerCase().includes(searchLower) ?? false);
    
    const matchesStatus =
      invoiceStatusFilter === "all" ||
      invoice.status === invoiceStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginated data
  const paginatedRetainerBalances = filteredRetainerBalances.slice(
    (retainerPage - 1) * retainerPageSize,
    retainerPage * retainerPageSize
  );
  const retainerTotalPages = Math.ceil(filteredRetainerBalances.length / retainerPageSize);

  const paginatedExpenses = filteredExpenses.slice(
    (expensePage - 1) * expensePageSize,
    expensePage * expensePageSize
  );
  const expenseTotalPages = Math.ceil(filteredExpenses.length / expensePageSize);

  const paginatedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * invoicePageSize,
    invoicePage * invoicePageSize
  );
  const invoiceTotalPages = Math.ceil(filteredInvoices.length / invoicePageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance Overview</h1>
        <p className="text-muted-foreground">
          Monitor financial health across all cases
        </p>
      </div>

      {/* Summary Widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Total Retainer Funds Available
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${totalRetainerBalance.toFixed(2)}
            </div>
            <p className="text-xs text-blue-500">
              Across {retainerBalances.length} case{retainerBalances.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Billable Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalOutstandingExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-red-500">
              Approved & unbilled
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Outstanding Invoices
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalUnpaidInvoices.toFixed(2)}
            </div>
            <p className="text-xs text-green-500">
              Unpaid invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Retainer Funds List */}
      <Collapsible open={retainerOpen} onOpenChange={setRetainerOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="text-left">
                <CardTitle>Retainer Funds by Case</CardTitle>
                <CardDescription>
                  Current retainer balance for each case
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${retainerOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-[0.625rem] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case name or number..."
                value={retainerSearch}
                onChange={(e) => {
                  setRetainerSearch(e.target.value);
                  setRetainerPage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select value={retainerPageSize.toString()} onValueChange={(v) => {
              setRetainerPageSize(parseInt(v));
              setRetainerPage(1);
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredRetainerBalances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No matching retainer funds found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead>Last Top-Up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRetainerBalances.map((balance) => (
                  <TableRow
                    key={balance.case_id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{balance.case_title}</TableCell>
                    <TableCell>{balance.case_number}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${balance.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {balance.last_topup
                        ? format(new Date(balance.last_topup), "MMM d, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cases/${balance.case_id}`)}
                          title="View case"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredRetainerBalances.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((retainerPage - 1) * retainerPageSize) + 1} to {Math.min(retainerPage * retainerPageSize, filteredRetainerBalances.length)} of {filteredRetainerBalances.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetainerPage(p => Math.max(1, p - 1))}
                  disabled={retainerPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {retainerPage} of {retainerTotalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetainerPage(p => Math.min(retainerTotalPages, p + 1))}
                  disabled={retainerPage === retainerTotalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Expenses List */}
      <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="text-left">
                <CardTitle>All Expenses</CardTitle>
                <CardDescription>
                  Expenses across all cases
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${expensesOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-[0.625rem] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case, category..."
                value={expenseSearch}
                onChange={(e) => {
                  setExpenseSearch(e.target.value);
                  setExpensePage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select value={expenseStatusFilter} onValueChange={(v) => {
              setExpenseStatusFilter(v);
              setExpensePage(1);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={expensePageSize.toString()} onValueChange={(v) => {
              setExpensePageSize(parseInt(v));
              setExpensePage(1);
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredExpenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No matching expenses found
            </p>
          ) : (
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
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
                      {expense.quantity ? 
                        expense.quantity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) 
                        : '–'}
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
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {expense.invoiced ? "Invoiced" : expense.status || "Pending"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigate(`/cases/${expense.case_id}?tab=finances`);
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
                                fetchFinanceData();
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
                ))}
              </TableBody>
            </Table>
          )}
          {filteredExpenses.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((expensePage - 1) * expensePageSize) + 1} to {Math.min(expensePage * expensePageSize, filteredExpenses.length)} of {filteredExpenses.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                  disabled={expensePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {expensePage} of {expenseTotalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpensePage(p => Math.min(expenseTotalPages, p + 1))}
                  disabled={expensePage === expenseTotalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Invoices List */}
      <Collapsible open={invoicesOpen} onOpenChange={setInvoicesOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="text-left">
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>
                  System-wide invoice overview
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${invoicesOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-[0.625rem] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, case..."
                value={invoiceSearch}
                onChange={(e) => {
                  setInvoiceSearch(e.target.value);
                  setInvoicePage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select value={invoiceStatusFilter} onValueChange={(v) => {
              setInvoiceStatusFilter(v);
              setInvoicePage(1);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={invoicePageSize.toString()} onValueChange={(v) => {
              setInvoicePageSize(parseInt(v));
              setInvoicePage(1);
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredInvoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No matching invoices found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total / Paid</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {invoice.invoice_number || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.case_title}</div>
                        <div className="text-sm text-muted-foreground">
                          {invoice.case_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <div className="font-medium">${invoice.amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          Paid: ${(invoice.total_paid || 0).toFixed(2)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(invoice.balance_due !== undefined && invoice.balance_due !== null ? invoice.balance_due : (invoice.amount - (invoice.total_paid || 0))).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : invoice.status === "partial"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : invoice.status === "unpaid"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {invoice.status || "Draft"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          title="View invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPayModal(invoice)}
                            title="Record payment"
                          >
                            <CircleDollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingInvoice(invoice.id)}
                          title="Edit invoice"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this invoice?")) {
                              const { error } = await supabase
                                .from("invoices")
                                .delete()
                                .eq("id", invoice.id);
                              
                              if (error) {
                                toast.error("Failed to delete invoice");
                              } else {
                                toast.success("Invoice deleted");
                                fetchFinanceData();
                              }
                            }
                          }}
                          title="Delete invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((invoicePage - 1) * invoicePageSize) + 1} to {Math.min(invoicePage * invoicePageSize, filteredInvoices.length)} of {filteredInvoices.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                  disabled={invoicePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {invoicePage} of {invoiceTotalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicePage(p => Math.min(invoiceTotalPages, p + 1))}
                  disabled={invoicePage === invoiceTotalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Record Payment Modal */}
      {showPayModal && (
        <RecordPaymentModal
          invoice={{
            id: showPayModal.id,
            invoice_number: showPayModal.invoice_number || "",
            case_id: showPayModal.case_id,
            total: showPayModal.amount,
            balance_due: showPayModal.balance_due ?? showPayModal.amount,
          }}
          caseRetainerBalance={retainerMap[showPayModal.case_id] || 0}
          open={!!showPayModal}
          onClose={() => setShowPayModal(null)}
          onPaymentRecorded={fetchFinanceData}
        />
      )}

      {/* Edit Invoice Dialog */}
      {editingInvoice && (
        <EditInvoiceDialog
          invoiceId={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onSuccess={fetchFinanceData}
        />
      )}
    </div>
  );
};

export default Finance;

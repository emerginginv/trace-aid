import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Loader2, DollarSign, Receipt, Wallet, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface RetainerBalance {
  case_id: string;
  case_title: string;
  case_number: string;
  balance: number;
  last_topup: string | null;
}

interface Expense {
  id: string;
  date: string;
  case_title: string;
  case_number: string;
  category: string | null;
  amount: number;
  status: string | null;
  invoiced: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  case_title: string;
  case_number: string;
  date: string;
  amount: number;
  status: string | null;
  due_date: string | null;
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

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all cases first (needed for joins)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("user_id", user.id);

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

      // Fetch all expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from("case_finances")
        .select("id, case_id, date, amount, category, status, invoiced")
        .eq("user_id", user.id)
        .eq("finance_type", "expense")
        .order("date", { ascending: false });

      if (expenseError) throw expenseError;

      const formattedExpenses: Expense[] = expenseData?.map((exp: any) => {
        const caseInfo = casesMap.get(exp.case_id);
        return {
          id: exp.id,
          date: exp.date,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          category: exp.category,
          amount: parseFloat(exp.amount),
          status: exp.status,
          invoiced: exp.invoiced,
        };
      }) || [];

      setExpenses(formattedExpenses);
      setTotalOutstandingExpenses(
        formattedExpenses
          .filter((e) => !e.invoiced && (e.status === "approved" || e.status === "pending"))
          .reduce((sum, e) => sum + e.amount, 0)
      );

      // Fetch all invoices
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("case_finances")
        .select("id, case_id, invoice_number, date, amount, status, due_date")
        .eq("user_id", user.id)
        .eq("finance_type", "invoice")
        .order("date", { ascending: false });

      if (invoiceError) throw invoiceError;

      const formattedInvoices: Invoice[] = invoiceData?.map((inv: any) => {
        const caseInfo = casesMap.get(inv.case_id);
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          date: inv.date,
          amount: parseFloat(inv.amount),
          status: inv.status,
          due_date: inv.due_date,
        };
      }) || [];

      setInvoices(formattedInvoices);
      setTotalUnpaidInvoices(
        formattedInvoices
          .filter((i) => i.status !== "paid")
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Retainer Funds Available
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRetainerBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {retainerBalances.length} case{retainerBalances.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Billable Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalOutstandingExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved & unbilled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Invoices
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalUnpaidInvoices.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unpaid invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Retainer Funds List */}
      <Card>
        <CardHeader>
          <CardTitle>Retainer Funds by Case</CardTitle>
          <CardDescription>
            Current retainer balance for each case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case name or number..."
                value={retainerSearch}
                onChange={(e) => setRetainerSearch(e.target.value)}
                className="pl-8"
              />
            </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRetainerBalances.map((balance) => (
                  <TableRow
                    key={balance.case_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/cases/${balance.case_id}`)}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>
            Expenses across all cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case, category..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={expenseStatusFilter} onValueChange={setExpenseStatusFilter}>
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
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            System-wide invoice overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, case..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
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
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
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
                    <TableCell className="text-right font-medium">
                      ${invoice.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : invoice.status === "sent"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : invoice.status === "partial"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {invoice.status || "Draft"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;

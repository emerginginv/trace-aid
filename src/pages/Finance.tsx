import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Loader2, DollarSign, Receipt, Wallet } from "lucide-react";
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

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch retainer balances by case
      const { data: retainerData, error: retainerError } = await supabase
        .from("retainer_funds")
        .select(`
          case_id,
          amount,
          created_at,
          cases (
            title,
            case_number
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (retainerError) throw retainerError;

      // Aggregate retainer balances by case
      const balanceMap = new Map<string, RetainerBalance>();
      retainerData?.forEach((fund: any) => {
        const caseId = fund.case_id;
        if (!balanceMap.has(caseId)) {
          balanceMap.set(caseId, {
            case_id: caseId,
            case_title: fund.cases?.title || "Unknown",
            case_number: fund.cases?.case_number || "N/A",
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
        .select(`
          id,
          date,
          amount,
          category,
          status,
          invoiced,
          cases (
            title,
            case_number
          )
        `)
        .eq("user_id", user.id)
        .eq("finance_type", "expense")
        .order("date", { ascending: false });

      if (expenseError) throw expenseError;

      const formattedExpenses: Expense[] = expenseData?.map((exp: any) => ({
        id: exp.id,
        date: exp.date,
        case_title: exp.cases?.title || "Unknown",
        case_number: exp.cases?.case_number || "N/A",
        category: exp.category,
        amount: parseFloat(exp.amount),
        status: exp.status,
        invoiced: exp.invoiced,
      })) || [];

      setExpenses(formattedExpenses);
      setTotalOutstandingExpenses(
        formattedExpenses
          .filter((e) => !e.invoiced && (e.status === "approved" || e.status === "pending"))
          .reduce((sum, e) => sum + e.amount, 0)
      );

      // Fetch all invoices
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("case_finances")
        .select(`
          id,
          invoice_number,
          date,
          amount,
          status,
          due_date,
          cases (
            title,
            case_number
          )
        `)
        .eq("user_id", user.id)
        .eq("finance_type", "invoice")
        .order("date", { ascending: false });

      if (invoiceError) throw invoiceError;

      const formattedInvoices: Invoice[] = invoiceData?.map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        case_title: inv.cases?.title || "Unknown",
        case_number: inv.cases?.case_number || "N/A",
        date: inv.date,
        amount: parseFloat(inv.amount),
        status: inv.status,
        due_date: inv.due_date,
      })) || [];

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
          {retainerBalances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No retainer funds found
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
                {retainerBalances.map((balance) => (
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
          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No expenses found
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
                {expenses.map((expense) => (
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
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No invoices found
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
                {invoices.map((invoice) => (
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

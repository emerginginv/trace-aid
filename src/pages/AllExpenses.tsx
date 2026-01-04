import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { FinanceForm } from "@/components/case-detail/FinanceForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";

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

const AllExpenses = () => {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Filter states
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  
  // Pagination states
  const [expensePage, setExpensePage] = useState(1);
  const [expensePageSize, setExpensePageSize] = useState(15);

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchExpenseData();
    }
  }, [organization?.id]);

  const fetchExpenseData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const orgId = organization.id;

      // Fetch all cases first (needed for joins)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("organization_id", orgId);

      if (casesError) throw casesError;

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
      (expenseStatusFilter === "pending" && !expense.invoiced && expense.status === "pending");
    
    return matchesSearch && matchesStatus;
  });

  // Paginated data
  const paginatedExpenses = filteredExpenses.slice(
    (expensePage - 1) * expensePageSize,
    expensePage * expensePageSize
  );
  const expenseTotalPages = Math.ceil(filteredExpenses.length / expensePageSize);

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
        <h1 className="text-3xl font-bold">Expenses</h1>
        <p className="text-muted-foreground">
          Manage expenses across all cases
        </p>
      </div>

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
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {expense.invoiced ? "Invoiced" : expense.status || "Pending"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {expense.status === "pending" && (
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
                            // Fetch full expense details
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
      </Card>

      {/* Edit Expense Dialog */}
      {showExpenseForm && (
        <FinanceForm
          caseId={editingExpense?.case_id || ""}
          open={showExpenseForm}
          onOpenChange={(open) => {
            if (!open) {
              setShowExpenseForm(false);
              setEditingExpense(null);
            }
          }}
          onSuccess={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
            fetchExpenseData();
          }}
          editingFinance={editingExpense}
        />
      )}
    </div>
  );
};

export default AllExpenses;

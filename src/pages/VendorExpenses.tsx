import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Case {
  id: string;
  case_number: string;
  title: string;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  status: string | null;
  case_id: string;
  notes: string | null;
  cases?: {
    case_number: string;
    title: string;
  };
}

export default function VendorExpenses() {
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [expenseCaseId, setExpenseCaseId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch cases accessible to vendor/investigator
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, case_number, title")
        .contains("investigator_ids", [user.id])
        .order("created_at", { ascending: false });

      if (casesError) throw casesError;
      setCases(casesData || []);

      // Fetch vendor's expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("case_finances")
        .select("id, amount, description, category, date, status, case_id, notes")
        .eq("user_id", user.id)
        .eq("finance_type", "expense")
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;

      // Enrich expenses with case details
      const enrichedExpenses = (expensesData || []).map(expense => {
        const caseInfo = casesData?.find(c => c.id === expense.case_id);
        return {
          ...expense,
          cases: caseInfo ? {
            case_number: caseInfo.case_number,
            title: caseInfo.title
          } : undefined
        };
      });

      setExpenses(enrichedExpenses);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expenseCaseId || !expenseAmount || !expenseDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's organization
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!orgMember) throw new Error("Organization not found");

      const { error } = await supabase.from("case_finances").insert({
        case_id: expenseCaseId,
        user_id: user.id,
        organization_id: orgMember.organization_id,
        finance_type: "expense",
        amount: parseFloat(expenseAmount),
        description: expenseDescription,
        category: expenseCategory || null,
        date: expenseDate,
        notes: expenseNotes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense submitted successfully",
      });

      // Reset form
      setExpenseCaseId("");
      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseCategory("");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseNotes("");

      // Refresh expenses
      fetchData();
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast({
        title: "Error",
        description: "Failed to submit expense",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "pending":
      default:
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (statusFilter === "all") return true;
    return expense.status === statusFilter;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pendingCount = expenses.filter(e => e.status === "pending").length;
  const approvedCount = expenses.filter(e => e.status === "approved").length;
  const rejectedCount = expenses.filter(e => e.status === "rejected").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Expenses</h1>
        <p className="text-muted-foreground mt-2">
          Submit and track your expense reimbursements
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl">${totalAmount.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl text-green-600">{approvedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-2xl text-red-600">{rejectedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense List - 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    All Expenses
                  </CardTitle>
                  <CardDescription>
                    Your submitted expense history
                  </CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No expenses found
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-lg">
                              ${expense.amount.toFixed(2)}
                            </p>
                            <Badge className={getStatusColor(expense.status || "pending")}>
                              {expense.status || "pending"}
                            </Badge>
                          </div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.category && (
                            <Badge variant="outline" className="mt-2">
                              {expense.category}
                            </Badge>
                          )}
                          {expense.cases && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Case: {expense.cases.case_number} - {expense.cases.title}
                            </p>
                          )}
                          {expense.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Notes: {expense.notes}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(expense.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit Form - 1 column */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Submit Expense
              </CardTitle>
              <CardDescription>
                Submit a new expense for reimbursement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-case">Case *</Label>
                  <Select value={expenseCaseId} onValueChange={setExpenseCaseId}>
                    <SelectTrigger id="expense-case">
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>
                          {caseItem.case_number} - {caseItem.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount *</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-description">Description *</Label>
                  <Input
                    id="expense-description"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="What was this expense for?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-category">Category</Label>
                  <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                    <SelectTrigger id="expense-category">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Meals">Meals</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Supplies">Supplies</SelectItem>
                      <SelectItem value="Mileage">Mileage</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date *</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-notes">Notes</Label>
                  <Textarea
                    id="expense-notes"
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Expense
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DollarSign, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Expense {
  id: string;
  case_id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  notes: string | null;
  category: string | null;
  cases?: {
    case_number: string;
    title: string;
  };
}

interface Case {
  id: string;
  case_number: string;
  title: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    console.log("[Expenses] Component mounted");
    fetchExpenses();
    fetchCases();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("case_finances")
        .select("*")
        .eq("user_id", user.id)
        .eq("finance_type", "expense")
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;

      // Then get case details for each expense
      if (expensesData && expensesData.length > 0) {
        const caseIds = [...new Set(expensesData.map(e => e.case_id))];
        const { data: casesData } = await supabase
          .from("cases")
          .select("id, case_number, title")
          .in("id", caseIds);

        // Merge case data with expenses
        const expensesWithCases = expensesData.map(expense => ({
          ...expense,
          cases: casesData?.find(c => c.id === expense.case_id) || null,
        }));

        setExpenses(expensesWithCases);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("cases")
        .select("id, case_number, title, investigator_ids")
        .contains("investigator_ids", [user.id]);

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error("Error fetching cases:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!orgMember) throw new Error("User not in organization");

      const { error } = await supabase
        .from("case_finances")
        .insert({
          case_id: selectedCaseId,
          user_id: user.id,
          organization_id: orgMember.organization_id,
          finance_type: "expense",
          description,
          amount: parseFloat(amount),
          category: category || null,
          notes: notes || null,
          date: new Date().toISOString().split('T')[0],
          status: "pending",
        });

      if (error) throw error;

      toast.success("Expense submitted successfully");
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      console.error("Error submitting expense:", error);
      toast.error(error.message || "Failed to submit expense");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCaseId("");
    setDescription("");
    setAmount("");
    setCategory("");
    setNotes("");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
      approved: { bg: "bg-green-100", text: "text-green-800" },
      rejected: { bg: "bg-red-100", text: "text-red-800" },
    };

    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Expenses</h1>
          <p className="text-muted-foreground mt-2">
            Submit and track your case-related expenses
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="case">Case *</Label>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a case" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.case_number} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Mileage, Equipment, Meals"
                  required
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mileage">Mileage</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="meals">Meals</SelectItem>
                    <SelectItem value="lodging">Lodging</SelectItem>
                    <SelectItem value="supplies">Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No expenses yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Submit your first expense to get started
            </p>
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Submit Expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{expense.cases?.case_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {expense.cases?.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      {expense.category ? (
                        <Badge variant="outline" className="capitalize">
                          {expense.category}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(expense.status || "pending")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

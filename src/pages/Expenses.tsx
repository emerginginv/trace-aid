import { useState } from "react";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DollarSign, Loader2, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCasesQuery } from "@/hooks/queries/useCasesQuery";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExpenseCard } from "@/components/shared/ExpenseCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MyExpenseEntry {
  id: string;
  case_id: string;
  item_type: string;
  notes: string | null;
  quantity: number;
  rate: number;
  total: number;
  status: string;
  created_at: string;
  receipt_url: string | null;
  case_number?: string;
  case_title?: string;
}

export default function Expenses() {
  useSetBreadcrumbs([{ label: "My Expenses" }]);
  
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Form state
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  // Query expense_entries for current user
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["my-expense-entries", organization?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) return [];

      const { data, error } = await supabase
        .from("expense_entries")
        .select(`
          id,
          case_id,
          item_type,
          notes,
          quantity,
          rate,
          total,
          status,
          created_at,
          receipt_url,
          cases!inner (
            case_number,
            title
          )
        `)
        .eq("organization_id", organization.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((entry: any) => ({
        id: entry.id,
        case_id: entry.case_id,
        item_type: entry.item_type,
        notes: entry.notes,
        quantity: entry.quantity,
        rate: entry.rate,
        total: entry.total,
        status: entry.status,
        created_at: entry.created_at,
        receipt_url: entry.receipt_url,
        case_number: entry.cases?.case_number,
        case_title: entry.cases?.title,
      })) as MyExpenseEntry[];
    },
    enabled: !!organization?.id,
  });

  const { data: cases = [] } = useCasesQuery();

  // Create expense mutation - insert into expense_entries
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: {
      case_id: string;
      item_type: string;
      quantity: number;
      rate: number;
      notes: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("expense_entries")
        .insert({
          case_id: expenseData.case_id,
          organization_id: organization.id,
          user_id: user.id,
          item_type: expenseData.item_type,
          quantity: expenseData.quantity,
          rate: expenseData.rate,
          total: expenseData.quantity * expenseData.rate,
          notes: expenseData.notes,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-expense-entries"] });
      queryClient.invalidateQueries({ queryKey: ["expense-entries"] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error("Organization not found");
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        case_id: selectedCaseId,
        item_type: category || "other",
        quantity: 1,
        rate: parseFloat(amount),
        notes: description + (notes ? `\n${notes}` : ""),
      });

      toast.success("Expense submitted successfully");
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error submitting expense:", error);
      toast.error(error.message || "Failed to submit expense");
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
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      declined: { variant: "destructive", label: "Declined" },
      committed: { variant: "outline", label: "Billed" },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Expenses"
        description="Submit and track your case-related expenses for reimbursement"
        addButton={{
          label: "New Expense",
          onClick: () => setDialogOpen(true),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <Button type="submit" disabled={createExpenseMutation.isPending}>
                {createExpenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {expenses.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No expenses yet"
          description="Submit your first expense to get started"
          action={{
            label: "Submit Expense",
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : (
        <>
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-1 border rounded-md p-1">
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

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={{
                    id: expense.id,
                    item_type: expense.item_type,
                    notes: expense.notes,
                    total: expense.total,
                    status: expense.status,
                    created_at: expense.created_at,
                    case_number: expense.case_number,
                    case_title: expense.case_title,
                    receipt_url: expense.receipt_url,
                  }}
                />
              ))}
            </div>
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
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{expense.case_number}</span>
                            <span className="text-xs text-muted-foreground">
                              {expense.case_title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{expense.notes || "-"}</TableCell>
                        <TableCell>
                          {expense.item_type ? (
                            <Badge variant="outline" className="capitalize">
                              {expense.item_type}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${expense.total.toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(expense.status || "pending")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

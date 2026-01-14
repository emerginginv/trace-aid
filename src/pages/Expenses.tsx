import { useState } from "react";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOnlyExpensesQuery, useCreateExpense } from "@/hooks/queries/useExpensesQuery";
import { useCasesQuery } from "@/hooks/queries/useCasesQuery";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function Expenses() {
  useSetBreadcrumbs([{ label: "My Expenses" }]);
  
  const { organization } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  // Use React Query hooks
  const { data: expenses = [], isLoading } = useOnlyExpensesQuery();
  const { data: cases = [] } = useCasesQuery();
  const createExpense = useCreateExpense();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error("Organization not found");
      return;
    }

    try {
      await createExpense.mutateAsync({
        case_id: selectedCaseId,
        finance_type: "expense",
        description,
        amount: parseFloat(amount),
        category: category || null,
        notes: notes || null,
        date: new Date().toISOString().split('T')[0],
        status: "pending",
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
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { variant: "secondary" },
      approved: { variant: "default" },
      rejected: { variant: "destructive" },
    };

    const variant = variants[status] || variants.pending;
    return (
      <Badge variant={variant.variant}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
        description="Submit and track your case-related expenses"
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
              <Button type="submit" disabled={createExpense.isPending}>
                {createExpense.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
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
                        <span className="font-medium">{expense.case_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {expense.case_title}
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

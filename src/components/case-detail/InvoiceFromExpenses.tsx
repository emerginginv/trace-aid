import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign } from "lucide-react";

interface ApprovedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  notes?: string;
  subject_id?: string;
  activity_id?: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  title: string;
}

export const InvoiceFromExpenses = ({ caseId }: { caseId: string }) => {
  const [expenses, setExpenses] = useState<ApprovedExpense[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const [activities, setActivities] = useState<Record<string, Activity>>({});
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  useEffect(() => {
    fetchApprovedExpenses();
  }, [caseId]);

  const fetchApprovedExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch approved, uninvoiced expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("case_finances")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .eq("finance_type", "expense")
        .eq("status", "approved")
        .or("invoiced.is.null,invoiced.eq.false")
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch related subjects
      const { data: subjectsData } = await supabase
        .from("case_subjects")
        .select("id, name")
        .eq("case_id", caseId)
        .eq("user_id", user.id);

      // Fetch related activities
      const { data: activitiesData } = await supabase
        .from("case_activities")
        .select("id, title")
        .eq("case_id", caseId)
        .eq("user_id", user.id);

      setExpenses(expensesData || []);
      
      // Create lookup maps for subjects and activities
      const subjectsMap: Record<string, Subject> = {};
      subjectsData?.forEach(s => { subjectsMap[s.id] = s; });
      setSubjects(subjectsMap);

      const activitiesMap: Record<string, Activity> = {};
      activitiesData?.forEach(a => { activitiesMap[a.id] = a; });
      setActivities(activitiesMap);

    } catch (error) {
      console.error("Error fetching approved expenses:", error);
      toast({
        title: "Error",
        description: "Failed to load approved expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpense = (expenseId: string) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const calculateSubtotal = () => {
    return expenses
      .filter(expense => selectedExpenses.has(expense.id))
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  };

  const generateInvoiceNumber = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the count of existing invoices to generate a unique number
    const { count } = await supabase
      .from("case_finances")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("finance_type", "invoice");

    const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;
    return invoiceNumber;
  };

  const handleAddInvoice = async () => {
    if (selectedExpenses.size === 0) {
      toast({
        title: "No expenses selected",
        description: "Please select at least one expense to create an invoice",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInvoice(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Calculate total from selected expenses
      const selectedExpensesList = expenses.filter(e => selectedExpenses.has(e.id));
      const total = selectedExpensesList.reduce((sum, e) => sum + Number(e.amount), 0);

      // Get the primary subject from the first expense (assuming all expenses are for the same client)
      const primarySubjectId = selectedExpensesList.find(e => e.subject_id)?.subject_id;

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();
      if (!invoiceNumber) throw new Error("Failed to generate invoice number");

      // Create the invoice record
      const { data: invoice, error: invoiceError } = await supabase
        .from("case_finances")
        .insert({
          case_id: caseId,
          user_id: user.id,
          finance_type: "invoice",
          invoice_number: invoiceNumber,
          description: `Invoice for ${selectedExpenses.size} expense${selectedExpenses.size !== 1 ? 's' : ''}`,
          amount: total,
          date: new Date().toISOString().split('T')[0],
          status: "draft",
          subject_id: primarySubjectId,
          notes: `Generated from expenses: ${selectedExpensesList.map(e => e.description).join(', ')}`,
          due_date: (() => {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            return dueDate.toISOString().split('T')[0];
          })(),
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Mark selected expenses as invoiced and link them to this invoice
      const expenseIds = Array.from(selectedExpenses);
      const { error: updateError } = await supabase
        .from("case_finances")
        .update({ 
          invoiced: true,
          invoice_id: invoice.id
        })
        .in("id", expenseIds);

      if (updateError) throw updateError;

      toast({
        title: "Invoice created",
        description: `Invoice ${invoiceNumber} created successfully with ${selectedExpenses.size} expense(s) totaling $${total.toFixed(2)}`,
      });

      // Clear selection and refresh the list
      setSelectedExpenses(new Set());
      fetchApprovedExpenses();

    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading approved expenses...</p>;
  }

  const subtotal = calculateSubtotal();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Create Invoice from Expenses</h3>
          <p className="text-sm text-muted-foreground">
            Select approved expenses to include in a new invoice
          </p>
        </div>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No approved, uninvoiced expenses available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Expenses must be approved before they can be added to an invoice
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card key={expense.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedExpenses.has(expense.id)}
                      onCheckedChange={() => toggleExpense(expense.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{expense.description}</h4>
                            {expense.category && (
                              <Badge variant="outline" className="text-xs">
                                {expense.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span>Date: {new Date(expense.date).toLocaleDateString()}</span>
                            {expense.subject_id && subjects[expense.subject_id] && (
                              <span>Subject: {subjects[expense.subject_id].name}</span>
                            )}
                            {expense.activity_id && activities[expense.activity_id] && (
                              <span>Activity: {activities[expense.activity_id].title}</span>
                            )}
                          </div>
                          {expense.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{expense.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${Number(expense.amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedExpenses.size > 0 && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Invoice Summary
                  </span>
                  <span className="text-2xl">${subtotal.toFixed(2)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedExpenses.size} expense{selectedExpenses.size !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <Button 
                    onClick={handleAddInvoice} 
                    size="lg"
                    disabled={isCreatingInvoice}
                  >
                    <FileText className="h-4 w-4" />
                    {isCreatingInvoice ? "Creating..." : "Add Invoice"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

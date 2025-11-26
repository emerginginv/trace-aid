import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Info, Briefcase, FileText, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Case {
  id: string;
  case_number: string;
  title: string;
  status: string;
  investigator_ids?: string[];
  case_manager_id?: string;
  case_manager?: {
    full_name: string;
    email: string;
  } | null;
}

interface Update {
  id: string;
  title: string;
  description: string;
  update_type: string;
  created_at: string;
  case_id: string;
  cases?: {
    case_number: string;
    title: string;
  };
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  status: string | null;
  case_id: string;
  cases?: {
    case_number: string;
    title: string;
  };
}

export default function VendorDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updateTypes, setUpdateTypes] = useState<string[]>([]);

  // Form state for updates
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [updateType, setUpdateType] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  // Form state for expenses
  const [expenseCaseId, setExpenseCaseId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState("");

  useEffect(() => {
    fetchVendorData();
    fetchUpdateTypes();
  }, []);

  const fetchUpdateTypes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!orgMember) return;

      const { data, error } = await supabase
        .from("picklists")
        .select("value")
        .eq("organization_id", orgMember.organization_id)
        .eq("type", "update_type")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setUpdateTypes(data.map(item => item.value));
      } else {
        // Default update types if none exist in picklist
        setUpdateTypes([
          "Case Update",
          "Surveillance",
          "Accounting",
          "Client Contact",
          "3rd Party Contact",
          "Review",
          "Other"
        ]);
      }
    } catch (error) {
      console.error("Error fetching update types:", error);
      // Fallback to defaults on error
      setUpdateTypes([
        "Case Update",
        "Surveillance",
        "Accounting",
        "Client Contact",
        "3rd Party Contact",
        "Review",
        "Other"
      ]);
    }
  };

  const fetchVendorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch cases accessible to vendor
      // Fetch only cases where the vendor is assigned (in investigator_ids array)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select(`
          id, 
          case_number, 
          title, 
          status, 
          investigator_ids,
          case_manager_id,
          case_manager:profiles!cases_case_manager_id_fkey(full_name, email)
        `)
        .contains("investigator_ids", [user.id])
        .order("created_at", { ascending: false });

      if (casesError) throw casesError;
      setCases(casesData || []);

      // Fetch vendor's updates
      const { data: updatesData, error: updatesError } = await supabase
        .from("case_updates")
        .select(`
          id,
          title,
          description,
          update_type,
          created_at,
          case_id,
          cases(case_number, title)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (updatesError) throw updatesError;
      setUpdates(updatesData || []);

      // Fetch vendor's expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("case_finances")
        .select("id, amount, description, category, date, status, case_id")
        .eq("user_id", user.id)
        .eq("finance_type", "expense")
        .order("date", { ascending: false })
        .limit(20);

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
      console.error("Error fetching vendor data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
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
      fetchVendorData();
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

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCaseId || !updateType || !updateTitle) {
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
      if (!user) return;

      // Get organization_id from the selected case
      const { data: caseData } = await supabase
        .from("cases")
        .select("organization_id")
        .eq("id", selectedCaseId)
        .single();

      const { error } = await supabase.from("case_updates").insert({
        case_id: selectedCaseId,
        user_id: user.id,
        organization_id: caseData?.organization_id,
        title: updateTitle,
        description: updateNotes,
        update_type: updateType,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Update submitted successfully",
      });

      // Reset form
      setSelectedCaseId("");
      setUpdateType("");
      setUpdateTitle("");
      setUpdateNotes("");

      // Refresh updates
      fetchVendorData();
    } catch (error) {
      console.error("Error submitting update:", error);
      toast({
        title: "Error",
        description: "Failed to submit update",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "closed":
        return "bg-gray-500/10 text-gray-700 border-gray-200";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "approved":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-500/10 text-red-700 border-red-200";
      default:
        return "bg-blue-500/10 text-blue-700 border-blue-200";
    }
  };

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
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your cases and submit updates
        </p>
      </div>

      {/* Limited Access Banner */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          You have limited access as a vendor. You can view assigned cases and submit updates.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Cases - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                My Cases
              </CardTitle>
              <CardDescription>
                Cases you have access to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No cases assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {cases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      onClick={() => navigate(`/cases/${caseItem.id}`)}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground">
                              {caseItem.case_number}
                            </span>
                            <Badge className={getStatusColor(caseItem.status)}>
                              {caseItem.status}
                            </Badge>
                          </div>
                          <p className="font-medium truncate mb-1">{caseItem.title}</p>
                          {caseItem.case_manager && (
                            <p className="text-xs text-muted-foreground">
                              Case Manager: {caseItem.case_manager.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                My Expenses
              </CardTitle>
              <CardDescription>
                Track your submitted expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No expenses submitted yet
                </p>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{expense.description}</p>
                          {expense.category && (
                            <Badge variant="outline" className="mt-1">
                              {expense.category}
                            </Badge>
                          )}
                          {expense.cases && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {expense.cases.case_number} - {expense.cases.title}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(expense.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-lg">
                            ${expense.amount.toFixed(2)}
                          </p>
                          <Badge className={getStatusColor(expense.status || "pending")}>
                            {expense.status || "pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                My Updates
              </CardTitle>
              <CardDescription>
                Recent updates you've submitted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No updates submitted yet
                </p>
              ) : (
                <div className="space-y-3">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium mb-1">{update.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {update.update_type}
                            </Badge>
                            <span>{format(new Date(update.created_at), "MMM dd, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      {update.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {update.description}
                        </p>
                      )}
                      {update.cases && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Case: {update.cases.case_number} - {update.cases.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit New Update & Expense - 1 column on large screens */}
        <div className="space-y-6">
          {/* Submit Expense */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Submit Expense
              </CardTitle>
              <CardDescription>
                Submit an expense for reimbursement
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

          {/* Submit New Update */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Submit New Update
              </CardTitle>
              <CardDescription>
                Add an update to a case
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="case">Case *</Label>
                  <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                    <SelectTrigger id="case">
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
                  <Label htmlFor="type">Update Type *</Label>
                  <Select value={updateType} onValueChange={setUpdateType}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {updateTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={updateTitle}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                    placeholder="Brief update summary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Detailed information about this update..."
                    rows={4}
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
                      Submit Update
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

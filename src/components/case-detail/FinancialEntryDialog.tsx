import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CalendarIcon, Clock, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface TimeRow {
  id: string;
  description: string;
  hours: number;
  hourly_rate: number;
  category: string;
  activity_id: string;
  notes: string;
}

interface ExpenseRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  category: string;
  activity_id: string;
  notes: string;
}

interface FinancialEntryDialogProps {
  caseId: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const FinancialEntryDialog = ({
  caseId,
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}: FinancialEntryDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activities, setActivities] = useState<{ id: string; title: string }[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [createCaseUpdate, setCreateCaseUpdate] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");

  // Time rows
  const [timeRows, setTimeRows] = useState<TimeRow[]>([]);

  // Expense rows
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);

  // Fetch activities and categories
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, caseId, organizationId]);

  const fetchData = async () => {
    try {
      const [activitiesRes, categoriesRes] = await Promise.all([
        supabase
          .from("case_activities")
          .select("id, title")
          .eq("case_id", caseId)
          .eq("organization_id", organizationId),
        supabase
          .from("picklists")
          .select("value")
          .eq("type", "expense_category")
          .eq("is_active", true)
          .or(`organization_id.eq.${organizationId},organization_id.is.null`)
          .order("display_order", { ascending: true }),
      ]);

      if (activitiesRes.data) setActivities(activitiesRes.data);
      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setExpenseCategories(categoriesRes.data.map((item) => item.value));
      } else {
        setExpenseCategories(["Mileage", "Meals", "Equipment", "Database Fees", "Other"]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const addTimeRow = () => {
    setTimeRows([
      ...timeRows,
      {
        id: generateId(),
        description: "",
        hours: 0,
        hourly_rate: 0,
        category: "",
        activity_id: "",
        notes: "",
      },
    ]);
  };

  const addExpenseRow = () => {
    setExpenseRows([
      ...expenseRows,
      {
        id: generateId(),
        description: "",
        quantity: 1,
        unit_price: 0,
        category: "",
        activity_id: "",
        notes: "",
      },
    ]);
  };

  const updateTimeRow = (id: string, field: keyof TimeRow, value: string | number) => {
    setTimeRows(timeRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const updateExpenseRow = (id: string, field: keyof ExpenseRow, value: string | number) => {
    setExpenseRows(expenseRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeTimeRow = (id: string) => {
    setTimeRows(timeRows.filter((row) => row.id !== id));
  };

  const removeExpenseRow = (id: string) => {
    setExpenseRows(expenseRows.filter((row) => row.id !== id));
  };

  const calculateTimeTotal = () => {
    return timeRows.reduce((sum, row) => sum + row.hours * row.hourly_rate, 0);
  };

  const calculateExpenseTotal = () => {
    return expenseRows.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);
  };

  const calculateGrandTotal = () => {
    return calculateTimeTotal() + calculateExpenseTotal();
  };

  const resetForm = () => {
    setTimeRows([]);
    setExpenseRows([]);
    setEntryDate(new Date());
    setCreateCaseUpdate(false);
    setUpdateNotes("");
  };

  const handleSubmit = async () => {
    if (!entryDate) {
      toast({ title: "Error", description: "Please select an entry date", variant: "destructive" });
      return;
    }

    if (timeRows.length === 0 && expenseRows.length === 0) {
      toast({ title: "Error", description: "Please add at least one time or expense row", variant: "destructive" });
      return;
    }

    // Validate rows
    for (const row of timeRows) {
      if (!row.description.trim()) {
        toast({ title: "Error", description: "All time entries must have a description", variant: "destructive" });
        return;
      }
      if (row.hours <= 0) {
        toast({ title: "Error", description: "All time entries must have hours greater than 0", variant: "destructive" });
        return;
      }
    }

    for (const row of expenseRows) {
      if (!row.description.trim()) {
        toast({ title: "Error", description: "All expense entries must have a description", variant: "destructive" });
        return;
      }
      if (row.unit_price <= 0) {
        toast({ title: "Error", description: "All expense entries must have a unit price greater than 0", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const dateStr = format(entryDate, "yyyy-MM-dd");
      const records: any[] = [];

      // Build time entry records
      for (const row of timeRows) {
        records.push({
          case_id: caseId,
          user_id: user.id,
          organization_id: organizationId,
          finance_type: "time",
          description: row.description,
          date: dateStr,
          hours: row.hours,
          hourly_rate: row.hourly_rate,
          amount: row.hours * row.hourly_rate,
          category: row.category || null,
          activity_id: row.activity_id || null,
          notes: row.notes || null,
          status: "pending",
        });
      }

      // Build expense entry records
      for (const row of expenseRows) {
        records.push({
          case_id: caseId,
          user_id: user.id,
          organization_id: organizationId,
          finance_type: "expense",
          description: row.description,
          date: dateStr,
          quantity: row.quantity,
          unit_price: row.unit_price,
          amount: row.quantity * row.unit_price,
          category: row.category || null,
          activity_id: row.activity_id || null,
          notes: row.notes || null,
          status: "pending",
        });
      }

      // Insert all records in a batch
      const { error: insertError } = await supabase.from("case_finances").insert(records);

      if (insertError) throw insertError;

      // Optionally create a case update
      if (createCaseUpdate) {
        const timeTotal = calculateTimeTotal();
        const expenseTotal = calculateExpenseTotal();
        const grandTotal = calculateGrandTotal();

        let updateDescription = `Financial entry recorded for ${format(entryDate, "PPP")}.\n\n`;
        
        if (timeRows.length > 0) {
          updateDescription += `**Time Entries (${timeRows.length}):** $${timeTotal.toFixed(2)}\n`;
          for (const row of timeRows) {
            updateDescription += `- ${row.description}: ${row.hours}h × $${row.hourly_rate.toFixed(2)}\n`;
          }
          updateDescription += "\n";
        }

        if (expenseRows.length > 0) {
          updateDescription += `**Expenses (${expenseRows.length}):** $${expenseTotal.toFixed(2)}\n`;
          for (const row of expenseRows) {
            updateDescription += `- ${row.description}: ${row.quantity} × $${row.unit_price.toFixed(2)}\n`;
          }
          updateDescription += "\n";
        }

        updateDescription += `**Total:** $${grandTotal.toFixed(2)}`;

        if (updateNotes) {
          updateDescription += `\n\n**Notes:** ${updateNotes}`;
        }

        await supabase.from("case_updates").insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: organizationId,
          title: `Financial Entry - ${format(entryDate, "PPP")}`,
          description: updateDescription,
          update_type: "financial",
        });
      }

      toast({
        title: "Success",
        description: `${records.length} financial entries recorded successfully`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving financial entries:", error);
      toast({ title: "Error", description: "Failed to save financial entries", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Financial Entry
          </DialogTitle>
          <DialogDescription>
            Record a batch of time and expense entries for a single work session
          </DialogDescription>
        </DialogHeader>

        {/* Entry Date */}
        <div className="space-y-2">
          <Label>Entry Date</Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !entryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {entryDate ? format(entryDate, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={entryDate}
                onSelect={(date) => {
                  setEntryDate(date);
                  setDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Separator />

        {/* Time Entries Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Time Entries</h3>
              {timeRows.length > 0 && (
                <Badge variant="secondary">{timeRows.length} rows</Badge>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addTimeRow}>
              <Plus className="h-4 w-4 mr-1" />
              Add Time
            </Button>
          </div>

          {timeRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
              No time entries. Click "Add Time" to record hours worked.
            </p>
          ) : (
            <div className="space-y-3">
              {timeRows.map((row) => (
                <Card key={row.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description *</Label>
                        <Input
                          placeholder="What work was performed?"
                          value={row.description}
                          onChange={(e) => updateTimeRow(row.id, "description", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Hours *</Label>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            placeholder="0"
                            value={row.hours || ""}
                            onChange={(e) => updateTimeRow(row.id, "hours", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Rate</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={row.hourly_rate || ""}
                            onChange={(e) => updateTimeRow(row.id, "hourly_rate", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={row.category}
                          onValueChange={(value) => updateTimeRow(row.id, "category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {expenseCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Linked Activity (Optional)</Label>
                        <Select
                          value={row.activity_id}
                          onValueChange={(value) => updateTimeRow(row.id, "activity_id", value === "none" ? "" : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No activity" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="none">No activity</SelectItem>
                            {activities.map((activity) => (
                              <SelectItem key={activity.id} value={activity.id}>
                                {activity.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="text-sm font-medium">
                          Total: ${(row.hours * row.hourly_rate).toFixed(2)}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeTimeRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="text-right text-sm font-medium">
                Time Subtotal: ${calculateTimeTotal().toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Expense Entries Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Expense Entries</h3>
              {expenseRows.length > 0 && (
                <Badge variant="secondary">{expenseRows.length} rows</Badge>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addExpenseRow}>
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
          </div>

          {expenseRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
              No expense entries. Click "Add Expense" to record costs incurred.
            </p>
          ) : (
            <div className="space-y-3">
              {expenseRows.map((row) => (
                <Card key={row.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description *</Label>
                        <Input
                          placeholder="What was the expense?"
                          value={row.description}
                          onChange={(e) => updateExpenseRow(row.id, "description", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            placeholder="1"
                            value={row.quantity || ""}
                            onChange={(e) => updateExpenseRow(row.id, "quantity", parseFloat(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Unit Price *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={row.unit_price || ""}
                            onChange={(e) => updateExpenseRow(row.id, "unit_price", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={row.category}
                          onValueChange={(value) => updateExpenseRow(row.id, "category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {expenseCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Linked Activity (Optional)</Label>
                        <Select
                          value={row.activity_id}
                          onValueChange={(value) => updateExpenseRow(row.id, "activity_id", value === "none" ? "" : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No activity" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="none">No activity</SelectItem>
                            {activities.map((activity) => (
                              <SelectItem key={activity.id} value={activity.id}>
                                {activity.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="text-sm font-medium">
                          Total: ${(row.quantity * row.unit_price).toFixed(2)}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeExpenseRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="text-right text-sm font-medium">
                Expense Subtotal: ${calculateExpenseTotal().toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Summary & Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-semibold">Grand Total</span>
            <span className="text-xl font-bold">${calculateGrandTotal().toFixed(2)}</span>
          </div>

          {/* Create Case Update Option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="create-update"
                checked={createCaseUpdate}
                onCheckedChange={(checked) => setCreateCaseUpdate(checked === true)}
              />
              <Label htmlFor="create-update" className="cursor-pointer">
                Create case update after saving
              </Label>
            </div>

            {createCaseUpdate && (
              <div className="space-y-1.5 pl-6">
                <Label className="text-xs">Additional Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional context or notes for the case update..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : `Save ${timeRows.length + expenseRows.length} Entries`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

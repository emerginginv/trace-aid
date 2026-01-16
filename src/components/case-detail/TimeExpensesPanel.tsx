import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload, Clock, Receipt, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenseBillingItemCreation";
import { useStaffPricingItems } from "@/hooks/useStaffPricing";

interface TimeEntry {
  id: string;
  itemId: string;
  itemName: string;
  financeItemId: string | null;
  notes: string;
  hours: number;
  rate: number;
}

interface ExpenseEntry {
  id: string;
  category: string;
  financeItemId: string | null;
  notes: string;
  quantity: number;
  rate: number;
  receiptFile?: File;
}

interface RateScheduleItem {
  id: string;
  name: string;
  rate: number;
  rateType: string;
  financeItemId: string;
}

interface TimeExpensesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateId: string;
  caseId: string;
  organizationId: string;
  onSaveComplete: () => void;
}

export const TimeExpensesPanel = ({
  open,
  onOpenChange,
  updateId,
  caseId,
  organizationId,
  onSaveComplete,
}: TimeExpensesPanelProps) => {
  // Context data
  const [updateTitle, setUpdateTitle] = useState("");
  const [eventName, setEventName] = useState("");
  const [caseName, setCaseName] = useState("");
  const [linkedActivityId, setLinkedActivityId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [appliedBudgetStrategy, setAppliedBudgetStrategy] = useState<string | null>(null);

  // Current user ID for staff pricing lookup
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Use staff pricing hook to get rates resolved for current user
  const { data: staffPricingItems = [] } = useStaffPricingItems(currentUserId);

  // Map staff pricing items to rate schedule format
  const rateScheduleItems: RateScheduleItem[] = staffPricingItems.map((item) => ({
    id: item.id,
    name: item.name,
    rate: item.customRate ?? item.defaultRate ?? 0,
    rateType: item.rateType,
    financeItemId: item.id,
  }));

  // Section states
  const [timeExpanded, setTimeExpanded] = useState(true);
  const [expenseExpanded, setExpenseExpanded] = useState(true);

  // Entry data
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Fetch context data when panel opens
  useEffect(() => {
    if (open && updateId && caseId) {
      fetchContextData();
    }
  }, [open, updateId, caseId]);

  const fetchContextData = async () => {
    try {
      // Fetch update details
      const { data: updateData } = await supabase
        .from("case_updates")
        .select("title, linked_activity_id")
        .eq("id", updateId)
        .maybeSingle();

      if (updateData) {
        setUpdateTitle(updateData.title);
        setLinkedActivityId(updateData.linked_activity_id);

        // Fetch linked activity/event name
        if (updateData.linked_activity_id) {
          const { data: activityData } = await supabase
            .from("case_activities")
            .select("title")
            .eq("id", updateData.linked_activity_id)
            .maybeSingle();
          
          if (activityData) {
            setEventName(activityData.title);
          }
        }
      }

      // Fetch case details including applied budget strategy
      const { data: caseData } = await supabase
        .from("cases")
        .select("title, case_number, account_id, applied_budget_strategy")
        .eq("id", caseId)
        .maybeSingle();

      if (caseData) {
        setCaseName(`${caseData.case_number} - ${caseData.title}`);
        setAccountId(caseData.account_id);
        setAppliedBudgetStrategy(caseData.applied_budget_strategy);
      }
    } catch (error) {
      console.error("Error fetching context data:", error);
    }
  };

  // Add new time entry
  const addTimeEntry = () => {
    const defaultItem = rateScheduleItems[0];
    setTimeEntries([
      ...timeEntries,
      {
        id: crypto.randomUUID(),
        itemId: defaultItem?.id || "",
        itemName: defaultItem?.name || "",
        financeItemId: defaultItem?.financeItemId || null,
        notes: "",
        hours: 0,
        rate: defaultItem?.rate || 0,
      },
    ]);
  };

  // Remove time entry
  const removeTimeEntry = (id: string) => {
    setTimeEntries(timeEntries.filter((e) => e.id !== id));
  };

  // Update time entry
  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries(
      timeEntries.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  // Handle time entry item selection
  const handleTimeItemChange = (entryId: string, itemId: string) => {
    const item = rateScheduleItems.find((i) => i.id === itemId);
    if (item) {
      updateTimeEntry(entryId, {
        itemId: item.id,
        itemName: item.name,
        financeItemId: item.financeItemId,
        rate: item.rate,
      });
    }
  };

  // Add new expense entry
  const addExpenseEntry = () => {
    const defaultCategory = EXPENSE_CATEGORIES[0];
    setExpenseEntries([
      ...expenseEntries,
      {
        id: crypto.randomUUID(),
        category: defaultCategory.value,
        financeItemId: null,
        notes: "",
        quantity: 1,
        rate: defaultCategory.defaultRate || 0,
      },
    ]);
  };

  // Remove expense entry
  const removeExpenseEntry = (id: string) => {
    setExpenseEntries(expenseEntries.filter((e) => e.id !== id));
  };

  // Update expense entry
  const updateExpenseEntry = (id: string, updates: Partial<ExpenseEntry>) => {
    setExpenseEntries(
      expenseEntries.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  // Handle expense category change
  const handleExpenseCategoryChange = (entryId: string, category: string) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.value === category);
    updateExpenseEntry(entryId, {
      category,
      rate: cat?.defaultRate || 0,
    });
  };

  // Handle receipt file selection
  const handleReceiptUpload = (entryId: string, file: File) => {
    updateExpenseEntry(entryId, { receiptFile: file });
  };

  // Calculate totals
  const timeSubtotal = timeEntries.reduce((sum, e) => sum + e.hours * e.rate, 0);
  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
  const expenseSubtotal = expenseEntries.reduce((sum, e) => sum + e.quantity * e.rate, 0);
  const grandTotal = timeSubtotal + expenseSubtotal;

  // Determine if time entries are allowed based on budget strategy
  // Time tracking is disabled only for 'money_only' strategy
  const timeEntriesEnabled = useMemo(() => {
    if (appliedBudgetStrategy === 'money_only') return false;
    // hours_only, both, disabled, or null all allow time entries
    return true;
  }, [appliedBudgetStrategy]);

  // Check if there's any data entered
  const hasData = timeEntries.length > 0 || expenseEntries.length > 0;
  const hasEnteredData = timeEntries.some(e => e.hours > 0 || e.notes) || 
                         expenseEntries.some(e => e.quantity > 0 || e.notes);

  // Handle cancel with confirmation
  const handleCancel = () => {
    if (hasEnteredData) {
      setShowCancelConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  // Confirm cancel
  const confirmCancel = () => {
    setShowCancelConfirm(false);
    setTimeEntries([]);
    setExpenseEntries([]);
    onOpenChange(false);
  };

  // Save all entries to the new time_entries and expense_entries tables
  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const errors: string[] = [];

      // Save time entries to time_entries table
      for (const entry of timeEntries.filter(e => e.hours > 0)) {
        const { error } = await supabase
          .from("time_entries")
          .insert({
            case_id: caseId,
            organization_id: organizationId,
            user_id: user.id,
            event_id: linkedActivityId,
            update_id: updateId,
            finance_item_id: entry.financeItemId || null,
            item_type: entry.itemName,
            notes: entry.notes || null,
            hours: entry.hours,
            rate: entry.rate,
            status: "pending",
          });

        if (error) {
          console.error("Error saving time entry:", error);
          errors.push(`Time entry "${entry.itemName}": ${error.message}`);
        }
      }

      // Save expense entries to expense_entries table
      for (const entry of expenseEntries.filter(e => e.quantity > 0)) {
        const categoryLabel = EXPENSE_CATEGORIES.find(c => c.value === entry.category)?.label || entry.category;

        // Handle receipt upload if present
        let receiptUrl: string | null = null;
        if (entry.receiptFile) {
          try {
            const fileExt = entry.receiptFile.name.split(".").pop();
            const filePath = `${user.id}/${caseId}/receipts/${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("case-attachments")
              .upload(filePath, entry.receiptFile);

            if (!uploadError) {
              receiptUrl = filePath;
            }
          } catch (uploadError) {
            console.error("Error uploading receipt:", uploadError);
          }
        }

        const { error } = await supabase
          .from("expense_entries")
          .insert({
            case_id: caseId,
            organization_id: organizationId,
            user_id: user.id,
            event_id: linkedActivityId,
            update_id: updateId,
            finance_item_id: entry.financeItemId || null,
            item_type: categoryLabel,
            notes: entry.notes || null,
            quantity: entry.quantity,
            rate: entry.rate,
            receipt_url: receiptUrl,
            status: "pending",
          });

        if (error) {
          console.error("Error saving expense entry:", error);
          errors.push(`Expense "${categoryLabel}": ${error.message}`);
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Some entries failed to save",
          description: errors.join("; "),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Time and expense entries saved successfully",
        });
      }

      // Clear and close
      setTimeEntries([]);
      setExpenseEntries([]);
      onOpenChange(false);
      onSaveComplete();
    } catch (error) {
      console.error("Error saving entries:", error);
      toast({
        title: "Error",
        description: "Failed to save entries",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleCancel}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col h-full p-0">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Log Time & Expenses
            </SheetTitle>
            <SheetDescription className="text-sm">
              For: <span className="font-medium text-foreground">{updateTitle}</span>
              {eventName && (
                <>
                  {" • "}
                  <span className="font-medium text-foreground">{eventName}</span>
                </>
              )}
              {" • "}
              <span className="font-medium text-foreground">{caseName}</span>
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Time Entries Section */}
            <Collapsible open={timeExpanded} onOpenChange={setTimeExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold">
                      Time Entries
                      {!timeEntriesEnabled && (
                        <span className="text-muted-foreground font-normal ml-1">(Disabled)</span>
                      )}
                    </span>
                    {timeEntriesEnabled && (
                      <span className="text-sm text-muted-foreground">
                        ({totalHours.toFixed(2)} hrs • {formatCurrency(timeSubtotal)})
                      </span>
                    )}
                  </div>
                  {timeExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                {timeEntriesEnabled ? (
                  <>
                    {timeEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/30 rounded-lg"
                      >
                        {/* Item dropdown */}
                        <div className="col-span-4">
                          <Label className="text-xs text-muted-foreground mb-1 block">Item</Label>
                          <Select
                            value={entry.itemId}
                            onValueChange={(val) => handleTimeItemChange(entry.id, val)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {rateScheduleItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} ({formatCurrency(item.rate)}/hr)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Notes */}
                        <div className="col-span-3">
                          <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
                          <Input
                            value={entry.notes}
                            onChange={(e) => updateTimeEntry(entry.id, { notes: e.target.value })}
                            placeholder="Notes..."
                            className="h-9"
                          />
                        </div>

                        {/* Hours */}
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">Hours</Label>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            value={entry.hours || ""}
                            onChange={(e) =>
                              updateTimeEntry(entry.id, { hours: parseFloat(e.target.value) || 0 })
                            }
                            className="h-9"
                          />
                        </div>

                        {/* Pay Rate (read-only) */}
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">Pay Rate</Label>
                          <Input
                            value={formatCurrency(entry.rate)}
                            readOnly
                            className="h-9 bg-muted"
                          />
                        </div>

                        {/* Delete button */}
                        <div className="col-span-1 flex items-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => removeTimeEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {/* Pay display */}
                        <div className="col-span-12 text-right text-sm font-medium">
                          Pay: {formatCurrency(entry.hours * entry.rate)}
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addTimeEntry}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Entry
                    </Button>
                  </>
                ) : (
                  <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                      Time tracking is not available for this case. This case uses a money-only budget strategy.
                    </AlertDescription>
                  </Alert>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Expense Entries Section */}
            <Collapsible open={expenseExpanded} onOpenChange={setExpenseExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    <span className="font-semibold">Expense Entries</span>
                    <span className="text-sm text-muted-foreground">
                      ({formatCurrency(expenseSubtotal)})
                    </span>
                  </div>
                  {expenseExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                {expenseEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/30 rounded-lg"
                  >
                    {/* Category dropdown */}
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Item</Label>
                      <Select
                        value={entry.category}
                        onValueChange={(val) => handleExpenseCategoryChange(entry.id, val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes */}
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
                      <Input
                        value={entry.notes}
                        onChange={(e) => updateExpenseEntry(entry.id, { notes: e.target.value })}
                        placeholder="Notes..."
                        className="h-9"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Qty</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={entry.quantity || ""}
                        onChange={(e) =>
                          updateExpenseEntry(entry.id, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        className="h-9"
                      />
                    </div>

                    {/* Pay Rate */}
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Pay Rate</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.rate || ""}
                        onChange={(e) =>
                          updateExpenseEntry(entry.id, { rate: parseFloat(e.target.value) || 0 })
                        }
                        className="h-9"
                      />
                    </div>

                    {/* Receipt & Delete */}
                    <div className="col-span-2 flex items-end gap-1">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleReceiptUpload(entry.id, file);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          type="button"
                          asChild
                        >
                          <span>
                            <Upload className="h-4 w-4" />
                          </span>
                        </Button>
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => removeExpenseEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Receipt indicator & Total */}
                    <div className="col-span-12 flex justify-between text-sm">
                      {entry.receiptFile ? (
                        <span className="text-xs text-muted-foreground">
                          📎 {entry.receiptFile.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        Pay: {formatCurrency(entry.quantity * entry.rate)}
                      </span>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addExpenseEntry}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense Entry
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Sticky Totals Bar */}
          <div className="border-t bg-background p-4">
            <div className="grid grid-cols-4 gap-4 text-center mb-4">
              <div>
                <div className="text-xs text-muted-foreground">Hours</div>
                <div className="text-lg font-semibold">{totalHours.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Time Pay</div>
                <div className="text-lg font-semibold">{formatCurrency(timeSubtotal)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Expense Pay</div>
                <div className="text-lg font-semibold">{formatCurrency(expenseSubtotal)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Pay</div>
                <div className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !hasData}>
                {isSaving ? "Saving..." : "Save & Close"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved time and expense entries. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

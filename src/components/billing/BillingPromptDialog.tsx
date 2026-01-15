/**
 * BillingPromptDialog Component
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM PROMPT 5 COMPLIANCE:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This dialog displays immediately after update submission when the update is
 * linked to a billable activity.
 * 
 * REQUIREMENTS:
 * 1. Display modal with message: "This update is linked to a billable activity.
 *    Would you like to create a billing item for this activity?"
 * 
 * 2. Provide two options:
 *    - "Yes, create billing item" → Calls onCreateBillingItem
 *    - "No, skip billing" → Calls onSkip
 * 
 * 3. CRITICAL: Choosing "No, skip billing" must NOT disable future billing actions.
 *    The onSkip handler only logs an audit event and resets UI state.
 *    No flags are set, no records are modified to prevent future billing.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * TASK vs EVENT BILLING FLOW:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * TASKS:
 * - Show a "Bill this task" checkbox
 * - When checked, reveal "Hours to bill" numeric input (min 0.25, decimals allowed)
 * - Hide start/end time fields completely
 * - Cannot save without hours >= 0.25 if billing is opted in
 * 
 * EVENTS:
 * - Show start/end time confirmation inputs
 * - Keep existing validation logic
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Clock, Receipt, Calculator, ArrowLeft, AlertCircle, Wallet } from "lucide-react";
import { UpdateBillingEligibilityResult } from "@/hooks/useUpdateBillingEligibility";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenseBillingItemCreation";

export interface ConfirmedTimes {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  // Task-specific: explicit hours (no derived duration)
  taskHours?: number;
  // Whether billing was opted into for tasks
  billTask?: boolean;
}

export interface ExpenseData {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface BillingPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibility: UpdateBillingEligibilityResult | null;
  onCreateBillingItem: (confirmedTimes: ConfirmedTimes) => void;
  onCreateExpenseItem?: (expenseData: ExpenseData) => void;
  onSkip: () => void;
  /** Optional: pre-fill expense description from update title/description */
  updateDescription?: string;
}

export function BillingPromptDialog({
  open,
  onOpenChange,
  eligibility,
  onCreateBillingItem,
  onCreateExpenseItem,
  onSkip,
  updateDescription,
}: BillingPromptDialogProps) {
  const [step, setStep] = useState<'confirm' | 'time' | 'task' | 'expense'>('confirm');
  const [editedTimes, setEditedTimes] = useState<ConfirmedTimes>({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
  });
  const [timeError, setTimeError] = useState<string | null>(null);
  
  // Task billing state
  const [billTask, setBillTask] = useState(false);
  const [taskHours, setTaskHours] = useState<string>('');
  const [taskHoursError, setTaskHoursError] = useState<string | null>(null);

  // Expense billing state
  const [expenseCategory, setExpenseCategory] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseQuantity, setExpenseQuantity] = useState<string>('1');
  const [expenseUnitPrice, setExpenseUnitPrice] = useState<string>('');
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Reset state when dialog opens/closes or eligibility changes
  useEffect(() => {
    if (open && eligibility) {
      setStep('confirm');
      setEditedTimes({
        startDate: eligibility.startDate || '',
        startTime: eligibility.startTime || '',
        endDate: eligibility.endDate || '',
        endTime: eligibility.endTime || '',
      });
      setTimeError(null);
      setBillTask(false);
      setTaskHours('');
      setTaskHoursError(null);
      // Reset expense state
      setExpenseCategory('');
      setExpenseDescription(updateDescription || '');
      setExpenseQuantity('1');
      setExpenseUnitPrice('');
      setExpenseError(null);
    }
  }, [open, eligibility, updateDescription]);

  if (!eligibility || !eligibility.isEligible) return null;

  const isTask = eligibility.activityType === 'task';

  const formatRate = (rate?: number, unit?: string) => {
    if (!rate) return "Rate not set";
    const unitLabel = unit === "hour" ? "/hr" : 
                      unit === "day" ? "/day" : 
                      unit === "flat" ? " flat" : 
                      unit === "activity" ? "/activity" :
                      `/${unit}`;
    return `$${rate.toFixed(2)}${unitLabel}`;
  };

  const formatQuantity = (quantity?: number, pricingModel?: string) => {
    if (!quantity) return null;
    
    switch (pricingModel) {
      case "hourly":
        return `${quantity.toFixed(2)} hours`;
      case "daily":
        return `${quantity} day${quantity !== 1 ? 's' : ''}`;
      case "per_activity":
        return "1 activity";
      case "flat":
        return "Flat rate";
      default:
        return `${quantity} unit${quantity !== 1 ? 's' : ''}`;
    }
  };

  const formatEstimate = (amount?: number) => {
    if (!amount) return null;
    return `$${amount.toFixed(2)}`;
  };

  const getPricingModelLabel = (model?: string) => {
    switch (model) {
      case "hourly": return "Hourly";
      case "daily": return "Daily";
      case "per_activity": return "Per Activity";
      case "flat": return "Flat Rate";
      default: return model || "Unknown";
    }
  };

  const validateTimes = (): boolean => {
    if (!editedTimes.startDate || !editedTimes.startTime || !editedTimes.endDate || !editedTimes.endTime) {
      setTimeError("All time fields are required");
      return false;
    }

    const start = new Date(`${editedTimes.startDate}T${editedTimes.startTime}`);
    const end = new Date(`${editedTimes.endDate}T${editedTimes.endTime}`);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setTimeError("Invalid date or time format");
      return false;
    }

    if (end <= start) {
      setTimeError("End time must be after start time");
      return false;
    }
    
    setTimeError(null);
    return true;
  };

  const validateTaskHours = (): boolean => {
    const hours = parseFloat(taskHours);
    if (isNaN(hours) || hours < 0.25) {
      setTaskHoursError("Hours to bill is required (minimum 0.25)");
      return false;
    }
    setTaskHoursError(null);
    return true;
  };

  const calculateDurationFromTimes = () => {
    if (!editedTimes.startDate || !editedTimes.startTime || !editedTimes.endDate || !editedTimes.endTime) {
      return null;
    }

    const start = new Date(`${editedTimes.startDate}T${editedTimes.startTime}`);
    const end = new Date(`${editedTimes.endDate}T${editedTimes.endTime}`);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) return null;

    const hours = diffMs / (1000 * 60 * 60);
    return hours;
  };

  const getUpdatedEstimate = () => {
    const hours = calculateDurationFromTimes();
    if (!hours || !eligibility.serviceRate) return null;

    let quantity = hours;
    if (eligibility.pricingModel === 'daily') {
      quantity = Math.max(1, Math.ceil(hours / 24));
    } else if (eligibility.pricingModel === 'hourly') {
      quantity = Math.max(0.25, hours);
    }

    return eligibility.serviceRate * quantity;
  };

  const getTaskEstimate = () => {
    const hours = parseFloat(taskHours);
    if (isNaN(hours) || hours < 0.25 || !eligibility.serviceRate) return null;
    return eligibility.serviceRate * hours;
  };

  const getExpenseTotal = () => {
    const qty = parseFloat(expenseQuantity);
    const price = parseFloat(expenseUnitPrice);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) return null;
    return qty * price;
  };

  const validateExpense = (): boolean => {
    if (!expenseCategory) {
      setExpenseError("Please select an expense category");
      return false;
    }
    if (!expenseDescription.trim()) {
      setExpenseError("Description is required");
      return false;
    }
    const qty = parseFloat(expenseQuantity);
    if (isNaN(qty) || qty <= 0) {
      setExpenseError("Quantity must be greater than 0");
      return false;
    }
    const price = parseFloat(expenseUnitPrice);
    if (isNaN(price) || price <= 0) {
      setExpenseError("Unit price must be greater than 0");
      return false;
    }
    setExpenseError(null);
    return true;
  };

  const handleProceedToTime = () => {
    setStep('time');
  };

  const handleProceedToTask = () => {
    setStep('task');
  };

  const handleProceedToExpense = () => {
    setStep('expense');
  };

  const handleBack = () => {
    setStep('confirm');
    setTimeError(null);
    setTaskHoursError(null);
    setExpenseError(null);
  };

  const handleConfirmAndCreate = () => {
    if (isTask && step === 'task') {
      if (billTask) {
        if (!validateTaskHours()) return;
        onCreateBillingItem({ 
          startDate: '', 
          startTime: '', 
          endDate: '', 
          endTime: '',
          taskHours: parseFloat(taskHours),
          billTask: true
        });
      } else {
        // User chose not to bill - treat as skip
        onSkip();
      }
    } else {
      // Event flow - existing validation
      if (validateTimes()) {
        onCreateBillingItem(editedTimes);
      }
    }
  };

  const handleCreateExpense = () => {
    if (!validateExpense()) return;
    if (onCreateExpenseItem) {
      onCreateExpenseItem({
        category: expenseCategory,
        description: expenseDescription.trim(),
        quantity: parseFloat(expenseQuantity),
        unitPrice: parseFloat(expenseUnitPrice),
      });
    }
  };

  const handleCategoryChange = (category: string) => {
    setExpenseCategory(category);
    setExpenseError(null);
    // Auto-populate default rate if available
    const categoryConfig = EXPENSE_CATEGORIES.find(c => c.value === category);
    if (categoryConfig?.defaultRate) {
      setExpenseUnitPrice(categoryConfig.defaultRate.toString());
    }
  };

  const needsTimeConfirmation = eligibility.pricingModel === 'hourly' || eligibility.pricingModel === 'daily';

  const handleYesClick = () => {
    if (isTask) {
      // Tasks go to task billing step
      handleProceedToTask();
    } else if (needsTimeConfirmation) {
      handleProceedToTime();
    } else {
      // For flat/per_activity events, skip time confirmation
      onCreateBillingItem(editedTimes);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Create Billing Item?
              </DialogTitle>
              <DialogDescription>
                This update is linked to a billable {isTask ? 'task' : 'activity'}. Would you like to create a billing item for this {isTask ? 'task' : 'event'}?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Activity Info */}
              {eligibility.activityTitle && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{isTask ? 'Task' : 'Activity'}:</span>{" "}
                  <span className="font-medium">{eligibility.activityTitle}</span>
                </div>
              )}
              
              {/* Service Details */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{eligibility.serviceName}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatRate(eligibility.serviceRate, eligibility.priceUnit)}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getPricingModelLabel(eligibility.pricingModel)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Billable
                  </span>
                </div>

                {/* Quantity and Estimate - only show for events with pre-calculated values */}
                {!isTask && (eligibility.quantity || eligibility.estimatedAmount) && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        {formatQuantity(eligibility.quantity, eligibility.pricingModel)}
                      </span>
                      {eligibility.estimatedAmount && (
                        <span className="font-semibold text-primary">
                          Est. {formatEstimate(eligibility.estimatedAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Creating a billing item does not finalize the charge. All billing items require explicit approval before being added to an invoice.
              </p>
            </div>

            <DialogFooter className="flex-col gap-3">
              {/* Primary billing actions */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button onClick={handleYesClick} className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Add Time
                </Button>
                {onCreateExpenseItem && (
                  <Button 
                    variant="secondary" 
                    onClick={handleProceedToExpense}
                    className="w-full"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                )}
              </div>
              
              {/* Skip option */}
              <Button variant="ghost" onClick={onSkip} className="w-full text-muted-foreground">
                Skip Billing
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'time' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Confirm Times
              </DialogTitle>
              <DialogDescription>
                Please confirm the start and end times for this activity before creating the billing item.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Start Date/Time */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={editedTimes.startDate}
                    onChange={(e) => {
                      setEditedTimes(prev => ({ ...prev, startDate: e.target.value }));
                      setTimeError(null);
                    }}
                  />
                  <Input
                    type="time"
                    value={editedTimes.startTime}
                    onChange={(e) => {
                      setEditedTimes(prev => ({ ...prev, startTime: e.target.value }));
                      setTimeError(null);
                    }}
                  />
                </div>
              </div>

              {/* End Date/Time */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">End</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={editedTimes.endDate}
                    onChange={(e) => {
                      setEditedTimes(prev => ({ ...prev, endDate: e.target.value }));
                      setTimeError(null);
                    }}
                  />
                  <Input
                    type="time"
                    value={editedTimes.endTime}
                    onChange={(e) => {
                      setEditedTimes(prev => ({ ...prev, endTime: e.target.value }));
                      setTimeError(null);
                    }}
                  />
                </div>
              </div>

              {/* Duration and Updated Estimate */}
              {calculateDurationFromTimes() !== null && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">
                      {eligibility.pricingModel === 'daily' 
                        ? `${Math.max(1, Math.ceil(calculateDurationFromTimes()! / 24))} day(s)`
                        : `${calculateDurationFromTimes()!.toFixed(2)} hours`
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Amount:</span>
                    <span className="font-semibold text-primary">
                      ${getUpdatedEstimate()?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {timeError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {timeError}
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleConfirmAndCreate} className="w-full sm:w-auto">
                <Receipt className="h-4 w-4 mr-2" />
                Confirm & Create
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'task' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Bill This Task
              </DialogTitle>
              <DialogDescription>
                Would you like to bill time for this task?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Checkbox: Bill this task */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bill-task"
                  checked={billTask}
                  onCheckedChange={(checked) => {
                    setBillTask(checked === true);
                    if (!checked) {
                      setTaskHours('');
                      setTaskHoursError(null);
                    }
                  }}
                />
                <Label htmlFor="bill-task" className="cursor-pointer">Bill this task</Label>
              </div>

              {/* Hours input - only shown when checkbox is checked */}
              {billTask && (
                <div className="space-y-2 pl-6">
                  <Label className="text-sm font-medium">Hours to bill *</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    placeholder="e.g., 1.5"
                    value={taskHours}
                    onChange={(e) => {
                      setTaskHours(e.target.value);
                      setTaskHoursError(null);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 0.25 hours (15 minutes)
                  </p>
                </div>
              )}

              {/* Show rate and estimate when billing */}
              {billTask && parseFloat(taskHours) >= 0.25 && eligibility.serviceRate && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hours:</span>
                    <span className="font-medium">{parseFloat(taskHours).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-medium">{formatRate(eligibility.serviceRate, eligibility.priceUnit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Amount:</span>
                    <span className="font-semibold text-primary">
                      ${getTaskEstimate()?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {taskHoursError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {taskHoursError}
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleConfirmAndCreate} className="w-full sm:w-auto">
                <Receipt className="h-4 w-4 mr-2" />
                {billTask ? "Create Billing Item" : "Skip Billing"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'expense' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Add Expense
              </DialogTitle>
              <DialogDescription>
                Enter the expense details for this activity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category *</Label>
                <Select value={expenseCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                        {cat.defaultRate && (
                          <span className="text-muted-foreground ml-2">
                            (${cat.defaultRate.toFixed(2)}/{cat.unit || 'unit'})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description *</Label>
                <Textarea
                  placeholder="e.g., Drove to courthouse for witness meeting"
                  value={expenseDescription}
                  onChange={(e) => {
                    setExpenseDescription(e.target.value);
                    setExpenseError(null);
                  }}
                  rows={2}
                />
              </div>

              {/* Quantity and Unit Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Quantity *
                    {expenseCategory && EXPENSE_CATEGORIES.find(c => c.value === expenseCategory)?.unit && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({EXPENSE_CATEGORIES.find(c => c.value === expenseCategory)?.unit}s)
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g., 45"
                    value={expenseQuantity}
                    onChange={(e) => {
                      setExpenseQuantity(e.target.value);
                      setExpenseError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Unit Price *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.67"
                      value={expenseUnitPrice}
                      onChange={(e) => {
                        setExpenseUnitPrice(e.target.value);
                        setExpenseError(null);
                      }}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              {/* Total Calculation */}
              {getExpenseTotal() !== null && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {parseFloat(expenseQuantity)} × ${parseFloat(expenseUnitPrice).toFixed(2)}
                    </span>
                    <span className="font-semibold text-primary text-lg">
                      ${getExpenseTotal()?.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {expenseError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {expenseError}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Expenses require approval before being added to an invoice.
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleCreateExpense} className="w-full sm:w-auto">
                <Wallet className="h-4 w-4 mr-2" />
                Create Expense
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

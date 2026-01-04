import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { DollarSign, Clock, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

const adjustmentSchema = z.object({
  adjustment_type: z.enum(["hours", "dollars"]),
  new_value: z.coerce.number().min(0, "Value must be 0 or greater"),
  reason: z.string().min(1, "Reason is required").max(500),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface BudgetSummaryData {
  budget_hours_authorized: number;
  budget_dollars_authorized: number;
  hours_consumed: number;
  dollars_consumed: number;
  hours_remaining: number;
  dollars_remaining: number;
  hours_utilization_pct: number;
  dollars_utilization_pct: number;
}

interface BudgetAdjustmentFormProps {
  caseId: string;
  onSuccess: () => void;
  triggerButton?: React.ReactNode;
}

export function BudgetAdjustmentForm({ caseId, onSuccess, triggerButton }: BudgetAdjustmentFormProps) {
  const { hasPermission, loading: permLoading } = usePermissions();
  const [currentBudget, setCurrentBudget] = useState({ hours: 0, dollars: 0 });
  const [consumedBudget, setConsumedBudget] = useState({ hours: 0, dollars: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showConfirmReduction, setShowConfirmReduction] = useState(false);

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustment_type: "dollars",
      new_value: 0,
      reason: "",
    },
  });

  const adjustmentType = form.watch("adjustment_type");
  const newValue = form.watch("new_value");

  useEffect(() => {
    if (open) {
      fetchCurrentBudget();
    }
  }, [caseId, open]);

  const fetchCurrentBudget = async () => {
    try {
      // Fetch current budget from case
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("budget_hours, budget_dollars")
        .eq("id", caseId)
        .single();

      if (caseError) throw caseError;

      const currentHours = caseData?.budget_hours || 0;
      const currentDollars = caseData?.budget_dollars || 0;

      setCurrentBudget({
        hours: currentHours,
        dollars: currentDollars,
      });

      // Fetch consumed amounts from RPC
      const { data: summaryData, error: summaryError } = await supabase.rpc(
        "get_case_budget_summary",
        { p_case_id: caseId }
      );

      if (!summaryError && summaryData && summaryData.length > 0) {
        const summary = summaryData[0] as BudgetSummaryData;
        setConsumedBudget({
          hours: summary.hours_consumed || 0,
          dollars: summary.dollars_consumed || 0,
        });
      }

      // Set initial new_value based on current
      form.setValue("new_value", currentDollars);
    } catch (error) {
      console.error("Error fetching current budget:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update new_value when adjustment type changes
  useEffect(() => {
    if (adjustmentType === "hours") {
      form.setValue("new_value", currentBudget.hours);
    } else {
      form.setValue("new_value", currentBudget.dollars);
    }
  }, [adjustmentType, currentBudget]);

  const currentValue = adjustmentType === "hours" ? currentBudget.hours : currentBudget.dollars;
  const consumedValue = adjustmentType === "hours" ? consumedBudget.hours : consumedBudget.dollars;
  const adjustmentAmount = newValue - currentValue;

  // Validation warnings
  const isZeroBudget = newValue === 0 && currentValue > 0;
  const isBelowConsumed = newValue < consumedValue && consumedValue > 0;
  const isSignificantReduction = adjustmentAmount < 0 && 
    currentValue > 0 && 
    Math.abs(adjustmentAmount) / currentValue > 0.25;

  const onSubmit = async (data: AdjustmentFormData) => {
    // If significant reduction and not confirmed, show confirmation
    if (isSignificantReduction && !showConfirmReduction) {
      setShowConfirmReduction(true);
      return;
    }

    try {
      // Update the case budget field (trigger will log the adjustment)
      const updateData = data.adjustment_type === "hours"
        ? { budget_hours: data.new_value, budget_notes: data.reason }
        : { budget_dollars: data.new_value, budget_notes: data.reason };

      const { error } = await supabase
        .from("cases")
        .update(updateData)
        .eq("id", caseId);

      if (error) throw error;

      toast.success("Budget updated successfully");
      
      // Refresh current budget
      setCurrentBudget(prev => ({
        ...prev,
        [data.adjustment_type]: data.new_value,
      }));
      
      form.reset({
        adjustment_type: data.adjustment_type,
        new_value: data.new_value,
        reason: "",
      });
      
      setShowConfirmReduction(false);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setShowConfirmReduction(false);
      form.reset();
    }
  };

  if (permLoading) {
    return null;
  }

  if (!hasPermission("modify_case_budget")) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <DollarSign className="h-4 w-4 mr-2" />
      Adjust Budget
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Budget</DialogTitle>
          <DialogDescription>
            Update the authorized budget for this case. All changes are logged.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="adjustment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hours">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Hours
                          </div>
                        </SelectItem>
                        <SelectItem value="dollars">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Dollars
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current values display */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-md text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Current Authorized</p>
                  <p className="font-medium">
                    {adjustmentType === "hours" 
                      ? `${currentBudget.hours} hrs` 
                      : `$${currentBudget.dollars.toLocaleString()}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Already Consumed</p>
                  <p className="font-medium">
                    {adjustmentType === "hours" 
                      ? `${consumedBudget.hours} hrs` 
                      : `$${consumedBudget.dollars.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="new_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New {adjustmentType === "hours" ? "Hours" : "Dollars"}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        {adjustmentType === "dollars" && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        )}
                        <Input 
                          type="number" 
                          step={adjustmentType === "hours" ? "0.5" : "1"}
                          {...field} 
                          className={adjustmentType === "dollars" ? "pl-6" : ""}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Adjustment preview */}
              <div className={`flex items-center gap-2 text-sm font-medium p-2 rounded-md ${
                adjustmentAmount > 0 
                  ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30' 
                  : adjustmentAmount < 0 
                    ? 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30' 
                    : 'text-muted-foreground bg-muted/50'
              }`}>
                {adjustmentAmount > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : adjustmentAmount < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : null}
                <span>
                  Adjustment: {adjustmentAmount > 0 ? '+' : ''}
                  {adjustmentType === "hours" 
                    ? `${adjustmentAmount} hrs`
                    : `$${adjustmentAmount.toLocaleString()}`}
                </span>
              </div>

              {/* Warning: Zero budget */}
              {isZeroBudget && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Setting budget to zero will remove all budget limits for this case.
                  </AlertDescription>
                </Alert>
              )}

              {/* Warning: Below consumed */}
              {isBelowConsumed && (
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    New budget is below already consumed amount. This will show as over-budget.
                  </AlertDescription>
                </Alert>
              )}

              {/* Confirmation for significant reduction */}
              {showConfirmReduction && (
                <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 dark:text-orange-400">
                    This is a significant reduction (&gt;25%). Click "Confirm Reduction" to proceed.
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Explain reason for adjustment..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={form.formState.isSubmitting || adjustmentAmount === 0}
                  variant={showConfirmReduction ? "destructive" : "default"}
                >
                  {form.formState.isSubmitting 
                    ? "Saving..." 
                    : showConfirmReduction 
                      ? "Confirm Reduction" 
                      : "Update Budget"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useCaseTypeConfig } from "@/hooks/useCaseTypeConfig";
import { BudgetStrategyBadge, BudgetDisabledMessage } from "./BudgetStrategyBadge";
import { DollarSign, Clock, AlertTriangle, Shield, ShieldAlert, Plus, Pencil, Info } from "lucide-react";

const budgetSetupSchema = z.object({
  budget_type: z.enum(["hours", "money", "both"]),
  total_budget_hours: z.coerce.number().min(0).nullable(),
  total_budget_amount: z.coerce.number().min(0).nullable(),
  hard_cap: z.boolean(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.budget_type === "hours" || data.budget_type === "both") {
      return data.total_budget_hours !== null && data.total_budget_hours >= 0;
    }
    return true;
  },
  { message: "Hours budget is required", path: ["total_budget_hours"] }
).refine(
  (data) => {
    if (data.budget_type === "money" || data.budget_type === "both") {
      return data.total_budget_amount !== null && data.total_budget_amount >= 0;
    }
    return true;
  },
  { message: "Dollar budget is required", path: ["total_budget_amount"] }
);

type BudgetSetupFormData = z.infer<typeof budgetSetupSchema>;

interface CaseBudget {
  id: string;
  case_id: string;
  organization_id: string;
  budget_type: "hours" | "money" | "both";
  total_budget_hours: number | null;
  total_budget_amount: number | null;
  hard_cap: boolean;
  notes: string | null;
}

interface BudgetSetupFormProps {
  caseId: string;
  organizationId: string;
  caseTypeId?: string | null;
  onSuccess: () => void;
  triggerButton?: React.ReactNode;
  existingBudget?: CaseBudget | null;
}

export function BudgetSetupForm({ 
  caseId, 
  organizationId, 
  caseTypeId,
  onSuccess, 
  triggerButton,
  existingBudget 
}: BudgetSetupFormProps) {
  const { hasPermission, loading: permLoading } = usePermissions();
  const { config: caseTypeConfig } = useCaseTypeConfig(caseTypeId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!existingBudget;

  // Determine locked budget type based on strategy
  const lockedBudgetType = useMemo(() => {
    if (!caseTypeConfig) return null;
    if (caseTypeConfig.budgetStrategy === 'hours_only') return 'hours';
    if (caseTypeConfig.budgetStrategy === 'money_only') return 'money';
    return null;
  }, [caseTypeConfig]);

  // Get default budget type based on strategy
  const getDefaultBudgetType = () => {
    if (existingBudget) return existingBudget.budget_type;
    if (lockedBudgetType) return lockedBudgetType;
    return "both";
  };

  const form = useForm<BudgetSetupFormData>({
    resolver: zodResolver(budgetSetupSchema),
    defaultValues: {
      budget_type: getDefaultBudgetType(),
      total_budget_hours: existingBudget?.total_budget_hours ?? null,
      total_budget_amount: existingBudget?.total_budget_amount ?? null,
      hard_cap: existingBudget?.hard_cap || false,
      notes: existingBudget?.notes || "",
    },
  });

  const budgetType = form.watch("budget_type");
  const hardCap = form.watch("hard_cap");

  // Reset form when existing budget changes or dialog opens
  useEffect(() => {
    if (open && existingBudget) {
      form.reset({
        budget_type: existingBudget.budget_type,
        total_budget_hours: existingBudget.total_budget_hours,
        total_budget_amount: existingBudget.total_budget_amount,
        hard_cap: existingBudget.hard_cap,
        notes: existingBudget.notes || "",
      });
    } else if (open && !existingBudget) {
      form.reset({
        budget_type: getDefaultBudgetType(),
        total_budget_hours: null,
        total_budget_amount: null,
        hard_cap: false,
        notes: "",
      });
    }
  }, [open, existingBudget, form, lockedBudgetType]);

  const onSubmit = async (data: BudgetSetupFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const budgetData = {
        case_id: caseId,
        organization_id: organizationId,
        budget_type: data.budget_type,
        total_budget_hours: data.budget_type === "money" ? null : data.total_budget_hours,
        total_budget_amount: data.budget_type === "hours" ? null : data.total_budget_amount,
        hard_cap: data.hard_cap,
        notes: data.notes || null,
      };

      if (isEditing && existingBudget) {
        const { error } = await supabase
          .from("case_budgets")
          .update(budgetData)
          .eq("id", existingBudget.id);

        if (error) throw error;
        toast.success("Budget updated successfully");
      } else {
        const { error } = await supabase
          .from("case_budgets")
          .insert({
            ...budgetData,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Budget created successfully");
      }

      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving budget:", error);
      toast.error(error.message || "Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  if (permLoading) return null;
  if (!hasPermission("modify_case_budget")) return null;
  
  // If budgets are disabled by Case Type, don't show the form trigger at all
  if (caseTypeConfig?.budgetDisabled) return null;

  const defaultTrigger = isEditing ? (
    <Button variant="outline" size="sm">
      <Pencil className="h-4 w-4 mr-2" />
      Edit Budget
    </Button>
  ) : (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Set Budget
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Budget" : "Set Budget"}</DialogTitle>
          <DialogDescription>
            Define budget constraints for this case. Budgets control how much work may be performed - they do not calculate invoices but rather limit work authorization.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Show strategy indicator if locked */}
            {lockedBudgetType && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                  Budget type is set to <strong>{lockedBudgetType === 'hours' ? 'Hours Only' : 'Dollars Only'}</strong> by the Case Type configuration.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="budget_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!!lockedBudgetType}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(!lockedBudgetType || lockedBudgetType === 'hours') && (
                        <SelectItem value="hours">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Hours Only
                          </div>
                        </SelectItem>
                      )}
                      {(!lockedBudgetType || lockedBudgetType === 'money') && (
                        <SelectItem value="money">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Dollars Only
                          </div>
                        </SelectItem>
                      )}
                      {!lockedBudgetType && (
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <DollarSign className="h-4 w-4 -ml-1" />
                            Both Hours & Dollars
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {lockedBudgetType 
                      ? "Controlled by Case Type settings."
                      : "Choose what type of budget to track for this case."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(budgetType === "hours" || budgetType === "both") && (
              <FormField
                control={form.control}
                name="total_budget_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Hours Budget</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                          className="pl-9"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(budgetType === "money" || budgetType === "both") && (
              <FormField
                control={form.control}
                name="total_budget_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Dollar Budget</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                          className="pl-9"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="hard_cap"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      {field.value ? (
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                      ) : (
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      )}
                      Hard Cap (Block work when exceeded)
                    </FormLabel>
                    <FormDescription>
                      {field.value 
                        ? "Work will be BLOCKED when budget is exceeded. Users cannot log time or expenses beyond this limit."
                        : "Soft cap - Users will receive warnings but can still log work beyond the budget."}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {hardCap && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  <strong>Hard cap enabled.</strong> When the budget is reached:
                  <ul className="list-disc list-inside mt-1 text-sm">
                    <li>Time entries will be blocked</li>
                    <li>Expense entries will be blocked</li>
                    <li>An administrator must increase the budget to continue work</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Budget authorization notes..."
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
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEditing ? "Update Budget" : "Create Budget"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

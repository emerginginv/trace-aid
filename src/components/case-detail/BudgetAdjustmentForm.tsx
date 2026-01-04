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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const adjustmentSchema = z.object({
  adjustment_type: z.enum(["hours", "dollars"]),
  new_value: z.coerce.number().min(0, "Value must be 0 or greater"),
  reason: z.string().min(1, "Reason is required").max(500),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface BudgetAdjustmentFormProps {
  caseId: string;
  onSuccess: () => void;
}

export function BudgetAdjustmentForm({ caseId, onSuccess }: BudgetAdjustmentFormProps) {
  const { hasPermission, loading: permLoading } = usePermissions();
  const [currentBudget, setCurrentBudget] = useState({ hours: 0, dollars: 0 });
  const [loading, setLoading] = useState(true);

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
    fetchCurrentBudget();
  }, [caseId]);

  const fetchCurrentBudget = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("budget_hours, budget_dollars")
        .eq("id", caseId)
        .single();

      if (error) throw error;

      setCurrentBudget({
        hours: data?.budget_hours || 0,
        dollars: data?.budget_dollars || 0,
      });

      // Set initial new_value based on current
      form.setValue("new_value", data?.budget_dollars || 0);
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
  const adjustmentAmount = newValue - currentValue;

  const onSubmit = async (data: AdjustmentFormData) => {
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
      
      onSuccess();
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
    }
  };

  if (permLoading || loading) {
    return null;
  }

  if (!hasPermission("modify_case_budget")) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Adjust Budget</CardTitle>
      </CardHeader>
      <CardContent>
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
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="dollars">Dollars</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-muted-foreground">
              Current: {adjustmentType === "hours" 
                ? `${currentBudget.hours} hrs` 
                : `$${currentBudget.dollars.toLocaleString()}`}
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

            <div className={`text-sm font-medium ${adjustmentAmount > 0 ? 'text-green-600' : adjustmentAmount < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              Adjustment: {adjustmentAmount > 0 ? '+' : ''}{adjustmentType === "hours" 
                ? `${adjustmentAmount} hrs`
                : `$${adjustmentAmount.toLocaleString()}`}
            </div>

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

            <Button type="submit" disabled={form.formState.isSubmitting || adjustmentAmount === 0}>
              {form.formState.isSubmitting ? "Saving..." : "Update Budget"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

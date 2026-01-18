import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CaseFormData, BudgetConfig } from "./types";

interface CaseBudgetFieldsProps {
  form: UseFormReturn<CaseFormData>;
  budgetConfig: BudgetConfig;
}

/**
 * Budget authorization fields for the case form.
 * Displays hours and/or dollars based on case type budget strategy.
 */
export function CaseBudgetFields({ form, budgetConfig }: CaseBudgetFieldsProps) {
  if (budgetConfig.disabled) {
    return null;
  }

  return (
    <div className="border-t pt-4 space-y-4">
      <h3 className="text-sm font-semibold">Budget Authorization</h3>
      <p className="text-xs text-muted-foreground">
        Set authorization limits for this case. This is an internal budget authorization, not a client payment.
        {budgetConfig.required && <span className="text-destructive ml-1">*Required</span>}
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        {budgetConfig.showHours && (
          <FormField
            control={form.control}
            name="budget_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget Hours{budgetConfig.required && ' *'}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.5"
                    placeholder="0"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {budgetConfig.showDollars && (
          <FormField
            control={form.control}
            name="budget_dollars"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget Dollars{budgetConfig.required && ' *'}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      step="1"
                      placeholder="0"
                      className="pl-6"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <FormField
        control={form.control}
        name="budget_notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Budget Notes</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Notes about the budget authorization..."
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

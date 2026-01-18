import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";
import { HelpTooltip } from "@/components/ui/tooltip";

interface FinanceFormFieldsProps {
  form: UseFormReturn<any>;
  subjects: any[];
  activities: any[];
  users: {id: string; email: string; full_name: string | null}[];
}

export const FinanceFormFields = ({ form, subjects, activities, users }: FinanceFormFieldsProps) => {
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const financeType = form.watch("finance_type");
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unit_price");

  // Auto-calculate amount for expenses
  useEffect(() => {
    if (financeType === "expense" && unitPrice) {
      const qty = quantity || "1";
      const calculatedAmount = (Number(qty) * Number(unitPrice)).toString();
      form.setValue("amount", calculatedAmount);
    }
  }, [quantity, unitPrice, financeType, form]);

  useEffect(() => {
    fetchExpenseCategories();
  }, []);

  const fetchExpenseCategories = async () => {
    try {
      const { getCurrentUserOrganizationId } = await import("@/lib/organizationHelpers");
      const organizationId = await getCurrentUserOrganizationId();

      const { data, error } = await supabase
        .from("picklists")
        .select("value")
        .eq("type", "expense_category")
        .eq("is_active", true)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setExpenseCategories(data.map(item => item.value));
      } else {
        // Fallback to default categories
        setExpenseCategories(['Surveillance', 'Research']);
      }
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      // Fallback to default categories on error
      setExpenseCategories(['Surveillance', 'Research']);
    }
  };
  const BILLING_FREQUENCIES = [
    "One-time",
    "Weekly",
    "Bi-weekly",
    "Monthly",
    "Quarterly",
    "Annually",
  ];
  
  const getStatusOptions = () => {
    if (financeType === "expense" || financeType === "time") {
      return [
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ];
    }
    if (financeType === "invoice") {
      return [
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "pending", label: "Pending" },
        { value: "partial", label: "Partially Paid" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" },
      ];
    }
    return [
      { value: "pending", label: "Pending" },
      { value: "paid", label: "Paid" },
    ];
  };

  return (
    <>
      <FormField
        control={form.control}
        name="finance_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              Type
              <HelpTooltip content="Choose whether this is a reimbursable expense or billable time" />
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="time">Time</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              Description
              <HelpTooltip content="Detailed narrative of what this expense covers. Descriptions appear on invoices and in audit reports." />
            </FormLabel>
            <FormControl>
              <Input placeholder="e.g., 'Mileage to subject's workplace' rather than 'Travel'" {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">Be specific - descriptions appear on invoices and in audit reports</p>
            <FormMessage />
          </FormItem>
        )}
      />

      {financeType === "expense" && (
        <>
          {users.length > 0 && (
            <FormField
              control={form.control}
              name="expense_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense For (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="none">Not specified</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Quantity
                  <HelpTooltip content="Number of units (e.g., miles, hours, items)" />
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    placeholder="1" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Unit Price <span className="text-destructive">*</span>
                  <HelpTooltip content="Cost per unit - required for all expenses. Expenses without unit prices cannot be saved." />
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    placeholder="Price per unit (required)" 
                    {...field} 
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Unit price × quantity = total amount</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      {financeType !== "time" && (
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Amount {financeType === "expense" && "(Auto-calculated)"}</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  {...field} 
                  readOnly={financeType === "expense"}
                  className={financeType === "expense" ? "bg-muted" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {financeType === "time" && (
        <>
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Hours
                  <HelpTooltip content="Billable hours worked. Use 0.25 hour increments (15 minutes)." />
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value) || 0;
                      field.onChange(hours.toString());
                      const rate = parseFloat(form.getValues("hourly_rate") as string) || 0;
                      form.setValue("amount", (hours * rate).toString());
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Be accurate - this affects billing and your work record</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hourly_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Hourly Rate
                  <HelpTooltip content="Rate per hour for this work. Should match your pricing profile unless client has negotiated different terms." />
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      field.onChange(rate.toString());
                      const hours = parseFloat(form.getValues("hours") as string) || 0;
                      form.setValue("amount", (hours * rate).toString());
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-sm text-muted-foreground">
            Total: ${((parseFloat(form.watch("hours") as string || "0")) * (parseFloat(form.watch("hourly_rate") as string || "0"))).toFixed(2)}
          </div>
        </>
      )}

      {(financeType === "expense" || financeType === "time") && (
        <>
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Category
                  <HelpTooltip content="Expense category for reporting and filtering. Categories help organize expenses for client reports and tax documentation." />
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background z-50">
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      {financeType === "invoice" && (
        <FormField
          control={form.control}
          name="invoice_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Number</FormLabel>
              <FormControl>
                <Input placeholder="INV-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="flex items-center gap-1">
              Date
              <HelpTooltip content="When this expense was incurred. Use the actual date of the expense, not the date you're entering it." />
            </FormLabel>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value || undefined}
                  onSelect={(date) => {
                    if (date) {
                      field.onChange(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  defaultMonth={new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {financeType === "invoice" && (
        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date (Optional)</FormLabel>
              <Popover open={dueDatePickerOpen} onOpenChange={setDueDatePickerOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setDueDatePickerOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      )}


      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              Status
              <HelpTooltip content="Current approval state. Pending entries require approval before they appear on invoices." />
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50">
                  {getStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {subjects.length > 0 && (
        <FormField
          control={form.control}
          name="subject_id"
          render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              Link to Subject (Optional)
              <HelpTooltip content="Associate this expense with a specific subject. Linking to subjects helps track per-subject costs and proves relevance in reports." />
            </FormLabel>
            <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">None</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.subject_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {activities.length > 0 && (
        <FormField
          control={form.control}
          name="activity_id"
          render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              Link to Activity (Optional)
              <HelpTooltip content="Associate this expense with a scheduled activity. Linked expenses appear in activity reports and help justify scheduled work." />
            </FormLabel>
            <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">None</SelectItem>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.title} ({activity.activity_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes (Optional)</FormLabel>
            <FormControl>
              <Textarea placeholder="Additional notes..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

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

interface FinanceFormFieldsProps {
  form: UseFormReturn<any>;
  subjects: any[];
  activities: any[];
}

export const FinanceFormFields = ({ form, subjects, activities }: FinanceFormFieldsProps) => {
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("picklists")
        .select("value")
        .eq("user_id", user.id)
        .eq("type", "expense_category")
        .eq("is_active", true)
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
            <FormLabel>Type</FormLabel>
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
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input placeholder="Transaction description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {financeType === "expense" && (
        <>
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity (default: 1)</FormLabel>
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
                <FormLabel>Unit Price</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="Price per unit" 
                    {...field} 
                  />
                </FormControl>
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
                <FormLabel>Hours</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hourly_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Rate</FormLabel>
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
                <FormLabel>Category</FormLabel>
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
            <FormLabel>Date</FormLabel>
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
              <Popover>
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
                    onSelect={field.onChange}
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

      {financeType === "retainer" && (
        <>
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
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
                      onSelect={field.onChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date (Optional)</FormLabel>
                <Popover>
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
                      onSelect={field.onChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="billing_frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50">
                  {BILLING_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq} value={freq}>
                        {freq}
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

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
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
              <FormLabel>Link to Subject (Optional)</FormLabel>
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
              <FormLabel>Link to Activity (Optional)</FormLabel>
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

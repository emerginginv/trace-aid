import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { FinanceFormFields } from "./FinanceFormFields";
import { NotificationHelpers } from "@/lib/notificationHelpers";

const formSchema = z.object({
  finance_type: z.enum(["retainer", "expense", "time"]),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  description: z.string().min(1, "Description is required"),
  date: z.date().optional().refine((val) => val !== undefined, { message: "Date is required" }),
  status: z.enum(["draft", "sent", "pending", "paid", "partial", "overdue", "approved", "rejected"]),
  due_date: z.date().optional(),
  subject_id: z.string().optional(),
  activity_id: z.string().optional(),
  category: z.string().optional(),
  quantity: z.string().optional(),
  unit_price: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  billing_frequency: z.string().optional(),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
  hours: z.string().optional(),
  hourly_rate: z.string().optional(),
});

interface FinanceFormProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingFinance?: any;
  defaultFinanceType?: "retainer" | "expense" | "time";
}

export const FinanceForm = ({ caseId, open, onOpenChange, onSuccess, editingFinance, defaultFinanceType = "expense" }: FinanceFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      finance_type: defaultFinanceType,
      amount: "",
      description: "",
      date: undefined,
      status: "pending",
      subject_id: undefined,
      activity_id: undefined,
      category: undefined,
      quantity: "1",
      unit_price: undefined,
      start_date: undefined,
      end_date: undefined,
      billing_frequency: undefined,
      invoice_number: undefined,
      notes: undefined,
      due_date: undefined,
    },
  });

  useEffect(() => {
    if (editingFinance) {
      const quantity = editingFinance.quantity || 1;
      const unitPrice = editingFinance.amount / quantity;
      
      form.reset({
        finance_type: editingFinance.finance_type,
        amount: editingFinance.amount.toString(),
        description: editingFinance.description,
        date: new Date(editingFinance.date),
        status: editingFinance.status,
        subject_id: editingFinance.subject_id || undefined,
        activity_id: editingFinance.activity_id || undefined,
        category: editingFinance.category || undefined,
        quantity: quantity.toString(),
        unit_price: unitPrice.toString(),
        start_date: editingFinance.start_date ? new Date(editingFinance.start_date) : undefined,
        end_date: editingFinance.end_date ? new Date(editingFinance.end_date) : undefined,
        billing_frequency: editingFinance.billing_frequency || undefined,
        invoice_number: editingFinance.invoice_number || undefined,
        notes: editingFinance.notes || undefined,
        due_date: editingFinance.due_date ? new Date(editingFinance.due_date) : undefined,
        hours: editingFinance.hours?.toString() || undefined,
        hourly_rate: editingFinance.hourly_rate?.toString() || undefined,
      });
    } else {
      form.reset({
        finance_type: defaultFinanceType,
        amount: "",
        description: "",
        date: undefined,
        status: "pending",
        subject_id: undefined,
        activity_id: undefined,
        category: undefined,
        quantity: undefined,
        unit_price: undefined,
        start_date: undefined,
        end_date: undefined,
        billing_frequency: undefined,
        invoice_number: undefined,
        notes: undefined,
        due_date: undefined,
        hours: undefined,
        hourly_rate: undefined,
      });
    }
  }, [editingFinance, form, defaultFinanceType]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [subjectsRes, activitiesRes] = await Promise.all([
        supabase.from("case_subjects").select("*").eq("case_id", caseId).eq("user_id", user.id),
        supabase.from("case_activities").select("*").eq("case_id", caseId).eq("user_id", user.id),
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
    };

    if (open) fetchData();
  }, [caseId, open]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
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

      const isTimeEntry = values.finance_type === 'time';
      const isExpense = values.finance_type === 'expense';
      
      const hours = Number(values.hours || 0);
      const hourlyRate = Number(values.hourly_rate || 0);
      const quantity = Number(values.quantity || 1);
      const unitPrice = Number(values.unit_price || 0);
      
      const amount = isTimeEntry 
        ? hours * hourlyRate 
        : isExpense 
          ? quantity * unitPrice 
          : Number(values.amount || 0);

      const financeData = {
        case_id: caseId,
        user_id: user.id,
        finance_type: values.finance_type,
        amount: amount,
        description: values.description,
        date: format(values.date!, "yyyy-MM-dd"),
        status: values.status,
        subject_id: values.subject_id === "none" ? null : (values.subject_id || null),
        activity_id: values.activity_id === "none" ? null : (values.activity_id || null),
        category: values.category || null,
        quantity: values.quantity ? Number(values.quantity) : 1,
        unit_price: values.unit_price ? Number(values.unit_price) : null,
        start_date: values.start_date ? format(values.start_date, "yyyy-MM-dd") : null,
        end_date: values.end_date ? format(values.end_date, "yyyy-MM-dd") : null,
        billing_frequency: values.billing_frequency || null,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
        due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
        organization_id: orgMember.organization_id,
        ...(isTimeEntry && {
          hours: hours,
          hourly_rate: hourlyRate,
        }),
      };

      let error;
      let newExpense;
      if (editingFinance) {
        const result = await supabase
          .from("case_finances")
          .update(financeData)
          .eq("id", editingFinance.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("case_finances")
          .insert(financeData)
          .select()
          .single();
        error = result.error;
        newExpense = result.data;
      }

      if (error) throw error;

      // Send notification for new expenses
      if (!editingFinance && newExpense && values.finance_type === 'expense') {
        await NotificationHelpers.expenseSubmitted(
          {
            id: newExpense.id,
            description: values.description,
            amount: amount,
            case_id: caseId,
          },
          user.id,
          orgMember.organization_id
        );
      }

      toast({
        title: "Success",
        description: editingFinance ? "Transaction updated successfully" : "Transaction added successfully",
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving finance record:", error);
      toast({
        title: "Error",
        description: "Failed to save transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingFinance ? "Edit" : "Add"} Financial Transaction</DialogTitle>
          <DialogDescription>Record a retainer, expense, or invoice</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FinanceFormFields form={form} subjects={subjects} activities={activities} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (editingFinance ? "Updating..." : "Adding...") : (editingFinance ? "Update Transaction" : "Add Transaction")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
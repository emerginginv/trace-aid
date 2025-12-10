import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const paymentSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be greater than 0",
  }),
  payment_date: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  remainingBalance: number;
  onSuccess: () => void;
}

export const PaymentForm = ({ open, onOpenChange, invoiceId, remainingBalance, onSuccess }: PaymentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: remainingBalance.toFixed(2),
      payment_date: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const onSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const amount = Number(values.amount);

      // Validate amount doesn't exceed remaining balance
      if (amount > remainingBalance) {
        toast({
          title: "Invalid amount",
          description: `Payment amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`,
          variant: "destructive",
        });
        return;
      }

      // Insert payment record
      // Get organization_id
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!orgMember?.organization_id) {
        throw new Error("User not in organization");
      }

      const { error: paymentError } = await supabase
        .from("invoice_payments")
        .insert({
          invoice_id: invoiceId,
          user_id: user.id,
          organization_id: orgMember.organization_id,
          amount: amount,
          payment_date: values.payment_date,
          notes: values.notes || null,
        });

      if (paymentError) throw paymentError;

      // Fetch all payments for this invoice to calculate total
      const { data: payments, error: paymentsError } = await supabase
        .from("invoice_payments")
        .select("amount")
        .eq("invoice_id", invoiceId)
        .eq("user_id", user.id);

      if (paymentsError) throw paymentsError;

      // Calculate total paid (including the new payment)
      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0) + amount;

      // Fetch invoice to get total amount
      const { data: invoice, error: invoiceError } = await supabase
        .from("case_finances")
        .select("amount")
        .eq("id", invoiceId)
        .eq("user_id", user.id)
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceTotal = Number(invoice.amount);

      // Update invoice status based on payment
      let newStatus = "partial";
      if (totalPaid >= invoiceTotal) {
        newStatus = "paid";
      }

      const { error: updateError } = await supabase
        .from("case_finances")
        .update({ status: newStatus })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      toast({
        title: "Payment recorded",
        description: `Payment of $${amount.toFixed(2)} recorded successfully`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Remaining balance: ${remainingBalance.toFixed(2)}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Payment method, reference number, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
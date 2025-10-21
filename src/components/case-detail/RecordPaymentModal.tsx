import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";

interface RecordPaymentModalProps {
  invoice: {
    id: string;
    invoice_number: string;
    case_id: string;
    total: number;
    balance_due?: number;
  };
  caseRetainerBalance: number;
  open: boolean;
  onClose: () => void;
  onPaymentRecorded?: () => void;
}

export default function RecordPaymentModal({
  invoice,
  caseRetainerBalance,
  open,
  onClose,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const [retainerAmount, setRetainerAmount] = useState(0);
  const [manualAmount, setManualAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const totalDue = invoice?.balance_due ?? invoice?.total ?? 0;

  useEffect(() => {
    setRetainerAmount(0);
    setManualAmount(0);
  }, [open]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const totalPaid = Number(retainerAmount) + Number(manualAmount);
      
      if (totalPaid <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a payment amount greater than 0",
          variant: "destructive",
        });
        return;
      }

      if (retainerAmount > caseRetainerBalance) {
        toast({
          title: "Insufficient Funds",
          description: "Retainer amount exceeds available balance",
          variant: "destructive",
        });
        return;
      }

      if (totalPaid > totalDue) {
        toast({
          title: "Payment Exceeds Due",
          description: "Total payment exceeds the amount due",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Combine payments into one record if both exist
      const totalPaymentAmount = Number(retainerAmount) + Number(manualAmount);
      
      if (totalPaymentAmount > 0) {
        // Record the payment
        const paymentNotes = [];
        if (manualAmount > 0) paymentNotes.push(`Manual payment: $${manualAmount.toFixed(2)}`);
        if (retainerAmount > 0) paymentNotes.push(`Retainer applied: $${retainerAmount.toFixed(2)}`);

        const { error: payError } = await supabase.from("invoice_payments").insert({
          invoice_id: invoice.id,
          amount: totalPaymentAmount,
          user_id: user.id,
          payment_date: new Date().toISOString(),
          notes: paymentNotes.join(', '),
        });

        if (payError) throw payError;

        // Deduct from retainer balance if retainer was used
        if (retainerAmount > 0) {
          const { error: retainerError } = await supabase.from("retainer_funds").insert({
            case_id: invoice.case_id,
            amount: -retainerAmount,
            user_id: user.id,
            note: `Applied to invoice ${invoice.invoice_number}`,
            invoice_id: invoice.id,
          });

          if (retainerError) throw retainerError;
        }
      }

      // Calculate new status based on total payments
      // Fetch current total payments for this invoice
      const { data: paymentsData } = await supabase
        .from("invoice_payments")
        .select("amount")
        .eq("invoice_id", invoice.id);

      const currentTotalPayments = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalPaidNow = currentTotalPayments + totalPaymentAmount;
      const remaining = totalDue - totalPaidNow;
      
      const newStatus = remaining <= 0.01 ? "paid" : totalPaidNow > 0 ? "partial" : "unpaid";

      // Update invoice status only (balance_due is a generated column)
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: newStatus,
        })
        .eq("id", invoice.id);

      if (updateError) throw updateError;

      toast({
        title: "Payment Recorded",
        description: `Successfully recorded payment of $${totalPaid.toFixed(2)}`,
      });

      onPaymentRecorded?.();
      onClose();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPayment = Number(retainerAmount) + Number(manualAmount);
  const maxRetainer = Math.min(caseRetainerBalance, totalDue);
  const maxManual = totalDue - retainerAmount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice:</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Due:</span>
              <span className="font-semibold text-lg">${totalDue.toFixed(2)}</span>
            </div>
          </div>

          {caseRetainerBalance > 0 && (
            <div className="space-y-2">
              <Label htmlFor="retainer-amount">
                Apply from Retainer (Available: ${caseRetainerBalance.toFixed(2)})
              </Label>
              <Input
                id="retainer-amount"
                type="number"
                placeholder="0.00"
                value={retainerAmount || ""}
                onChange={(e) => setRetainerAmount(Math.min(Number(e.target.value), maxRetainer))}
                min={0}
                max={maxRetainer}
                step="0.01"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="manual-amount">Manual Payment</Label>
            <Input
              id="manual-amount"
              type="number"
              placeholder="0.00"
              value={manualAmount || ""}
              onChange={(e) => setManualAmount(Math.min(Number(e.target.value), maxManual))}
              min={0}
              max={maxManual}
              step="0.01"
            />
          </div>

          <div className="rounded-lg bg-primary/5 p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Payment:</span>
              <span className="font-semibold text-primary">${totalPayment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining Balance:</span>
              <span className="font-medium">${Math.max(0, totalDue - totalPayment).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || totalPayment <= 0}>
            {submitting ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

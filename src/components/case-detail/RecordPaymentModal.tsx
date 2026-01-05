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
  organizationId: string;
}

export default function RecordPaymentModal({
  invoice,
  caseRetainerBalance,
  open,
  onClose,
  onPaymentRecorded,
  organizationId,
}: RecordPaymentModalProps) {
  const [retainerAmount, setRetainerAmount] = useState(0);
  const [manualAmount, setManualAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [currentBalanceDue, setCurrentBalanceDue] = useState(invoice?.balance_due ?? invoice?.total ?? 0);
  const [retainerApplied, setRetainerApplied] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalDue = currentBalanceDue;

  useEffect(() => {
    if (open && invoice?.id) {
      fetchLatestInvoiceData();
    }
  }, [open, invoice?.id]);

  const fetchLatestInvoiceData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("balance_due, total_paid, retainer_applied, total")
        .eq("id", invoice.id)
        .single();

      if (error) throw error;

      setCurrentBalanceDue(data.balance_due ?? (data.total - (data.total_paid || 0)));
      setRetainerApplied(data.retainer_applied || 0);
      setRetainerAmount(0);
      setManualAmount(0);
    } catch (error) {
      console.error("Error fetching invoice data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const totalPaidNow = Number(retainerAmount) + Number(manualAmount);
      
      if (totalPaidNow <= 0) {
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

      if (totalPaidNow > totalDue) {
        toast({
          title: "Payment Exceeds Due",
          description: "Total payment exceeds the amount due",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 1️⃣ Fetch current totals from DB to support multiple payments
      const { data: currentInvoice, error: fetchError } = await supabase
        .from("invoices")
        .select("total_paid, total")
        .eq("id", invoice.id)
        .single();

      if (fetchError) throw fetchError;

      const prevPaid = currentInvoice?.total_paid || 0;
      const invoiceTotal = currentInvoice?.total || invoice.total;
      const newTotalPaid = prevPaid + totalPaidNow;
      const newBalance = invoiceTotal - newTotalPaid;

      // 2️⃣ Determine status based on total paid vs invoice total
      let newStatus = "unpaid";
      if (newTotalPaid >= invoiceTotal) {
        newStatus = "paid";
      } else if (newTotalPaid > 0 && newTotalPaid < invoiceTotal) {
        newStatus = "partial";
      }

      // 3️⃣ Record the payment in invoice_payments
      const paymentNotes = [];
      if (manualAmount > 0) paymentNotes.push(`Manual payment: $${manualAmount.toFixed(2)}`);
      if (retainerAmount > 0) paymentNotes.push(`Retainer applied: $${retainerAmount.toFixed(2)}`);

      const { error: payError } = await supabase.from("invoice_payments").insert({
        invoice_id: invoice.id,
        amount: totalPaidNow,
        user_id: user.id,
        organization_id: organizationId,
        payment_date: new Date().toISOString(),
        notes: paymentNotes.join(', '),
      });

      if (payError) throw payError;

      // 4️⃣ Apply retainer deduction if used
      if (retainerAmount > 0) {
        const { error: retainerError } = await supabase.from("retainer_funds").insert({
          case_id: invoice.case_id,
          amount: -retainerAmount,
          user_id: user.id,
          organization_id: organizationId,
          note: `Applied to invoice ${invoice.invoice_number}`,
          invoice_id: invoice.id,
        });

        if (retainerError) throw retainerError;
      }

      // 5️⃣ Update invoice totals and status (balance_due is auto-calculated)
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          total_paid: newTotalPaid,
          status: newStatus,
        })
        .eq("id", invoice.id);

      if (updateError) throw updateError;

      toast({
        title: "Payment Recorded",
        description: newStatus === "partial"
          ? `Partial payment recorded ($${totalPaidNow.toFixed(2)}). Remaining: $${Math.max(0, newBalance).toFixed(2)}`
          : "Invoice fully paid!",
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
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="text-sm text-muted-foreground">Loading invoice details...</div>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-medium">{invoice.invoice_number}</span>
                </div>
                {retainerApplied > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Retainer Already Applied:</span>
                    <span className="font-medium text-green-600">-${retainerApplied.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Remaining Balance:</span>
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
            </>
          )}
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

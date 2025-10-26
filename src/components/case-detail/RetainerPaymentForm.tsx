import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RetainerPaymentFormProps {
  invoiceId: string;
  invoiceNumber: string;
  caseId: string;
  remainingBalance: number;
  onSuccess: () => void;
}

export const RetainerPaymentForm = ({ 
  invoiceId, 
  invoiceNumber,
  caseId, 
  remainingBalance, 
  onSuccess 
}: RetainerPaymentFormProps) => {
  const [retainerBalance, setRetainerBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetchRetainerBalance();
  }, [caseId]);

  const fetchRetainerBalance = async () => {
    try {
      const { data, error } = await supabase
        .from("retainer_funds")
        .select("amount")
        .eq("case_id", caseId);

      if (error) throw error;

      const total = (data || []).reduce((sum, fund) => sum + Number(fund.amount), 0);
      setRetainerBalance(total);
    } catch (error) {
      console.error("Error fetching retainer balance:", error);
      toast({
        title: "Error",
        description: "Failed to load retainer balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRetainer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }

    if (amountNum > retainerBalance) {
      toast({
        title: "Insufficient Funds",
        description: `Cannot apply $${amountNum.toFixed(2)}. Available retainer balance is $${retainerBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    if (amountNum > remainingBalance) {
      toast({
        title: "Amount Exceeds Balance",
        description: `Cannot apply $${amountNum.toFixed(2)}. Remaining invoice balance is $${remainingBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get organization_id
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!orgMember?.organization_id) {
        throw new Error("User not in organization");
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from("invoice_payments")
        .insert({
          invoice_id: invoiceId,
          user_id: user.id,
          organization_id: orgMember.organization_id,
          amount: amountNum,
          payment_date: new Date().toISOString().split('T')[0],
          notes: "Payment from retainer funds",
        });

      if (paymentError) throw paymentError;

      // Create retainer deduction record
      const { error: retainerError } = await supabase
        .from("retainer_funds")
        .insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: orgMember.organization_id,
          amount: -amountNum,
          note: `Applied to Invoice #${invoiceNumber}`,
          invoice_id: invoiceId,
        });

      if (retainerError) throw retainerError;

      // Fetch all payments to calculate new total
      const { data: payments, error: paymentsError } = await supabase
        .from("invoice_payments")
        .select("amount")
        .eq("invoice_id", invoiceId)
        .eq("user_id", user.id);

      if (paymentsError) throw paymentsError;

      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

      // Fetch invoice to get total amount
      const { data: invoice, error: invoiceError } = await supabase
        .from("case_finances")
        .select("amount")
        .eq("id", invoiceId)
        .eq("user_id", user.id)
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceTotal = Number(invoice.amount);

      // Update invoice status
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
        title: "Success",
        description: `$${amountNum.toFixed(2)} applied from retainer funds`,
      });

      setAmount("");
      onSuccess();
    } catch (error) {
      console.error("Error applying retainer funds:", error);
      toast({
        title: "Error",
        description: "Failed to apply retainer funds",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (retainerBalance <= 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No retainer funds available for this case. Add funds to the retainer to use this payment option.
        </AlertDescription>
      </Alert>
    );
  }

  const maxApplicable = Math.min(retainerBalance, remainingBalance);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-heading-5 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Use Retainer Funds
          </h3>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">Available Retainer Balance</div>
          <div className="text-2xl font-bold text-primary">
            ${retainerBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <form onSubmit={handleApplyRetainer} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retainer-amount">Amount to Apply</Label>
            <Input
              id="retainer-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxApplicable}
              placeholder={maxApplicable.toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Maximum applicable: ${maxApplicable.toFixed(2)}
            </p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply Funds
          </Button>
        </form>
      </div>
    </Card>
  );
};

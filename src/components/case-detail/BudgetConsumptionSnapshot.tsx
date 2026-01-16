import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Receipt, Clock, DollarSign, FileText, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
interface BudgetConsumptionSnapshotProps {
  caseId: string;
  refreshKey?: number;
}
interface BudgetData {
  hours_consumed: number;
  dollars_consumed: number;
}
interface InvoiceTotals {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
}
export function BudgetConsumptionSnapshot({
  caseId,
  refreshKey
}: BudgetConsumptionSnapshotProps) {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [invoiceTotals, setInvoiceTotals] = useState<InvoiceTotals | null>(null);
  const [uninvoicedAmount, setUninvoicedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchData();
  }, [caseId, refreshKey]);
  const fetchData = async () => {
    try {
      // Fetch budget consumption from existing RPC
      const {
        data: budgetRpcData,
        error: budgetError
      } = await supabase.rpc("get_case_budget_summary", {
        p_case_id: caseId
      });
      if (budgetError) throw budgetError;
      if (budgetRpcData && budgetRpcData.length > 0) {
        setBudgetData({
          hours_consumed: budgetRpcData[0].hours_consumed,
          dollars_consumed: budgetRpcData[0].dollars_consumed
        });
      }

      // Fetch invoice totals
      const {
        data: invoices,
        error: invoiceError
      } = await supabase.from("invoices").select("total, total_paid, balance_due").eq("case_id", caseId);
      if (invoiceError) throw invoiceError;
      if (invoices) {
        const totals = invoices.reduce((acc, inv) => ({
          totalInvoiced: acc.totalInvoiced + (inv.total || 0),
          totalPaid: acc.totalPaid + (inv.total_paid || 0),
          outstanding: acc.outstanding + (inv.balance_due || 0)
        }), {
          totalInvoiced: 0,
          totalPaid: 0,
          outstanding: 0
        });
        setInvoiceTotals(totals);
      }

      // Fetch uninvoiced amounts from canonical tables
      const [{ data: timeData, error: timeError }, { data: expenseData, error: expenseError }] = await Promise.all([
        supabase
          .from("time_entries")
          .select("total")
          .eq("case_id", caseId)
          .or("status.is.null,status.neq.rejected"),
        supabase
          .from("expense_entries")
          .select("total")
          .eq("case_id", caseId)
          .or("status.is.null,status.neq.rejected"),
      ]);
      
      if (timeError) throw timeError;
      if (expenseError) throw expenseError;
      
      const timeTotal = (timeData || []).reduce((sum, item) => sum + (item.total || 0), 0);
      const expenseTotal = (expenseData || []).reduce((sum, item) => sum + (item.total || 0), 0);
      setUninvoicedAmount(timeTotal + expenseTotal);
    } catch (error) {
      console.error("Error fetching consumption snapshot:", error);
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };
  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)} hrs`;
  };

  // Calculate warning thresholds
  const getUninvoicedWarningLevel = () => {
    if (uninvoicedAmount <= 0) return null;
    const invoicedTotal = invoiceTotals?.totalInvoiced || 0;

    // High uninvoiced: over $1000 or over 50% of what's been invoiced
    if (uninvoicedAmount > 1000 || invoicedTotal > 0 && uninvoicedAmount > invoicedTotal * 0.5) {
      return "high";
    }
    // Medium: over $500 or over 25% of invoiced
    if (uninvoicedAmount > 500 || invoicedTotal > 0 && uninvoicedAmount > invoicedTotal * 0.25) {
      return "medium";
    }
    return null;
  };
  const uninvoicedWarning = getUninvoicedWarningLevel();
  if (loading) {
    return <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Consumption Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>;
  }
  const hasExpenses = budgetData && (budgetData.dollars_consumed > 0 || budgetData.hours_consumed > 0);
  const hasInvoices = invoiceTotals && invoiceTotals.totalInvoiced > 0;
  const hasData = hasExpenses || hasInvoices || uninvoicedAmount > 0;
  if (!hasData) {
    return <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Consumption Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 text-center py-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Expenses and invoices will appear here once recorded.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Consumption Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expensed Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Expensed
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {formatCurrency(budgetData?.dollars_consumed || 0)}
                </p>
                <p className="text-xs text-muted-foreground">expensed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {formatHours(budgetData?.hours_consumed || 0)}
                </p>
                <p className="text-xs text-muted-foreground">logged</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Invoiced Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Invoiced
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Invoiced</span>
              <span className="font-medium">
                {formatCurrency(invoiceTotals?.totalInvoiced || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatCurrency(invoiceTotals?.totalPaid || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className={`font-medium ${(invoiceTotals?.outstanding || 0) > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                {formatCurrency(invoiceTotals?.outstanding || 0)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Uninvoiced Section with Warning */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Uninvoiced Expenses</span>
            </div>
            <span className={`text-sm font-medium ${uninvoicedWarning === "high" ? "text-destructive" : uninvoicedWarning === "medium" ? "text-amber-600 dark:text-amber-400" : uninvoicedAmount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {formatCurrency(uninvoicedAmount)}
            </span>
          </div>

          {/* Warning for high uninvoiced */}
          {uninvoicedWarning === "high"}
          {uninvoicedWarning === "medium" && <Alert className="py-2 border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-600 dark:text-amber-400">
                Uninvoiced expenses accumulating. Review and invoice when ready.
              </AlertDescription>
            </Alert>}
        </div>
      </CardContent>
    </Card>;
}
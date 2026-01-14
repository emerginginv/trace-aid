import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, TrendingUp, CheckCircle } from "lucide-react";
import type { Finance, Invoice } from "@/hooks/useCaseFinances";

interface FinancesSummaryCardsProps {
  finances: Finance[];
  invoices: Invoice[];
  retainerTotal: number;
}

export function FinancesSummaryCards({ finances, invoices, retainerTotal }: FinancesSummaryCardsProps) {
  const timeFinances = finances.filter((f) => f.finance_type === "time");
  const expenseFinances = finances.filter((f) => f.finance_type === "expense");

  const timeMetrics = timeFinances.reduce(
    (acc, curr) => ({
      totalHours: acc.totalHours + (curr.hours || 0),
      totalAmount: acc.totalAmount + Number(curr.amount),
    }),
    { totalHours: 0, totalAmount: 0 }
  );

  const expenseTotal = expenseFinances.reduce((sum, f) => sum + Number(f.amount), 0);
  const invoiceTotal = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  
  const billableUninvoiced = finances
    .filter(f => (f.finance_type === 'time' || f.finance_type === 'expense') && f.status === 'approved')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{timeMetrics.totalHours.toFixed(2)} hrs</div>
          <p className="text-xs text-muted-foreground">${timeMetrics.totalAmount.toFixed(2)} value</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${expenseTotal.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{expenseFinances.length} entries</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Billable (Uninvoiced)</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${billableUninvoiced.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Ready for invoicing</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${invoiceTotal.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default FinancesSummaryCards;

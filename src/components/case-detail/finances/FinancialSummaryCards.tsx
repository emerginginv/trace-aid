import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import type { Invoice } from "@/hooks/useCaseFinances";

interface FinancialSummaryCardsProps {
  invoices: Invoice[];
  retainerTotal: number;
  invoiceTotal: number;
}

function calculateInvoiceMetrics(invoices: Invoice[]) {
  const unpaidInvoices = invoices.filter(inv => 
    inv.status === "pending" || inv.status === "sent" || inv.status === "partial" || inv.status === "overdue"
  );
  
  const unpaidCount = unpaidInvoices.length;
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  
  const overdueInvoices = invoices.filter(inv => inv.status === "overdue");
  const overdueCount = overdueInvoices.length;
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

  return {
    unpaidCount,
    unpaidTotal,
    overdueCount,
    overdueTotal,
  };
}

export function FinancialSummaryCards({ invoices, retainerTotal, invoiceTotal }: FinancialSummaryCardsProps) {
  const metrics = calculateInvoiceMetrics(invoices);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Retainer</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${retainerTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.unpaidCount}</div>
            <p className="text-xs text-muted-foreground">${metrics.unpaidTotal.toFixed(2)} outstanding</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">${invoiceTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {metrics.overdueCount > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-500 mb-1">
                  {metrics.overdueCount} {metrics.overdueCount === 1 ? 'invoice is' : 'invoices are'} overdue
                </h3>
                <p className="text-sm text-muted-foreground">
                  Total outstanding: <span className="font-bold text-red-500">${metrics.overdueTotal.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default FinancialSummaryCards;

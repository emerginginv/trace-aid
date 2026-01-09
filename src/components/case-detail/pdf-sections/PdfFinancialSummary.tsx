import { format } from "date-fns";
import { DollarSign, Clock, Receipt, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PdfFinancialSummaryProps {
  timeEntries: any[];
  expenses: any[];
  invoices: any[];
}

export function PdfFinancialSummary({ timeEntries, expenses, invoices }: PdfFinancialSummaryProps) {
  const totalTimeAmount = timeEntries.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalTimeHours = timeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);
  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.total_paid || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  if (timeEntries.length === 0 && expenses.length === 0 && invoices.length === 0) {
    return null;
  }

  return (
    <div className="pdf-section mb-6 page-break-before">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        Financial Summary
      </h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Time Entries</p>
          <p className="font-semibold">{formatCurrency(totalTimeAmount)}</p>
          <p className="text-xs text-muted-foreground">{totalTimeHours.toFixed(1)} hrs</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <Receipt className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="font-semibold">{formatCurrency(totalExpenseAmount)}</p>
          <p className="text-xs text-muted-foreground">{expenses.length} items</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Invoiced</p>
          <p className="font-semibold">{formatCurrency(totalInvoiced)}</p>
          <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg text-center border border-emerald-200">
          <DollarSign className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Collected</p>
          <p className="font-semibold text-emerald-700">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-muted-foreground">
            {totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(0) : 0}% collected
          </p>
        </div>
      </div>
      
      {/* Time Entries Table */}
      {timeEntries.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Entries ({timeEntries.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20 text-right">Hours</TableHead>
                <TableHead className="w-24 text-right">Rate</TableHead>
                <TableHead className="w-24 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.slice(0, 15).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs">
                    {format(new Date(entry.date), "MM/dd/yy")}
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[200px]">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {entry.hours?.toFixed(2) || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {entry.hourly_rate ? formatCurrency(entry.hourly_rate) : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {formatCurrency(entry.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {timeEntries.length > 15 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-xs text-center text-muted-foreground">
                    ... and {timeEntries.length - 15} more entries
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Expenses Table */}
      {expenses.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses ({expenses.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-24 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.slice(0, 15).map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-xs">
                    {format(new Date(expense.date), "MM/dd/yy")}
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[200px]">
                    {expense.description}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {expense.category?.replace(/_/g, " ") || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length > 15 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-xs text-center text-muted-foreground">
                    ... and {expenses.length - 15} more expenses
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Invoices Table */}
      {invoices.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices ({invoices.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Invoice #</TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead className="w-24">Due Date</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24 text-right">Total</TableHead>
                <TableHead className="w-24 text-right">Paid</TableHead>
                <TableHead className="w-24 text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-xs font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(invoice.date), "MM/dd/yy")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {invoice.due_date ? format(new Date(invoice.due_date), "MM/dd/yy") : "-"}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {invoice.status}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCurrency(invoice.total_paid || 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {formatCurrency(invoice.balance_due || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

import { Calendar, Briefcase, DollarSign, Receipt, CheckCircle, Clock, Send, FileEdit, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface InvoiceCardData {
  id: string;
  invoice_number: string | null;
  case_number?: string;
  case_title?: string;
  date: string;
  due_date?: string | null;
  amount: number;
  total_paid?: number;
  balance_due?: number;
  status: string | null;
}

interface InvoiceCardProps {
  invoice: InvoiceCardData;
  onClick?: () => void;
  className?: string;
}

type InvoiceStatus = 'paid' | 'partial' | 'sent' | 'draft' | 'overdue';

function deriveInvoiceStatus(status: string | null, balanceDue?: number, dueDate?: string | null): InvoiceStatus {
  if (status === 'paid') return 'paid';
  if (status === 'partial') return 'partial';
  if (status === 'sent') {
    // Check if overdue
    if (dueDate && new Date(dueDate) < new Date() && (balanceDue ?? 0) > 0) {
      return 'overdue';
    }
    return 'sent';
  }
  return 'draft';
}

const invoiceStatusConfig: Record<InvoiceStatus, {
  label: string;
  bgColor: string;
  textColor: string;
  icon: React.ElementType;
}> = {
  paid: {
    label: 'Paid',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    icon: CheckCircle,
  },
  partial: {
    label: 'Partial',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: Clock,
  },
  sent: {
    label: 'Sent',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: Send,
  },
  draft: {
    label: 'Draft',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    icon: FileEdit,
  },
  overdue: {
    label: 'Overdue',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: AlertCircle,
  },
};

function InvoiceStatusPill({ status, className }: { status: InvoiceStatus; className?: string }) {
  const config = invoiceStatusConfig[status] || invoiceStatusConfig.draft;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function InvoiceCard({ invoice, onClick, className }: InvoiceCardProps) {
  const balanceDue = invoice.balance_due !== undefined 
    ? invoice.balance_due 
    : invoice.amount - (invoice.total_paid || 0);
  
  const displayStatus = deriveInvoiceStatus(invoice.status, balanceDue, invoice.due_date);

  return (
    <Card 
      className={cn(
        "p-4 hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Header: Invoice Number + Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-base leading-tight truncate flex-1">
          {invoice.invoice_number || "Draft Invoice"}
        </h3>
        <InvoiceStatusPill status={displayStatus} />
      </div>

      {/* Case row */}
      {invoice.case_number && (
        <div className="flex items-center gap-1.5 text-sm mb-2">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{invoice.case_number}</span>
          {invoice.case_title && (
            <span className="text-muted-foreground truncate">• {invoice.case_title}</span>
          )}
        </div>
      )}

      {/* Date row */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{format(new Date(invoice.date), "MMM d, yyyy")}</span>
        {invoice.due_date && (
          <span className="text-muted-foreground">
            (Due: {format(new Date(invoice.due_date), "MMM d")})
          </span>
        )}
      </div>

      {/* Total amount row */}
      <div className="flex items-center gap-1.5 text-sm mb-1">
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span>Total: ${invoice.amount.toFixed(2)}</span>
      </div>

      {/* Balance due row */}
      <div className="flex items-center gap-1.5 text-sm">
        <Receipt className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className={cn(
          "font-medium",
          balanceDue > 0 && displayStatus === 'overdue' && "text-destructive"
        )}>
          Balance: ${balanceDue.toFixed(2)}
        </span>
      </div>
    </Card>
  );
}

export default InvoiceCard;

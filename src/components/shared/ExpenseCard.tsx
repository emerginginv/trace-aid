import { Calendar, Briefcase, DollarSign, FileText, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface ExpenseCardData {
  id: string;
  item_type: string;
  notes: string | null;
  total: number;
  status: string;
  created_at: string;
  case_number?: string;
  case_title?: string;
  receipt_url?: string | null;
}

interface ExpenseCardProps {
  expense: ExpenseCardData;
  onClick?: () => void;
  className?: string;
}

const getStatusConfig = (status: string): { variant: "default" | "secondary" | "destructive" | "outline"; label: string } => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "secondary", label: "Pending" },
    approved: { variant: "default", label: "Approved" },
    declined: { variant: "destructive", label: "Declined" },
    committed: { variant: "outline", label: "Billed" },
  };
  return variants[status] || variants.pending;
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    mileage: "Mileage",
    equipment: "Equipment",
    meals: "Meals",
    lodging: "Lodging",
    supplies: "Supplies",
    other: "Other",
  };
  return labels[category] || category;
};

export function ExpenseCard({ expense, onClick, className }: ExpenseCardProps) {
  const statusConfig = getStatusConfig(expense.status);

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
      {/* Header: Category + Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-base leading-tight truncate flex-1 capitalize">
          {getCategoryLabel(expense.item_type)}
        </h3>
        <Badge variant={statusConfig.variant} className="shrink-0">
          {statusConfig.label}
        </Badge>
      </div>

      {/* Amount row */}
      <div className="flex items-center gap-1.5 text-sm mb-2">
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="font-medium">${expense.total.toFixed(2)}</span>
      </div>

      {/* Case row */}
      {expense.case_number && (
        <div className="flex items-center gap-1.5 text-sm mb-2">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{expense.case_number}</span>
          {expense.case_title && (
            <span className="text-muted-foreground truncate">• {expense.case_title}</span>
          )}
        </div>
      )}

      {/* Date row */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{format(new Date(expense.created_at), "MMM d, yyyy")}</span>
      </div>

      {/* Notes row */}
      {expense.notes && (
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{expense.notes}</span>
        </div>
      )}

      {/* Receipt indicator */}
      {expense.receipt_url && (
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
          <Receipt className="h-3 w-3" />
          Receipt attached
        </div>
      )}
    </Card>
  );
}

export default ExpenseCard;

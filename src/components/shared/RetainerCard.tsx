import { Calendar, FileText, Receipt, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface RetainerCardData {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
  invoice_id: string | null;
}

interface RetainerCardProps {
  retainer: RetainerCardData;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
  className?: string;
}

export function RetainerCard({ 
  retainer, 
  onClick, 
  className 
}: RetainerCardProps) {
  const isDeduction = retainer.amount < 0;
  const isLinkedToInvoice = !!retainer.invoice_id;

  return (
    <Card 
      className={cn(
        "p-4 hover:shadow-md transition-shadow",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header: Amount + Type Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {isDeduction ? (
            <ArrowDownCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          ) : (
            <ArrowUpCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          )}
          <h3 className={cn(
            "font-semibold text-lg leading-tight",
            isDeduction ? "text-destructive" : "text-green-600"
          )}>
            {isDeduction ? '-' : '+'}${Math.abs(retainer.amount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </h3>
        </div>
        <Badge variant={isDeduction ? "destructive" : "default"} className="shrink-0">
          {isDeduction ? "Deduction" : "Deposit"}
        </Badge>
      </div>

      {/* Date row */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{format(new Date(retainer.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
      </div>

      {/* Note row */}
      {retainer.note && (
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-2">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{retainer.note}</span>
        </div>
      )}

      {/* Invoice link indicator */}
      {isLinkedToInvoice && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t mt-2">
          <Receipt className="h-3 w-3" />
          Applied to invoice
        </div>
      )}
    </Card>
  );
}

export default RetainerCard;

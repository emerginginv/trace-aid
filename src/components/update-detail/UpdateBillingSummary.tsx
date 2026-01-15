import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, FileText } from "lucide-react";

interface BillingEntry {
  id: string;
  description: string;
  amount: number;
  hours: number | null;
  hourly_rate: number | null;
  finance_type: string;
  date: string;
  status: string | null;
  category: string | null;
}

interface UpdateBillingSummaryProps {
  entries: BillingEntry[];
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const UpdateBillingSummary = ({ entries }: UpdateBillingSummaryProps) => {
  if (entries.length === 0) return null;

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

  // Count by status
  const statusCounts = entries.reduce((acc, e) => {
    const status = e.status || "pending";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusSummary = Object.entries(statusCounts)
    .map(([status, count]) => `${count} ${status}`)
    .join(", ");

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {totalHours > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">{totalHours.toFixed(1)} hrs</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-medium">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
          </div>
          <span className="text-muted-foreground capitalize">
            Status: {statusSummary}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

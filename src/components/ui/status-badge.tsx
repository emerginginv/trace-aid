import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
  viewed: { label: "Viewed", variant: "outline" },
  paid: { label: "Paid", variant: "default" },
  partial: { label: "Partial", variant: "outline" },
  overdue: { label: "Overdue", variant: "destructive" },
  unpaid: { label: "Unpaid", variant: "outline" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unpaid;
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(
        status === "paid" && "bg-green-500 hover:bg-green-600",
        status === "sent" && "bg-blue-500 hover:bg-blue-600",
        status === "viewed" && "bg-indigo-500 hover:bg-indigo-600 text-white",
        status === "partial" && "bg-yellow-500 hover:bg-yellow-600",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

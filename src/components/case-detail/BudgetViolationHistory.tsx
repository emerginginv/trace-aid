import { format } from "date-fns";
import { 
  AlertTriangle, 
  Ban, 
  Info, 
  Clock,
  FileText 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetViolations, BudgetViolation } from "@/hooks/useBudgetViolations";
import { formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";

interface BudgetViolationHistoryProps {
  caseId: string;
  limit?: number;
}

function ViolationIcon({ type }: { type: string }) {
  switch (type) {
    case "blocked":
      return <Ban className="h-4 w-4 text-destructive" />;
    case "exceeded":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    default:
      return <Info className="h-4 w-4 text-yellow-600" />;
  }
}

function ViolationBadge({ type, blocked }: { type: string; blocked: boolean }) {
  if (blocked) {
    return (
      <Badge variant="destructive" className="text-xs">
        Blocked
      </Badge>
    );
  }
  
  switch (type) {
    case "exceeded":
      return (
        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Exceeded
        </Badge>
      );
    case "warning":
      return (
        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Warning
        </Badge>
      );
    default:
      return null;
  }
}

function ViolationItem({ violation }: { violation: BudgetViolation }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="mt-0.5">
        <ViolationIcon type={violation.violationType} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <ViolationBadge 
            type={violation.violationType} 
            blocked={violation.actionBlocked} 
          />
          <span className="text-xs text-muted-foreground">
            {format(new Date(violation.createdAt), "MMM d, h:mm a")}
          </span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {violation.budgetScope === "service" ? "Service budget" : "Case budget"}
          {violation.actionAttempted && (
            <span> • {violation.actionAttempted}</span>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-3">
          {violation.hoursAtViolation !== null && violation.hoursLimit !== null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatBudgetHours(violation.hoursAtViolation)} / {formatBudgetHours(violation.hoursLimit)}
            </span>
          )}
          {violation.amountAtViolation !== null && violation.amountLimit !== null && (
            <span>
              {formatBudgetCurrency(violation.amountAtViolation)} / {formatBudgetCurrency(violation.amountLimit)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function BudgetViolationHistory({ caseId, limit = 10 }: BudgetViolationHistoryProps) {
  const { violations, loading, error } = useBudgetViolations(caseId, limit);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Budget Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Budget Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load events</p>
        </CardContent>
      </Card>
    );
  }

  if (violations.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Budget Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No budget events recorded
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Budget Events
          <Badge variant="secondary" className="ml-auto text-xs">
            {violations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-4">
          {violations.map((violation) => (
            <ViolationItem key={violation.id} violation={violation} />
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

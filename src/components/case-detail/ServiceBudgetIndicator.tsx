import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, DollarSign, AlertTriangle, Ban } from "lucide-react";
import { ServiceBudgetStatus } from "@/hooks/useServiceBudgetLimits";
import { formatBudgetCurrency, formatBudgetHours, getBudgetStatusStyles } from "@/lib/budgetUtils";

interface ServiceBudgetIndicatorProps {
  status: ServiceBudgetStatus | null;
  compact?: boolean;
}

export function ServiceBudgetIndicator({ status, compact = false }: ServiceBudgetIndicatorProps) {
  if (!status) return null;

  const hoursStyles = status.max_hours ? getBudgetStatusStyles(status.hours_utilization_pct) : null;
  const amountStyles = status.max_amount ? getBudgetStatusStyles(status.amount_utilization_pct) : null;

  const isExceeded = status.is_hours_exceeded || status.is_amount_exceeded;
  const isWarning = status.is_hours_warning || status.is_amount_warning;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isExceeded ? "destructive" : isWarning ? "secondary" : "outline"}
              className="text-xs cursor-help"
            >
              {isExceeded && <Ban className="h-3 w-3 mr-1" />}
              {isWarning && !isExceeded && <AlertTriangle className="h-3 w-3 mr-1" />}
              {status.max_hours && `${Math.round(status.hours_utilization_pct)}%`}
              {status.max_hours && status.max_amount && " / "}
              {status.max_amount && `${Math.round(status.amount_utilization_pct)}%`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-medium">{status.service_name} Budget</p>
              {status.max_hours && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Hours:</span>
                  <span className={hoursStyles?.textClass}>
                    {formatBudgetHours(status.hours_consumed)} / {formatBudgetHours(status.max_hours)}
                  </span>
                </div>
              )}
              {status.max_amount && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className={amountStyles?.textClass}>
                    {formatBudgetCurrency(status.amount_consumed)} / {formatBudgetCurrency(status.max_amount)}
                  </span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{status.service_name} Budget</span>
        {isExceeded && (
          <Badge variant="destructive" className="text-xs">
            <Ban className="h-3 w-3 mr-1" />
            Exceeded
          </Badge>
        )}
        {isWarning && !isExceeded && (
          <Badge variant="secondary" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        )}
      </div>

      {status.max_hours && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              Hours
            </span>
            <span className={hoursStyles?.textClass}>
              {formatBudgetHours(status.hours_consumed)} / {formatBudgetHours(status.max_hours)}
              <span className="ml-1">({Math.round(status.hours_utilization_pct)}%)</span>
            </span>
          </div>
          <Progress 
            value={Math.min(status.hours_utilization_pct, 100)} 
            className="h-1.5" 
          />
        </div>
      )}

      {status.max_amount && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Amount
            </span>
            <span className={amountStyles?.textClass}>
              {formatBudgetCurrency(status.amount_consumed)} / {formatBudgetCurrency(status.max_amount)}
              <span className="ml-1">({Math.round(status.amount_utilization_pct)}%)</span>
            </span>
          </div>
          <Progress 
            value={Math.min(status.amount_utilization_pct, 100)} 
            className="h-1.5" 
          />
        </div>
      )}
    </div>
  );
}

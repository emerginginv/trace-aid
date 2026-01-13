import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface LockedRecordIndicatorProps {
  lockedAt: string | null;
  lockedReason?: string | null;
  variant?: "badge" | "icon" | "inline";
  className?: string;
}

export function LockedRecordIndicator({ 
  lockedAt, 
  lockedReason,
  variant = "badge",
  className = ""
}: LockedRecordIndicatorProps) {
  if (!lockedAt) return null;
  
  const lockedDate = new Date(lockedAt);
  const tooltipContent = (
    <div className="text-xs">
      <p className="font-medium">Record Locked</p>
      <p className="text-muted-foreground">
        Locked on {format(lockedDate, "MMM d, yyyy 'at' h:mm a")}
      </p>
      {lockedReason && (
        <p className="text-muted-foreground mt-1">{lockedReason}</p>
      )}
    </div>
  );
  
  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Lock className={`h-4 w-4 text-muted-foreground cursor-help ${className}`} />
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (variant === "inline") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help ${className}`}>
              <Lock className="h-3 w-3" />
              Invoiced
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`gap-1 cursor-help ${className}`}>
            <Lock className="h-3 w-3" />
            Locked
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

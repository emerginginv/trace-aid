import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export function AIBadge({ className, showTooltip = true }: AIBadgeProps) {
  const badge = (
    <Badge variant="secondary" className={`text-xs gap-1 ${className || ""}`}>
      <Sparkles className="h-3 w-3" />
      AI
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>
            This content was generated using artificial intelligence and must be
            reviewed before use.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

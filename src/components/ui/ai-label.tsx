import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AI_TOOLTIP_MESSAGE } from "./ai-button";

interface AILabelProps {
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  showTooltip?: boolean;
}

export function AILabel({
  children,
  className,
  showIcon = true,
  showTooltip = true,
}: AILabelProps) {
  const label = (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[hsl(270,85%,55%)] dark:text-[hsl(270,85%,65%)] font-medium",
        className
      )}
    >
      {showIcon && <Sparkles className="h-3.5 w-3.5" />}
      {children || "AI-Assisted"}
    </span>
  );

  if (!showTooltip) {
    return label;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{AI_TOOLTIP_MESSAGE}</p>
      </TooltipContent>
    </Tooltip>
  );
}

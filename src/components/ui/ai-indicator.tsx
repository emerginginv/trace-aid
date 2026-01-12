import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AI_TOOLTIP_MESSAGE } from "./ai-button";

interface AIIndicatorProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: "h-3 w-3",
  default: "h-4 w-4",
  lg: "h-5 w-5",
};

export function AIIndicator({ className, size = "default" }: AIIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center justify-center text-[hsl(270,85%,55%)] dark:text-[hsl(270,85%,65%)]",
              className
            )}
          >
            <Sparkles className={sizeClasses[size]} />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{AI_TOOLTIP_MESSAGE}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

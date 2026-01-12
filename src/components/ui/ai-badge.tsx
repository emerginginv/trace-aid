import * as React from "react";
import { Sparkles } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AI_TOOLTIP_MESSAGE } from "./ai-button";

const aiBadgeVariants = cva(
  "inline-flex items-center gap-1 font-medium rounded-full transition-colors [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[hsl(280,85%,55%)] to-[hsl(260,85%,50%)] text-white shadow-sm",
        subtle:
          "bg-[hsl(270,85%,95%)] dark:bg-[hsl(270,30%,20%)] text-[hsl(270,85%,45%)] dark:text-[hsl(270,85%,70%)]",
        outline:
          "border-2 border-[hsl(270,85%,55%)] text-[hsl(270,85%,55%)] dark:text-[hsl(270,85%,65%)] bg-transparent",
      },
      size: {
        sm: "px-2 py-0.5 text-2xs [&_svg]:h-2.5 [&_svg]:w-2.5",
        default: "px-2.5 py-0.5 text-xs [&_svg]:h-3 [&_svg]:w-3",
        lg: "px-3 py-1 text-sm [&_svg]:h-3.5 [&_svg]:w-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface AIBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof aiBadgeVariants> {
  showTooltip?: boolean;
  showIcon?: boolean;
}

export function AIBadge({
  className,
  variant,
  size,
  showTooltip = true,
  showIcon = true,
  ...props
}: AIBadgeProps) {
  const badge = (
    <div className={cn(aiBadgeVariants({ variant, size }), className)} {...props}>
      {showIcon && <Sparkles />}
      AI
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{AI_TOOLTIP_MESSAGE}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

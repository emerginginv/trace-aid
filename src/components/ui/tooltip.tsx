import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground",
      "shadow-md animate-in fade-in-0 zoom-in-95",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      "max-w-xs",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Enhanced Tooltip with Delay (0.3s delay for accessibility)
interface DelayedTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
}

function DelayedTooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 300,
  className,
}: DelayedTooltipProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

// Help Tooltip for contextual help icons
interface HelpTooltipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

function HelpTooltip({ content, side = "top" }: HelpTooltipProps) {
  return (
    <DelayedTooltip content={content} side={side}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full w-4 h-4 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Help"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3 h-3"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-6 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.293 5.293a1 1 0 1 1 .99 1.667c-.459.134-.783.56-.783 1.04a.75.75 0 0 0 1.5 0 .25.25 0 0 1 .228-.25 2.5 2.5 0 1 0-3.435-2.957.75.75 0 0 0 1.5.5Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </DelayedTooltip>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, DelayedTooltip, HelpTooltip };

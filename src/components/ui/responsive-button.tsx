import * as React from "react";
import { Button, ButtonProps } from "./button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./tooltip";

interface ResponsiveButtonProps extends ButtonProps {
  icon: React.ReactNode;
  label: string;
  showLabelBreakpoint?: "sm" | "md" | "lg" | "xl";
  tooltipSide?: "top" | "bottom" | "left" | "right";
  hideTooltipOnDesktop?: boolean;
}

/**
 * ResponsiveButton - A button that displays icon-only on mobile and icon+text on larger screens.
 * 
 * This component establishes the global standard for mobile-responsive buttons:
 * - Mobile (< breakpoint): Icon only with tooltip showing the label
 * - Desktop (>= breakpoint): Icon + text label
 * 
 * @example
 * <ResponsiveButton
 *   icon={<Download className="h-4 w-4" />}
 *   label="Export"
 *   variant="outline"
 *   size="sm"
 * />
 */
export const ResponsiveButton = React.forwardRef<HTMLButtonElement, ResponsiveButtonProps>(
  (
    {
      icon,
      label,
      showLabelBreakpoint = "sm",
      tooltipSide = "bottom",
      hideTooltipOnDesktop = true,
      className,
      size = "sm",
      ...props
    },
    ref
  ) => {
    const breakpointClasses = {
      sm: "sm:px-3",
      md: "md:px-3",
      lg: "lg:px-3",
      xl: "xl:px-3",
    };

    const labelClasses = {
      sm: "hidden sm:inline",
      md: "hidden md:inline",
      lg: "hidden lg:inline",
      xl: "hidden xl:inline",
    };

    const tooltipHideClasses = {
      sm: "sm:hidden",
      md: "md:hidden",
      lg: "lg:hidden",
      xl: "xl:hidden",
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              size={size}
              className={cn(
                "px-2", // Mobile: icon-only padding
                breakpointClasses[showLabelBreakpoint], // Desktop: text padding
                className
              )}
              {...props}
            >
              <span className="shrink-0">{icon}</span>
              <span className={cn("ml-2", labelClasses[showLabelBreakpoint])}>
                {label}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={tooltipSide}
            className={hideTooltipOnDesktop ? tooltipHideClasses[showLabelBreakpoint] : undefined}
          >
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

ResponsiveButton.displayName = "ResponsiveButton";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AI_TOOLTIP_MESSAGE = "This feature uses artificial intelligence and requires human review.";

const aiButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 rounded-lg",
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-xs gap-1.5 [&_svg]:size-3.5",
        default: "h-10 px-4 text-sm gap-2 [&_svg]:size-4",
        lg: "h-12 px-5 text-base gap-2 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface AIButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof aiButtonVariants> {
  asChild?: boolean;
  showIcon?: boolean;
  loading?: boolean;
  showTooltip?: boolean;
}

const AIButton = React.forwardRef<HTMLButtonElement, AIButtonProps>(
  (
    {
      className,
      size,
      asChild = false,
      showIcon = true,
      loading = false,
      showTooltip = true,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const button = (
      <Comp
        className={cn(
          aiButtonVariants({ size, className }),
          "bg-gradient-to-br from-[hsl(280,85%,55%)] to-[hsl(260,85%,50%)] text-white",
          "shadow-lg shadow-[hsl(270,85%,55%)/0.25]",
          "hover:from-[hsl(280,88%,60%)] hover:to-[hsl(260,88%,55%)]",
          "hover:shadow-[hsl(270,85%,55%)/0.4] hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-[hsl(270,85%,55%)/0.3]",
          "focus-visible:ring-[hsl(270,85%,55%)]"
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : showIcon ? (
          <Sparkles />
        ) : null}
        {children}
      </Comp>
    );

    if (!showTooltip) {
      return button;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{AI_TOOLTIP_MESSAGE}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
AIButton.displayName = "AIButton";

export { AIButton, aiButtonVariants, AI_TOOLTIP_MESSAGE };

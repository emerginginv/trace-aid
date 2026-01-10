import { useState } from "react";
import { HelpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HelpCenterSheet } from "./HelpCenterSheet";

interface ContextualHelpProps {
  /** The related_feature value to match in help_articles */
  feature: string;
  /** Display variant */
  variant?: "icon" | "link" | "inline";
  /** Custom label for link variant */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size of the icon */
  size?: "sm" | "md";
}

/**
 * Contextual help component that opens the Help Center to a specific article
 * based on the related_feature field.
 * 
 * Usage:
 * <ContextualHelp feature="case_manager_assignment" />
 * <ContextualHelp feature="case_budgets" variant="link" label="Learn about budgets" />
 */
export function ContextualHelp({
  feature,
  variant = "icon",
  label = "Learn more",
  className,
  size = "sm",
}: ContextualHelpProps) {
  const [open, setOpen] = useState(false);

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (variant === "link") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 hover:underline transition-colors",
            className
          )}
        >
          <span>{label}</span>
          <ExternalLink className="h-3 w-3" />
        </button>
        <HelpCenterSheet 
          open={open} 
          onOpenChange={setOpen} 
          initialFeature={feature}
        />
      </>
    );
  }

  if (variant === "inline") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
            className
          )}
        >
          <HelpCircle className={iconSize} />
          <span>{label}</span>
        </button>
        <HelpCenterSheet 
          open={open} 
          onOpenChange={setOpen} 
          initialFeature={feature}
        />
      </>
    );
  }

  // Default: icon variant
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn(
          "h-6 w-6 text-muted-foreground hover:text-foreground",
          size === "md" && "h-8 w-8",
          className
        )}
      >
        <HelpCircle className={iconSize} />
        <span className="sr-only">Help</span>
      </Button>
      <HelpCenterSheet 
        open={open} 
        onOpenChange={setOpen} 
        initialFeature={feature}
      />
    </>
  );
}

/**
 * Helper wrapper for section headers with contextual help
 */
interface HelpfulHeaderProps {
  children: React.ReactNode;
  feature: string;
  className?: string;
}

export function HelpfulHeader({ children, feature, className }: HelpfulHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
      <ContextualHelp feature={feature} />
    </div>
  );
}

/**
 * Empty state with contextual help link
 */
interface HelpfulEmptyStateProps {
  title: string;
  description: string;
  feature: string;
  helpLabel?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function HelpfulEmptyState({
  title,
  description,
  feature,
  helpLabel = "Learn how to get started",
  icon,
  action,
  className,
}: HelpfulEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-12 px-4",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground/40">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      <div className="flex flex-col items-center gap-3">
        {action}
        <ContextualHelp 
          feature={feature} 
          variant="link" 
          label={helpLabel}
        />
      </div>
    </div>
  );
}

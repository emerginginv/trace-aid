import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "default",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: "py-8 px-4",
      icon: "h-10 w-10 mb-3",
      iconWrapper: "h-16 w-16",
      title: "text-base font-medium",
      description: "text-sm max-w-xs",
    },
    default: {
      container: "py-12 px-6",
      icon: "h-12 w-12 mb-4",
      iconWrapper: "h-20 w-20",
      title: "text-lg font-semibold",
      description: "text-sm max-w-sm",
    },
    lg: {
      container: "py-16 px-8",
      icon: "h-16 w-16 mb-6",
      iconWrapper: "h-24 w-24",
      title: "text-xl font-semibold",
      description: "text-base max-w-md",
    },
  };

  const styles = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        styles.container,
        className
      )}
      role="status"
      aria-label="Empty state"
    >
      {Icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted/50",
            styles.iconWrapper
          )}
          aria-hidden="true"
        >
          <Icon className={cn("text-muted-foreground", styles.icon)} strokeWidth={1.5} />
        </div>
      )}
      <h3 className={cn(styles.title, "text-foreground mb-2")}>{title}</h3>
      {description && (
        <p className={cn(styles.description, "text-muted-foreground mb-6")}>{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick} variant={action.variant || "default"} size={size === "sm" ? "sm" : "default"}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size={size === "sm" ? "sm" : "default"}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
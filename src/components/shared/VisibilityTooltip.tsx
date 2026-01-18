import { Eye } from "lucide-react";
import { DelayedTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Role = 'admin' | 'manager' | 'investigator' | 'vendor';

interface VisibilityTooltipProps {
  /** Array of roles that can see this content */
  visibleTo: Role[];
  /** The content to wrap with the visibility indicator */
  children: React.ReactNode;
  /** Whether to show the eye icon inline */
  showIcon?: boolean;
  /** Additional class name for the wrapper */
  className?: string;
  /** Side of the tooltip */
  side?: "top" | "right" | "bottom" | "left";
}

const roleConfig: Record<Role, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  manager: { label: "Manager", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  investigator: { label: "Investigator", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  vendor: { label: "Vendor", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
};

/**
 * VisibilityTooltip - Shows "Who can see this?" information with role badges
 * 
 * Use this component to indicate which roles have access to specific data or features.
 * Hovering reveals a tooltip with color-coded role badges.
 */
export function VisibilityTooltip({
  visibleTo,
  children,
  showIcon = true,
  className,
  side = "top",
}: VisibilityTooltipProps) {
  const tooltipContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Eye className="h-3 w-3" />
        <span>Who can see this:</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {visibleTo.map((role) => (
          <Badge
            key={role}
            variant="secondary"
            className={cn("text-xs px-1.5 py-0", roleConfig[role].color)}
          >
            {roleConfig[role].label}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <DelayedTooltip content={tooltipContent} side={side}>
      <span className={cn("inline-flex items-center gap-1", className)}>
        {children}
        {showIcon && (
          <Eye className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
        )}
      </span>
    </DelayedTooltip>
  );
}

import { AlertTriangle, Info, ShieldAlert, Lightbulb, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type WarningSeverity = 'info' | 'caution' | 'critical';

export interface ProactiveWarningProps {
  title: string;
  consequence: string;
  guidance?: string;
  severity?: WarningSeverity;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

const severityConfig: Record<WarningSeverity, {
  containerClass: string;
  iconClass: string;
  Icon: typeof AlertTriangle;
}> = {
  info: {
    containerClass: "bg-blue-50/80 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50",
    iconClass: "text-blue-600 dark:text-blue-400",
    Icon: Info,
  },
  caution: {
    containerClass: "bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50",
    iconClass: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  critical: {
    containerClass: "bg-amber-50/80 border-red-300 border-2 dark:bg-amber-950/30 dark:border-red-700",
    iconClass: "text-red-600 dark:text-red-400",
    Icon: ShieldAlert,
  },
};

export function ProactiveWarning({
  title,
  consequence,
  guidance,
  severity = 'caution',
  action,
  dismissible = false,
  onDismiss,
  className,
  compact = false,
}: ProactiveWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const config = severityConfig[severity];
  const { Icon } = config;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role={severity === 'critical' ? 'alert' : 'status'}
      aria-live="polite"
      className={cn(
        "relative rounded-lg border p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300",
        config.containerClass,
        compact && "p-3",
        className
      )}
    >
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className={cn("flex gap-3", compact && "gap-2")}>
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconClass, compact && "h-4 w-4")} />
        
        <div className={cn("flex-1 space-y-2", compact && "space-y-1", dismissible && "pr-6")}>
          <h4 className={cn("font-medium text-foreground", compact && "text-sm")}>
            {title}
          </h4>
          
          <p className={cn("text-sm text-muted-foreground", compact && "text-xs")}>
            {consequence}
          </p>

          {guidance && (
            <div className={cn("flex items-start gap-2 pt-1", compact && "pt-0.5")}>
              <Lightbulb className={cn("h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400", compact && "h-3 w-3")} />
              <p className={cn("text-sm text-muted-foreground", compact && "text-xs")}>
                {guidance}
              </p>
            </div>
          )}

          {action && (
            <div className="pt-2">
              <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                onClick={action.onClick}
                className="text-xs"
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline warning for form fields - more compact and subtle
 */
export interface InlineWarningProps {
  message: string;
  severity?: 'info' | 'caution';
  className?: string;
}

export function InlineWarning({ message, severity = 'caution', className }: InlineWarningProps) {
  const isInfo = severity === 'info';
  
  return (
    <p
      role="status"
      className={cn(
        "text-xs flex items-center gap-1.5 mt-1.5",
        isInfo ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400",
        className
      )}
    >
      {isInfo ? (
        <Info className="h-3 w-3 shrink-0" />
      ) : (
        <AlertTriangle className="h-3 w-3 shrink-0" />
      )}
      {message}
    </p>
  );
}

/**
 * Pre-action validation warning - blocks or warns before action
 */
export interface ValidationWarningProps {
  title: string;
  message: string;
  type: 'blocking' | 'warning';
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function ValidationWarning({ title, message, type, action, className }: ValidationWarningProps) {
  const isBlocking = type === 'blocking';
  
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-4",
        isBlocking 
          ? "bg-red-50/80 border-red-200 dark:bg-red-950/30 dark:border-red-800/50" 
          : "bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50",
        className
      )}
    >
      <div className="flex gap-3">
        <ShieldAlert className={cn(
          "h-5 w-5 shrink-0",
          isBlocking ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
        )} />
        
        <div className="flex-1 space-y-2">
          <h4 className="font-medium text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground">{message}</p>
          
          {action && !isBlocking && (
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="mt-2 text-xs"
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

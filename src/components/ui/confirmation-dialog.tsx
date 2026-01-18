import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Info, CheckCircle, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Additional consequence explanation - explains what will happen */
  consequence?: string;
  /** Corrective guidance - how to avoid or what to do instead */
  guidance?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive" | "warning" | "success";
  icon?: React.ReactNode;
  loading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  consequence,
  guidance,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  icon,
  loading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const iconMap = {
    default: <Info className="h-5 w-5 text-primary" />,
    destructive: <XCircle className="h-5 w-5 text-destructive" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    success: <CheckCircle className="h-5 w-5 text-success" />,
  };

  const buttonStyles = {
    default: "bg-primary hover:bg-primary/90",
    destructive: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    warning: "bg-warning hover:bg-warning/90 text-warning-foreground",
    success: "bg-success hover:bg-success/90 text-success-foreground",
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onKeyDown={handleKeyDown}>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div 
              className={cn(
                "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full",
                variant === "destructive" && "bg-destructive/10",
                variant === "warning" && "bg-warning/10",
                variant === "success" && "bg-success/10",
                variant === "default" && "bg-primary/10"
              )}
              aria-hidden="true"
            >
              {icon || iconMap[variant]}
            </div>
            <div className="flex-1 min-w-0">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
              
              {/* Consequence section */}
              {consequence && (
                <div className="mt-3 p-3 rounded-md bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground">{consequence}</p>
                </div>
              )}
              
              {/* Guidance section */}
              {guidance && (
                <div className="mt-3 flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                  <p className="text-sm text-muted-foreground">{guidance}</p>
                </div>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(buttonStyles[variant], "min-w-[100px]")}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg 
                  className="animate-spin h-4 w-4" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" cy="12" r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Quick confirmation hook for common use cases
export function useConfirmation() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    consequence?: string;
    guidance?: string;
    variant: "default" | "destructive" | "warning" | "success";
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    consequence: undefined,
    guidance: undefined,
    variant: "default",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = React.useCallback(
    (options: {
      title: string;
      description: string;
      consequence?: string;
      guidance?: string;
      variant?: "default" | "destructive" | "warning" | "success";
      confirmLabel?: string;
      cancelLabel?: string;
    }) => {
      return new Promise<boolean>((resolve) => {
        setState({
          open: true,
          title: options.title,
          description: options.description,
          consequence: options.consequence,
          guidance: options.guidance,
          variant: options.variant || "default",
          confirmLabel: options.confirmLabel || "Confirm",
          cancelLabel: options.cancelLabel || "Cancel",
          onConfirm: () => {
            resolve(true);
            setState((prev) => ({ ...prev, open: false }));
          },
          onCancel: () => {
            resolve(false);
            setState((prev) => ({ ...prev, open: false }));
          },
        });
      });
    },
    []
  );

  const ConfirmDialog = React.useCallback(
    () => (
      <ConfirmationDialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) {
            state.onCancel();
          }
          setState((prev) => ({ ...prev, open }));
        }}
        title={state.title}
        description={state.description}
        consequence={state.consequence}
        guidance={state.guidance}
        variant={state.variant}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        onConfirm={state.onConfirm}
      />
    ),
    [state]
  );

  return { confirm, ConfirmDialog };
}

import * as React from "react";
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, FileWarning, HelpCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type ErrorType = "generic" | "network" | "server" | "notFound" | "validation" | "timeout";

interface ErrorMessageProps {
  type?: ErrorType;
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showSupport?: boolean;
}

const errorConfig: Record<ErrorType, { icon: React.ComponentType<any>; defaultTitle: string }> = {
  generic: { icon: AlertCircle, defaultTitle: "Something went wrong" },
  network: { icon: WifiOff, defaultTitle: "Connection error" },
  server: { icon: ServerCrash, defaultTitle: "Server error" },
  notFound: { icon: FileWarning, defaultTitle: "Not found" },
  validation: { icon: AlertCircle, defaultTitle: "Validation error" },
  timeout: { icon: RefreshCw, defaultTitle: "Request timed out" },
};

export function ErrorMessage({
  type = "generic",
  title,
  message,
  details,
  onRetry,
  onDismiss,
  className,
  showSupport = false,
}: ErrorMessageProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "error-container animate-fade-in",
        className
      )} 
      role="alert" 
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div 
          className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"
          aria-hidden="true"
        >
          <Icon className="error-icon" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="error-title">{title || config.defaultTitle}</h4>
          <p className="error-message">{message}</p>
          
          {details && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 underline transition-colors"
              aria-expanded={showDetails}
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
          )}
          
          {showDetails && details && (
            <pre className="mt-2 p-2 bg-muted/50 rounded text-xs overflow-auto max-h-32 text-muted-foreground">
              {details}
            </pre>
          )}
          
          <div className="flex items-center gap-2 mt-3">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="btn-press"
                aria-label="Retry action"
              >
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Try Again
              </Button>
            )}
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                aria-label="Dismiss error"
              >
                Dismiss
              </Button>
            )}
            
            {showSupport && (
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a href="/help" className="flex items-center gap-1">
                  <HelpCircle className="w-4 h-4" aria-hidden="true" />
                  Get Help
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Timeout Error Component
interface TimeoutErrorProps {
  onRetry: () => void;
  className?: string;
}

export function TimeoutError({ onRetry, className }: TimeoutErrorProps) {
  return (
    <ErrorMessage
      type="timeout"
      message="The request took too long to complete. Please check your connection and try again."
      onRetry={onRetry}
      className={className}
    />
  );
}

// Inline Error for form fields
interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <p 
      className={cn("text-xs text-destructive flex items-center gap-1 mt-1 animate-fade-in", className)}
      role="alert"
    >
      <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

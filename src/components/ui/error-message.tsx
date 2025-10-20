import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorMessageProps) {
  return (
    <div className={cn("error-container", className)} role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <AlertCircle className="error-icon mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h4 className="error-title">{title}</h4>
          <p className="error-message">{message}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3"
              aria-label="Retry action"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

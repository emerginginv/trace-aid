import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ErrorPageProps {
  code?: string;
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function ErrorPage({
  code = "500",
  title = "Something went wrong",
  message = "We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.",
  showHomeButton = true,
  showRetryButton = true,
  onRetry,
  className,
}: ErrorPageProps) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", className)}>
      <div className="max-w-md w-full text-center space-y-8">
        {/* Error Code with Gradient */}
        <div className="relative">
          <div className="text-9xl font-bold gradient-primary bg-clip-text text-transparent opacity-20">
            {code}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showRetryButton && (
            <Button
              onClick={onRetry}
              variant="default"
              size="lg"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          {showHomeButton && (
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          )}
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}

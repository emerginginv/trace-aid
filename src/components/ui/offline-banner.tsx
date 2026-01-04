import * as React from "react";
import { WifiOff, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "./button";

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 py-3 px-4",
        "flex items-center justify-center gap-3",
        "transition-all duration-300 transform",
        isOnline
          ? "bg-success text-success-foreground"
          : "bg-warning text-warning-foreground",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">You're back online!</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">
            You're offline. Some features may be unavailable.
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.location.reload()}
            className="h-7"
          >
            <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </>
      )}
    </div>
  );
}

interface SyncIndicatorProps {
  isSyncing?: boolean;
  lastSyncedAt?: Date | null;
  className?: string;
}

export function SyncIndicator({
  isSyncing = false,
  lastSyncedAt,
  className,
}: SyncIndicatorProps) {
  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs text-muted-foreground",
        isSyncing && "sync-indicator syncing",
        className
      )}
      aria-live="polite"
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
          <span>Syncing...</span>
        </>
      ) : lastSyncedAt ? (
        <>
          <Check className="h-3 w-3 text-success" aria-hidden="true" />
          <span>Synced {formatLastSync(lastSyncedAt)}</span>
        </>
      ) : null}
    </div>
  );
}
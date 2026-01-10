import { useState, useEffect } from "react";
import { AlertCircle, Clock, User, Building2, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { cn } from "@/lib/utils";

export function ImpersonationBanner() {
  const { isImpersonating, session, endImpersonation } = useImpersonation();
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isEnding, setIsEnding] = useState(false);

  // Update remaining time countdown
  useEffect(() => {
    if (!isImpersonating || !session?.expires_at) return;

    const updateRemaining = () => {
      const expiresAt = new Date(session.expires_at!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setRemainingTime(remaining);

      // Auto-end if expired
      if (remaining <= 0) {
        endImpersonation();
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [isImpersonating, session?.expires_at, endImpersonation]);

  const handleExit = async () => {
    setIsEnding(true);
    await endImpersonation();
  };

  if (!isImpersonating || !session) return null;

  // Format remaining time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = remainingTime < 300; // Less than 5 minutes

  return (
    <div 
      className={cn(
        "border-b px-4 py-3 flex flex-wrap items-center justify-between gap-4",
        isLowTime 
          ? "bg-destructive/20 border-destructive" 
          : "bg-warning/20 border-warning"
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* Impersonation indicator */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isLowTime ? "bg-destructive" : "bg-warning"
          )} />
          <AlertCircle className={cn(
            "h-4 w-4",
            isLowTime ? "text-destructive" : "text-warning-foreground"
          )} />
          <span className={cn(
            "text-sm font-semibold",
            isLowTime ? "text-destructive" : "text-warning-foreground"
          )}>
            Impersonating
          </span>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {session.target_user_name || session.target_user_email}
          </span>
        </div>

        {/* Organization info */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{session.target_organization_name}</span>
        </div>

        {/* Reason */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="italic truncate max-w-xs" title={session.reason}>
            "{session.reason}"
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Timer */}
        <div className={cn(
          "flex items-center gap-2 text-sm font-mono",
          isLowTime ? "text-destructive font-semibold" : "text-warning-foreground"
        )}>
          <Clock className="h-4 w-4" />
          <span>
            {remainingTime > 0 ? formatTime(remainingTime) : "Expired"}
          </span>
        </div>

        {/* Exit button */}
        <Button
          onClick={handleExit}
          disabled={isEnding}
          variant={isLowTime ? "destructive" : "outline"}
          size="sm"
          className={cn(
            "font-medium",
            !isLowTime && "border-warning text-warning-foreground hover:bg-warning/30"
          )}
        >
          {isEnding ? "Exiting..." : "Exit Impersonation"}
        </Button>
      </div>
    </div>
  );
}

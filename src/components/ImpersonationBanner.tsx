import { AlertCircle, X } from "lucide-react";
import { Button } from "./ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUserEmail, impersonatedUserName, stopImpersonation } = useImpersonation();

  if (!isImpersonating) return null;

  return (
    <div className="bg-warning/20 border-b border-warning px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-warning-foreground" />
        <span className="text-sm font-medium text-warning-foreground">
          Viewing as: {impersonatedUserName || impersonatedUserEmail}
        </span>
      </div>
      <Button
        onClick={stopImpersonation}
        variant="ghost"
        size="sm"
        className="h-7 text-warning-foreground hover:text-warning-foreground hover:bg-warning/30"
      >
        <X className="h-4 w-4 mr-1" />
        Exit Impersonation
      </Button>
    </div>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { useSyncCategoryTransitions } from "@/hooks/use-sync-category-transitions";

interface SyncCasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncCasesModal({ open, onOpenChange }: SyncCasesModalProps) {
  const [mode, setMode] = useState<"fill" | "override">("fill");
  const [confirmOverride, setConfirmOverride] = useState(false);
  const { sync, isLoading, result, reset } = useSyncCategoryTransitions();

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setMode("fill");
      setConfirmOverride(false);
      reset();
    }, 200);
  };

  const handleSync = () => {
    sync({ overrideExisting: mode === "override" });
  };

  const canSync = mode === "fill" || (mode === "override" && confirmOverride);

  // Show results view if sync completed
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Sync Complete
            </DialogTitle>
            <DialogDescription>
              Category transitions have been synchronized.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cases Processed</span>
                <span className="font-medium">{result.cases_processed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transitions Created</span>
                <span className="font-medium text-green-600">{result.transitions_created}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transitions Deleted</span>
                <span className="font-medium">
                  {result.transitions_deleted}
                  {!result.override_mode && (
                    <span className="text-xs text-muted-foreground ml-1">(fill-only mode)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Category Transitions
          </DialogTitle>
          <DialogDescription>
            This tool reconstructs category transition timestamps from case status history records.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Sync Mode</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) => {
                setMode(value as "fill" | "override");
                if (value === "fill") setConfirmOverride(false);
              }}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="fill" id="fill" className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor="fill" className="font-medium cursor-pointer">
                    Fill Missing Only
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only insert transitions where gaps exist. Existing timestamps are preserved.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="override" id="override" className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor="override" className="font-medium cursor-pointer">
                    Override All Transitions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Delete existing transitions and recompute from history.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {mode === "override" && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Override mode will <strong>delete ALL existing</strong> category transitions and recompute them from status history. This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm"
                  checked={confirmOverride}
                  onCheckedChange={(checked) => setConfirmOverride(checked === true)}
                />
                <Label htmlFor="confirm" className="text-sm cursor-pointer">
                  I understand this will modify historical data
                </Label>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSync} disabled={!canSync || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Cases
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

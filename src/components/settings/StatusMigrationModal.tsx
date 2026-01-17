import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Check,
  Circle,
  Clock,
  Database,
  History,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { useStatusMigration, MigrationResult } from "@/hooks/use-status-migration";
import { format } from "date-fns";

interface StatusMigrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MigrationStep = "validate" | "backfill" | "timestamps" | "transitions" | "lock";

interface StepConfig {
  id: MigrationStep;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  {
    id: "validate",
    title: "Validate Current State",
    description: "Check database integrity before migration",
    icon: <Database className="h-4 w-4" />,
  },
  {
    id: "backfill",
    title: "Backfill Status IDs",
    description: "Map legacy status text to new status_id values",
    icon: <History className="h-4 w-4" />,
  },
  {
    id: "timestamps",
    title: "Fix Timestamps",
    description: "Recalculate entered_at, exited_at, and durations",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    id: "transitions",
    title: "Rebuild Category Transitions",
    description: "Sync category transition log from corrected history",
    icon: <RefreshCw className="h-4 w-4" />,
  },
  {
    id: "lock",
    title: "Lock Legacy Fields",
    description: "Make status and status_key read-only",
    icon: <Lock className="h-4 w-4" />,
  },
];

export function StatusMigrationModal({ open, onOpenChange }: StatusMigrationModalProps) {
  const {
    validation,
    isLoadingValidation,
    logs,
    backfill,
    isBackfilling,
    backfillResult,
    fixTimestamps,
    isFixingTimestamps,
    fixTimestampsResult,
    syncTransitions,
    isSyncingTransitions,
    toggleLock,
    isTogglingLock,
    rollback,
    isRollingBack,
    refetchValidation,
  } = useStatusMigration();

  const [dryRunMode, setDryRunMode] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<MigrationStep>>(new Set());
  const [currentStep, setCurrentStep] = useState<MigrationStep | null>(null);
  const [stepResults, setStepResults] = useState<Record<MigrationStep, MigrationResult | null>>({
    validate: null,
    backfill: null,
    timestamps: null,
    transitions: null,
    lock: null,
  });

  const handleRunStep = async (step: MigrationStep) => {
    setCurrentStep(step);
    
    try {
      let result: MigrationResult | null = null;
      
      switch (step) {
        case "validate":
          await refetchValidation();
          result = { success: true, dry_run: false };
          break;
        case "backfill":
          result = await backfill({ dryRun: dryRunMode });
          break;
        case "timestamps":
          result = await fixTimestamps({ dryRun: dryRunMode });
          break;
        case "transitions":
          result = await syncTransitions();
          break;
        case "lock":
          await toggleLock({ enable: true });
          result = { success: true, dry_run: false };
          break;
      }
      
      setStepResults((prev) => ({ ...prev, [step]: result }));
      
      if (!dryRunMode || step === "validate") {
        setCompletedSteps((prev) => new Set([...prev, step]));
      }
    } catch (error) {
      console.error(`Step ${step} failed:`, error);
    } finally {
      setCurrentStep(null);
    }
  };

  const getStepStatus = (step: MigrationStep): "pending" | "running" | "completed" | "error" => {
    if (currentStep === step) return "running";
    if (completedSteps.has(step)) return "completed";
    if (stepResults[step]?.errors && stepResults[step]!.errors! > 0) return "error";
    return "pending";
  };

  const isAnyRunning = isBackfilling || isFixingTimestamps || isSyncingTransitions || isTogglingLock;

  const handleClose = () => {
    if (!isAnyRunning) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Case Status Migration
          </DialogTitle>
          <DialogDescription>
            Migrate existing CaseWise cases to the new canonical status data model
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Current State Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Current State</h4>
              {isLoadingValidation ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading validation data...
                </div>
              ) : validation ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold">{validation.total_cases}</div>
                    <div className="text-xs text-muted-foreground">Total Cases</div>
                  </div>
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold">{validation.total_history_entries}</div>
                    <div className="text-xs text-muted-foreground">History Entries</div>
                  </div>
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{validation.history_with_status_id}</span>
                      {validation.history_without_status_id > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {validation.history_without_status_id} missing
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">With Status ID</div>
                  </div>
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold">{validation.category_transitions}</div>
                    <div className="text-xs text-muted-foreground">Category Transitions</div>
                  </div>
                </div>
              ) : null}
            </div>

            <Separator />

            {/* Dry Run Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-500/10 border-amber-500/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dryRun"
                  checked={dryRunMode}
                  onCheckedChange={(checked) => setDryRunMode(checked === true)}
                />
                <label htmlFor="dryRun" className="text-sm font-medium cursor-pointer">
                  Dry Run Mode (Preview Only)
                </label>
              </div>
              {dryRunMode && (
                <Badge variant="outline" className="text-amber-600">
                  No changes will be made
                </Badge>
              )}
            </div>

            {/* Migration Steps */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Migration Steps</h4>
              
              {STEPS.map((step, index) => {
                const status = getStepStatus(step.id);
                const result = stepResults[step.id];
                const isRunning = currentStep === step.id;
                
                return (
                  <div
                    key={step.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      status === "completed" 
                        ? "bg-green-500/10 border-green-500/30"
                        : status === "running"
                        ? "bg-primary/10 border-primary/30"
                        : status === "error"
                        ? "bg-destructive/10 border-destructive/30"
                        : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {status === "completed" ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : status === "running" ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : status === "error" ? (
                            <X className="h-5 w-5 text-destructive" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {index + 1}. {step.title}
                            </span>
                            {step.icon}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                          
                          {/* Show results */}
                          {result && !result.dry_run && (
                            <div className="mt-2 text-sm">
                              {result.updated !== undefined && (
                                <span className="text-green-600">
                                  Updated: {result.updated}
                                </span>
                              )}
                              {result.entries_fixed !== undefined && (
                                <span className="text-green-600">
                                  Fixed: {result.entries_fixed}
                                </span>
                              )}
                              {result.errors && result.errors > 0 && (
                                <span className="text-destructive ml-3">
                                  Errors: {result.errors}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Dry run preview */}
                          {result && result.dry_run && (
                            <div className="mt-2 text-sm text-amber-600">
                              Preview: Would update {result.updated || result.entries_fixed || 0} records
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant={status === "completed" ? "outline" : "default"}
                        onClick={() => handleRunStep(step.id)}
                        disabled={isAnyRunning}
                      >
                        {isRunning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : status === "completed" ? (
                          <>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Re-run
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            {dryRunMode && step.id !== "validate" ? "Preview" : "Run"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warning for Lock Step */}
            {!dryRunMode && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Locking legacy fields is permanent. After this step, the `status` and 
                  `status_key` columns on cases will be read-only. Only proceed after 
                  verifying all other steps completed successfully.
                </AlertDescription>
              </Alert>
            )}

            {/* Recent Migration Logs */}
            {logs.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Recent Migration Logs</h4>
                  <div className="space-y-2">
                    {logs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-2 border rounded text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              log.status === "completed"
                                ? "default"
                                : log.status === "rolled_back"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {log.status}
                          </Badge>
                          <span>{log.migration_step}</span>
                          <span className="text-muted-foreground">
                            ({log.records_affected} records)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.started_at), "MMM d, h:mm a")}
                          </span>
                          {log.status !== "rolled_back" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => rollback({ logId: log.id })}
                              disabled={isRollingBack}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isAnyRunning}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

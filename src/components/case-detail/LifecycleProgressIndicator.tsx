import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { DelayedTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LifecycleProgressIndicatorProps {
  statusKey: string | null;
  phase: "intake" | "execution" | null;
  compact?: boolean;
}

interface ProgressStep {
  key: string;
  label: string;
  shortLabel?: string;
}

const INTAKE_STEPS: ProgressStep[] = [
  { key: "requested", label: "Requested", shortLabel: "Request" },
  { key: "under_review", label: "Under Review", shortLabel: "Review" },
  { key: "approved", label: "Approved", shortLabel: "Approve" },
];

const EXECUTION_STEPS: ProgressStep[] = [
  { key: "new", label: "New", shortLabel: "New" },
  { key: "assigned", label: "Assigned", shortLabel: "Assign" },
  { key: "active", label: "Active", shortLabel: "Active" },
  { key: "completed", label: "Completed", shortLabel: "Complete" },
  { key: "closed", label: "Closed", shortLabel: "Close" },
];

// Progress messages for each status
const PROGRESS_MESSAGES: Record<string, string> = {
  requested: "Match to client → Approve request → Case created",
  under_review: "Complete client matching → Approve to create case",
  approved: "Case created - navigate to case to continue",
  declined: "Request closed - no further action",
  new: "Assign investigators → Begin active work",
  assigned: "Start fieldwork → Move to Active",
  active: "Complete investigation → Move to Completed",
  on_hold: "Resolve hold reason → Return to Active",
  awaiting_client: "Receive client response → Return to Active",
  awaiting_records: "Receive records → Return to Active",
  completed: "Generate final report → Create invoice → Close",
  closed: "Case complete - preserved for compliance",
  cancelled: "Case terminated - preserved for reference",
};

function getStepStatus(steps: ProgressStep[], currentKey: string, stepKey: string): "completed" | "current" | "upcoming" {
  const currentIndex = steps.findIndex(s => s.key === currentKey);
  const stepIndex = steps.findIndex(s => s.key === stepKey);
  
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}

export function LifecycleProgressIndicator({ 
  statusKey, 
  phase, 
  compact = false 
}: LifecycleProgressIndicatorProps) {
  if (!statusKey || !phase) return null;
  
  // Handle hold/awaiting statuses - show as Active variant
  const normalizedKey = ["on_hold", "awaiting_client", "awaiting_records"].includes(statusKey) 
    ? "active" 
    : statusKey;
  
  const steps = phase === "intake" ? INTAKE_STEPS : EXECUTION_STEPS;
  const progressMessage = PROGRESS_MESSAGES[statusKey] || "";
  
  // For declined/cancelled, don't show progress
  if (statusKey === "declined" || statusKey === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">Status:</span>
        <span>{statusKey === "declined" ? "Request Declined" : "Case Cancelled"}</span>
      </div>
    );
  }
  
  if (compact) {
    return (
      <DelayedTooltip content={progressMessage} side="bottom">
        <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
          <span className="font-medium">Next:</span>
          <span className="truncate max-w-[200px]">{progressMessage}</span>
        </div>
      </DelayedTooltip>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Progress Steps */}
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const status = getStepStatus(steps, normalizedKey, step.key);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.key} className="flex items-center">
              <DelayedTooltip content={step.label} side="top">
                <div 
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors cursor-help",
                    status === "completed" && "bg-primary/10 text-primary",
                    status === "current" && "bg-primary text-primary-foreground",
                    status === "upcoming" && "bg-muted text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Circle className={cn(
                      "h-3 w-3",
                      status === "current" && "fill-current"
                    )} />
                  )}
                  <span className="hidden sm:inline">{step.shortLabel || step.label}</span>
                </div>
              </DelayedTooltip>
              
              {!isLast && (
                <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground/50" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* What's Next Message */}
      {progressMessage && (
        <div className="text-xs text-muted-foreground pl-1">
          <span className="font-medium text-foreground">What's next: </span>
          {progressMessage}
        </div>
      )}
    </div>
  );
}

import { useCaseStatusHistory, formatDuration } from "@/hooks/use-case-status-history";
import { useCaseLifecycleStatuses } from "@/hooks/use-case-lifecycle-statuses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, User, ArrowRight, History } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CaseStatusTimelineProps {
  caseId: string;
}

export function CaseStatusTimeline({ caseId }: CaseStatusTimelineProps) {
  const { 
    getStatusTimeline, 
    getCurrentStatus, 
    getTimeInCurrentStatus, 
    isLoading, 
    error 
  } = useCaseStatusHistory(caseId);
  
  const { 
    getDisplayName, 
    getStatusColor, 
    getStatusPhase,
    isLoading: statusesLoading 
  } = useCaseLifecycleStatuses();

  const timeline = getStatusTimeline();
  const currentStatus = getCurrentStatus();

  if (isLoading || statusesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Status History
          </CardTitle>
          <CardDescription>Time spent in each status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Failed to load status history.</p>
        </CardContent>
      </Card>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Status History
          </CardTitle>
          <CardDescription>Time spent in each status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No status changes recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Group timeline by phase
  const intakeEntries = timeline.filter(
    (e) => getStatusPhase(e.to_status_key || e.to_status) === "intake"
  );
  const executionEntries = timeline.filter(
    (e) => getStatusPhase(e.to_status_key || e.to_status) === "execution"
  );

  const renderTimelineEntry = (
    entry: ReturnType<typeof getStatusTimeline>[number],
    index: number,
    isLast: boolean
  ) => {
    const statusKey = entry.to_status_key || entry.to_status;
    const displayName = getDisplayName(statusKey);
    const color = getStatusColor(statusKey) || "#9ca3af";
    const isCurrent = entry.exited_at === null;
    const duration = entry.computed_duration_seconds;

    return (
      <div key={entry.id} className="relative flex gap-4">
        {/* Timeline line */}
        {!isLast && (
          <div 
            className="absolute left-[19px] top-10 w-0.5 h-[calc(100%+8px)] bg-border"
            aria-hidden="true"
          />
        )}
        
        {/* Status marker */}
        <div className="relative z-10 flex-shrink-0">
          <div 
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2",
              isCurrent ? "ring-2 ring-offset-2 ring-primary" : ""
            )}
            style={{ 
              borderColor: color,
              backgroundColor: `${color}20`
            }}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 pb-6 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className="font-medium"
              style={{ 
                borderColor: color,
                color: color,
                backgroundColor: `${color}10`
              }}
            >
              {displayName}
            </Badge>
            {isCurrent && (
              <Badge variant="default" className="text-xs bg-primary">
                Current
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(entry.entered_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
          
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {duration !== null ? formatDuration(duration) : "—"}
                {isCurrent && <span className="text-primary ml-1">(ongoing)</span>}
              </span>
            </span>
            
            {entry.changed_by_name && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{entry.changed_by_name}</span>
              </span>
            )}
          </div>

          {entry.change_reason && (
            <p className="text-sm text-muted-foreground mt-1 italic">
              "{entry.change_reason}"
            </p>
          )}
          
          {entry.from_status && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              <span>From: {getDisplayName(entry.from_status_key || entry.from_status)}</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderPhaseSection = (
    title: string,
    entries: ReturnType<typeof getStatusTimeline>,
    isLastPhase: boolean
  ) => {
    if (entries.length === 0) return null;

    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          {title}
        </h4>
        <div className="space-y-0">
          {entries.map((entry, idx) => 
            renderTimelineEntry(
              entry, 
              idx, 
              idx === entries.length - 1 && isLastPhase
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Status History
        </CardTitle>
        <CardDescription>
          Time spent in each status • {timeline.length} transition{timeline.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {intakeEntries.length > 0 && renderPhaseSection(
          "Intake Phase", 
          intakeEntries, 
          executionEntries.length === 0
        )}
        {executionEntries.length > 0 && renderPhaseSection(
          "Execution Phase", 
          executionEntries, 
          true
        )}
      </CardContent>
    </Card>
  );
}

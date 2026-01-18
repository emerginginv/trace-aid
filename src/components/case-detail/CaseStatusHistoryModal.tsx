import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Clock, User, FolderOpen, AlertTriangle, Info } from "lucide-react";
import { useCaseStatusHistoryWithTransitions, CaseCategoryTransition } from "@/hooks/use-case-status-history-extended";
import { usePermissions } from "@/hooks/usePermissions";
import { useStatusDisplay } from "@/hooks/use-status-display";
import { EditStatusDatesDialog } from "./EditStatusDatesDialog";
import { formatDurationDetailed } from "@/hooks/use-case-status-history";
import { DelayedTooltip, HelpTooltip } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CaseStatusHistoryModalProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimelineEntry {
  type: 'status' | 'category';
  id: string;
  timestamp: string;
  statusEntry?: {
    id: string;
    to_status: string;
    to_status_key: string | null;
    entered_at: string;
    exited_at: string | null;
    duration_seconds: number | null;
    computed_duration_seconds: number | null;
    changed_by_name: string | null;
    manual_override?: boolean;
    change_reason: string | null;
  };
  categoryTransition?: CaseCategoryTransition;
}

export function CaseStatusHistoryModal({ caseId, open, onOpenChange }: CaseStatusHistoryModalProps) {
  const { hasPermission } = usePermissions();
  const { canViewExactStatus } = useStatusDisplay();
  const canEditDates = hasPermission('edit_status_dates');
  
  const { 
    history,
    categoryTransitions,
    isLoading,
    getStatusTimeline,
    refetch,
  } = useCaseStatusHistoryWithTransitions(caseId);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry['statusEntry'] | null>(null);
  
  // Build merged timeline with category transitions
  const buildMergedTimeline = (): TimelineEntry[] => {
    const timeline: TimelineEntry[] = [];
    
    // Add status entries
    const statusTimeline = getStatusTimeline();
    statusTimeline.forEach(entry => {
      timeline.push({
        type: 'status',
        id: entry.id,
        timestamp: entry.entered_at,
        statusEntry: {
          id: entry.id,
          to_status: entry.to_status,
          to_status_key: entry.to_status_key,
          entered_at: entry.entered_at,
          exited_at: entry.exited_at,
          duration_seconds: entry.duration_seconds,
          computed_duration_seconds: entry.computed_duration_seconds,
          changed_by_name: entry.changed_by_name,
          manual_override: (entry as any).manual_override,
          change_reason: entry.change_reason,
        }
      });
    });
    
    // Add category transitions
    categoryTransitions.forEach(transition => {
      timeline.push({
        type: 'category',
        id: transition.id,
        timestamp: transition.transitioned_at,
        categoryTransition: transition,
      });
    });
    
    // Sort by timestamp ascending
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return timeline;
  };
  
  const handleEditClick = (entry: TimelineEntry['statusEntry']) => {
    if (entry) {
      setSelectedEntry(entry);
      setEditDialogOpen(true);
    }
  };
  
  const handleEditSuccess = () => {
    refetch();
    setEditDialogOpen(false);
    setSelectedEntry(null);
  };
  
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Helper to get category name from status (for non-exact status viewers)
  const getCategoryFromStatus = (status: string): string => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('new') || lowerStatus.includes('pending') || lowerStatus.includes('draft')) {
      return 'New';
    }
    if (lowerStatus.includes('open') || lowerStatus.includes('active') || lowerStatus.includes('investigation') || lowerStatus.includes('review')) {
      return 'Open';
    }
    if (lowerStatus.includes('complete') || lowerStatus.includes('finished') || lowerStatus.includes('delivered')) {
      return 'Complete';
    }
    if (lowerStatus.includes('closed') || lowerStatus.includes('cancelled') || lowerStatus.includes('archived')) {
      return 'Closed';
    }
    return 'Open'; // Default fallback
  };
  
  const mergedTimeline = buildMergedTimeline();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status History
              <HelpTooltip 
                content="Complete audit trail of all status changes, including timestamps, durations, and who made each change"
                side="right"
              />
            </DialogTitle>
            <DialogDescription>
              <strong>Current Status</strong> shows where the case is now. <strong>Status History</strong> tracks every status 
              the case has been in, including how long it spent in each. This history is preserved for compliance and reporting.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading history...
              </div>
            ) : mergedTimeline.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No status history available
              </div>
            ) : (
              <div className="space-y-1 py-4">
                {mergedTimeline.map((item, index) => (
                  <div key={item.id}>
                    {item.type === 'category' && item.categoryTransition && (
                      <DelayedTooltip
                        content="Case moved between major workflow phases"
                        side="right"
                      >
                        <div className="my-4 flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-dashed cursor-help">
                          <FolderOpen className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            Category: {item.categoryTransition.from_category_name || 'None'} → {item.categoryTransition.to_category_name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDateTime(item.categoryTransition.transitioned_at)}
                          </span>
                        </div>
                      </DelayedTooltip>
                    )}
                    
                    {item.type === 'status' && item.statusEntry && (
                      <div className="relative flex gap-3 pb-6 last:pb-0">
                        {/* Timeline line */}
                        {index < mergedTimeline.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                        )}
                        
                        {/* Status dot */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          item.statusEntry.exited_at === null 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted border-2 border-border'
                        }`}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {canViewExactStatus 
                                  ? item.statusEntry.to_status 
                                  : getCategoryFromStatus(item.statusEntry.to_status)}
                              </span>
                              {item.statusEntry.exited_at === null && (
                                <DelayedTooltip content="Case is currently in this status" side="top">
                                  <Badge variant="secondary" className="text-xs cursor-help">
                                    Current
                                  </Badge>
                                </DelayedTooltip>
                              )}
                              {item.statusEntry.manual_override && (
                                <DelayedTooltip content="Dates were manually adjusted - original values preserved in audit log" side="top">
                                  <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300 cursor-help">
                                    <AlertTriangle className="h-3 w-3" />
                                    Manual Override
                                  </Badge>
                                </DelayedTooltip>
                              )}
                            </div>
                            
                            {canEditDates ? (
                              <DelayedTooltip
                                content="Adjust entry and exit times for this status record"
                                side="left"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => handleEditClick(item.statusEntry!)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </DelayedTooltip>
                            ) : (
                              <DelayedTooltip
                                content="You don't have permission to edit status dates"
                                side="left"
                              >
                                <span className="h-7 w-7 p-0 shrink-0 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">
                                  <Pencil className="h-3.5 w-3.5" />
                                </span>
                              </DelayedTooltip>
                            )}
                          </div>
                          
                          <div className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <DelayedTooltip content="When the case entered this status" side="top">
                                <span className="cursor-help">
                                  <span className="text-xs uppercase tracking-wide">Entered:</span>{' '}
                                  {formatDateTime(item.statusEntry.entered_at)}
                                </span>
                              </DelayedTooltip>
                            </div>
                            
                            {item.statusEntry.exited_at && (
                              <DelayedTooltip content="When the case left this status for the next one" side="top">
                                <div className="cursor-help inline-block">
                                  <span className="text-xs uppercase tracking-wide">Exited:</span>{' '}
                                  {formatDateTime(item.statusEntry.exited_at)}
                                </div>
                              </DelayedTooltip>
                            )}
                            
                            <div className="flex items-center gap-4 flex-wrap">
                              <DelayedTooltip content="Time spent in this status (calculated from entry to exit)" side="top">
                                <span className="flex items-center gap-1 cursor-help">
                                  <Clock className="h-3 w-3" />
                                  {item.statusEntry.computed_duration_seconds !== null
                                    ? formatDurationDetailed(item.statusEntry.computed_duration_seconds)
                                    : 'Ongoing'}
                                  {item.statusEntry.exited_at === null && (
                                    <span className="text-xs">(ongoing)</span>
                                  )}
                                </span>
                              </DelayedTooltip>
                              
                              {item.statusEntry.changed_by_name && (
                                <DelayedTooltip content="Staff member who made this status change" side="top">
                                  <span className="flex items-center gap-1 cursor-help">
                                    <User className="h-3 w-3" />
                                    {item.statusEntry.changed_by_name}
                                  </span>
                                </DelayedTooltip>
                              )}
                            </div>
                            
                            {item.statusEntry.change_reason && (
                              <div className="text-xs italic mt-1 p-2 bg-muted/50 rounded">
                                {item.statusEntry.change_reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {selectedEntry && (
        <EditStatusDatesDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          historyEntry={selectedEntry}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}

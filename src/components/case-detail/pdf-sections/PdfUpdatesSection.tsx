import { format } from "date-fns";
import { MessageSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineEntry {
  time: string;
  description: string;
}

interface Update {
  id: string;
  title: string;
  description: string | null;
  update_type: string;
  created_at: string | null;
  user?: { id: string; full_name: string | null } | null;
  activity_timeline?: TimelineEntry[] | null;
}

interface PdfUpdatesSectionProps {
  updates: Update[];
  caseDescription: string | null;
}

export function PdfUpdatesSection({ updates, caseDescription }: PdfUpdatesSectionProps) {
  const getUpdateTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "status_change":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">Status</Badge>;
      case "note":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">Note</Badge>;
      case "milestone":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">Milestone</Badge>;
      case "finding":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">Finding</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  return (
    <div className="pdf-section mb-6">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Notes & Updates
      </h2>
      
      {/* Case Description / Instructions */}
      {caseDescription && (
        <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="text-sm font-semibold mb-2 text-primary">Case Description / Instructions</h3>
          <div 
            className="text-sm prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: caseDescription }}
          />
        </div>
      )}
      
      {/* Updates List */}
      {updates.length > 0 ? (
        <div className="space-y-3">
          {updates.slice(0, 20).map((update) => (
            <div 
              key={update.id}
              className="p-3 rounded-lg border border-border bg-card"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getUpdateTypeBadge(update.update_type)}
                  <h4 className="font-medium text-sm">{update.title}</h4>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {update.created_at && format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              
              {update.description && (
                <div 
                  className="text-sm text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: update.description }}
                />
              )}
              
              {/* Activity Timeline in PDF */}
              {update.activity_timeline && update.activity_timeline.length > 0 && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <p className="text-xs font-medium text-primary mb-1">Activity Timeline</p>
                  {[...update.activity_timeline]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((entry, idx) => {
                      // Format time for display
                      const [hours, minutes] = entry.time.split(":").map(Number);
                      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                      const ampm = hours < 12 ? "AM" : "PM";
                      const formattedTime = `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
                      
                      return (
                        <p key={idx} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{formattedTime}</span>
                          <span className="mx-1">—</span>
                          {entry.description}
                        </p>
                      );
                    })}
                </div>
              )}

              {update.user?.full_name && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {update.user.full_name}
                </div>
              )}
            </div>
          ))}
          
          {updates.length > 20 && (
            <p className="text-sm text-center text-muted-foreground py-2">
              ... and {updates.length - 20} more updates
            </p>
          )}
        </div>
      ) : !caseDescription ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No updates recorded for this case.
        </p>
      ) : null}
    </div>
  );
}

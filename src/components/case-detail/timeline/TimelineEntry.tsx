import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Briefcase, 
  Users, 
  FilePenLine, 
  Calendar, 
  Paperclip, 
  Settings,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimelineEntry as TimelineEntryType } from "@/types/timeline";

interface TimelineEntryProps {
  entry: TimelineEntryType;
  onNavigate?: (entry: TimelineEntryType) => void;
  isLast?: boolean;
}

const entryTypeConfig = {
  case: {
    icon: Briefcase,
    label: 'Case',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  subject: {
    icon: Users,
    label: 'Subject',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  update: {
    icon: FilePenLine,
    label: 'Update',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  event: {
    icon: Calendar,
    label: 'Event',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  attachment: {
    icon: Paperclip,
    label: 'Attachment',
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
    dotClass: 'bg-green-500',
  },
  system: {
    icon: Settings,
    label: 'System',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

export function TimelineEntryComponent({ entry, onNavigate, isLast }: TimelineEntryProps) {
  const config = entryTypeConfig[entry.entryType];
  const Icon = config.icon;

  const formattedDate = format(new Date(entry.timestamp), "MMM d, yyyy");
  const formattedTime = format(new Date(entry.timestamp), "h:mm a");

  return (
    <div className="relative flex gap-4 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
      )}
      
      {/* Dot marker */}
      <div className={cn(
        "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ring-background",
        config.dotClass
      )}>
        <Icon className="h-3 w-3 text-white" />
      </div>

      {/* Entry content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Header row with timestamp and badge */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs font-medium", config.badgeClass)}>
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formattedDate} at {formattedTime}
            </span>
          </div>
          
          {onNavigate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onNavigate(entry)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-foreground leading-snug">
          {entry.title}
        </p>

        {/* Subtitle */}
        {entry.subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {entry.subtitle}
            {entry.userName && ` • By ${entry.userName}`}
          </p>
        )}
        {!entry.subtitle && entry.userName && (
          <p className="text-xs text-muted-foreground mt-0.5">
            By {entry.userName}
          </p>
        )}
        {/* Event cost hint */}
        {entry.entryType === 'event' && (
          <p className="text-xs text-muted-foreground/70 mt-1 italic">
            Costs derived from linked updates
          </p>
        )}
      </div>
    </div>
  );
}

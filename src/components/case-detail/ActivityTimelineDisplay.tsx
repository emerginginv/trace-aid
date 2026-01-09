import { Clock } from "lucide-react";

interface TimelineEntry {
  time: string;
  description: string;
}

interface ActivityTimelineDisplayProps {
  timeline: TimelineEntry[];
  className?: string;
}

// Format 24-hour time to 12-hour display
const formatTime = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

// Sort entries by time
const sortByTime = (entries: TimelineEntry[]): TimelineEntry[] => {
  return [...entries].sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return a.time.localeCompare(b.time);
  });
};

export function ActivityTimelineDisplay({
  timeline,
  className = "",
}: ActivityTimelineDisplayProps) {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  const sortedTimeline = sortByTime(timeline);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Clock className="h-4 w-4 text-primary" />
        Activity Timeline
      </div>
      
      <div className="space-y-1.5 pl-1">
        {sortedTimeline.map((entry, index) => (
          <div key={index} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatTime(entry.time)}
            </span>
            <span className="mx-2 text-muted-foreground/50">—</span>
            <span>{entry.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

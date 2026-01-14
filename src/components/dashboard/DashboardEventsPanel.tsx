import React from 'react';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardEvent } from '@/hooks/useDashboardData';

interface DashboardEventsPanelProps {
  events: DashboardEvent[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onEventClick: (event: DashboardEvent) => void;
}

function getDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM dd');
}

function getStatusDisplay(status: string) {
  switch (status) {
    case 'in_progress':
      return { label: 'In Progress', dotColor: 'bg-blue-500', textColor: 'text-blue-500' };
    case 'done':
    case 'completed':
      return { label: 'Done', dotColor: 'bg-emerald-500', textColor: 'text-emerald-500' };
    case 'scheduled':
      return { label: 'Scheduled', dotColor: 'bg-purple-500', textColor: 'text-purple-500' };
    case 'cancelled':
      return { label: 'Cancelled', dotColor: 'bg-red-500', textColor: 'text-red-500' };
    case 'on_hold':
      return { label: 'On Hold', dotColor: 'bg-orange-500', textColor: 'text-orange-500' };
    case 'to_do':
    default:
      return { label: 'Scheduled', dotColor: 'bg-purple-500', textColor: 'text-purple-500' };
  }
}

function getUserInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function DashboardEventsPanel({
  events,
  filter,
  onFilterChange,
  canViewAll,
  onEventClick,
}: DashboardEventsPanelProps) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">Upcoming Events</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {events.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canViewAll && (
            <Select value={filter} onValueChange={(v) => onFilterChange(v as 'my' | 'all')}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">My Events</SelectItem>
                <SelectItem value="all">All Events</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 6).map((event) => {
                const statusDisplay = getStatusDisplay(event.eventStatus);

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                      <span className="text-xs font-medium uppercase">
                        {format(parseISO(event.date), 'MMM')}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(parseISO(event.date), 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium leading-tight block truncate">
                        {event.title}
                      </span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {getDateLabel(event.date)}
                        </span>
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${statusDisplay.textColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDisplay.dotColor}`} />
                          {statusDisplay.label}
                        </span>
                        {event.assignedUserName && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                              {getUserInitials(event.assignedUserName)}
                            </span>
                            {event.assignedUserName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {events.length > 6 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{events.length - 6} more events
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default DashboardEventsPanel;

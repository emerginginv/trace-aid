import React from 'react';
import { format, isToday, isTomorrow, isYesterday, parseISO, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardTask } from '@/hooks/useDashboardData';

interface DashboardTasksPanelProps {
  tasks: DashboardTask[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onTaskToggle: (taskId: string) => void;
  onTaskEdit: (task: DashboardTask) => void;
}

function getDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM dd');
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'default';
  }
}

function getStatusDisplay(status: string) {
  switch (status) {
    case 'in_progress':
      return { label: 'In Progress', dotColor: 'bg-blue-500', textColor: 'text-blue-500' };
    case 'done':
    case 'completed':
      return { label: 'Done', dotColor: 'bg-emerald-500', textColor: 'text-emerald-500' };
    case 'on_hold':
      return { label: 'On Hold', dotColor: 'bg-orange-500', textColor: 'text-orange-500' };
    case 'to_do':
    default:
      return { label: 'To Do', dotColor: 'bg-amber-500', textColor: 'text-amber-500' };
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

export function DashboardTasksPanel({
  tasks,
  filter,
  onFilterChange,
  canViewAll,
  onTaskToggle,
  onTaskEdit,
}: DashboardTasksPanelProps) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">Tasks</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canViewAll && (
            <Select value={filter} onValueChange={(v) => onFilterChange(v as 'my' | 'all')}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">My Tasks</SelectItem>
                <SelectItem value="all">All Tasks</SelectItem>
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
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 8).map((task) => {
                const isOverdue = isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
                const statusDisplay = getStatusDisplay(task.taskStatus);

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer group transition-colors"
                    onClick={() => onTaskEdit(task)}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => onTaskToggle(task.id)}
                        className="mt-0.5"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-sm font-medium leading-tight ${
                            task.status === 'completed' ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {task.title}
                        </span>
                        <Badge variant={getPriorityColor(task.priority) as 'default'} className="shrink-0 text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {getDateLabel(task.dueDate)}
                        </span>
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${statusDisplay.textColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDisplay.dotColor}`} />
                          {statusDisplay.label}
                        </span>
                        {task.assignedUserName && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                              {getUserInitials(task.assignedUserName)}
                            </span>
                            {task.assignedUserName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {tasks.length > 8 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{tasks.length - 8} more tasks
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default DashboardTasksPanel;

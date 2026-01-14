import React from 'react';
import { parseISO } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { DashboardTask } from '@/hooks/useDashboardData';
import { BasePanel, PanelListItem, StatusIndicator, DateLabel, getStatusDisplay } from '@/components/shared/Panel';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface DashboardTasksPanelProps {
  tasks: DashboardTask[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onTaskToggle: (taskId: string) => void;
  onTaskEdit: (task: DashboardTask) => void;
  isLoading?: boolean;
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

export function DashboardTasksPanel({
  tasks,
  filter,
  onFilterChange,
  canViewAll,
  onTaskToggle,
  onTaskEdit,
  isLoading = false,
}: DashboardTasksPanelProps) {
  const filterOptions = canViewAll
    ? [
        { value: 'my', label: 'My Tasks' },
        { value: 'all', label: 'All Tasks' },
      ]
    : [];

  return (
    <BasePanel
      title="Tasks"
      count={tasks.length}
      emptyIcon={CheckCircle2}
      emptyMessage="No pending tasks"
      showFilter={canViewAll}
      filterOptions={filterOptions}
      filterValue={filter}
      onFilterChange={(v) => onFilterChange(v as 'my' | 'all')}
      filterWidth="w-[100px]"
      isLoading={isLoading}
    >
      {tasks.slice(0, 8).map((task) => {
        const statusDisplay = getStatusDisplay(task.taskStatus);

        return (
          <PanelListItem key={task.id} onClick={() => onTaskEdit(task)}>
            <div className="flex items-start gap-3">
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
                  <DateLabel date={task.dueDate} showIcon highlightOverdue />
                  <StatusIndicator status={statusDisplay} />
                  {task.assignedUserName && (
                    <UserAvatar name={task.assignedUserName} size="xs" showName />
                  )}
                </div>
              </div>
            </div>
          </PanelListItem>
        );
      })}
      {tasks.length > 8 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          +{tasks.length - 8} more tasks
        </p>
      )}
    </BasePanel>
  );
}

export default DashboardTasksPanel;

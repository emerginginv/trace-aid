import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { DashboardUpdate } from '@/hooks/useDashboardData';

interface DashboardUpdatesPanelProps {
  updates: DashboardUpdate[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onUpdateClick: (update: DashboardUpdate) => void;
  expandedId: string | null;
  onExpandedChange: (id: string | null) => void;
  updateTypePicklists: { value: string; color: string | null }[];
}

function getUpdateIcon(type: string) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-warning" />;
    default:
      return <Bell className="w-4 h-4 text-info" />;
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

export function DashboardUpdatesPanel({
  updates,
  filter,
  onFilterChange,
  canViewAll,
  onUpdateClick,
  expandedId,
  onExpandedChange,
  updateTypePicklists,
}: DashboardUpdatesPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const UpdateTypeDot = ({ updateType }: { updateType: string }) => {
    const picklist = updateTypePicklists.find((p) => p.value === updateType);
    const color = picklist?.color || '#6b7280';
    const label = updateType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return (
      <span className="flex items-center gap-1.5 text-xs shrink-0 font-medium" style={{ color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">Recent Updates</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {updates.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canViewAll && (
            <Select value={filter} onValueChange={(v) => onFilterChange(v as 'my' | 'all')}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">My Updates</SelectItem>
                <SelectItem value="all">All Updates</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0">
          {updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No recent updates</p>
            </div>
          ) : (
            <div className="space-y-2">
              {updates.map((update) => {
                const isExpanded = expandedId === update.id;

                return (
                  <div
                    key={update.id}
                    className={`p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors ${
                      isExpanded ? 'ring-1 ring-primary/20' : ''
                    }`}
                    onClick={() => onExpandedChange(isExpanded ? null : update.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">{getUpdateIcon(update.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium leading-tight truncate">
                            {update.message}
                          </span>
                          {isExpanded && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onExpandedChange(null);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                          </span>
                          <UpdateTypeDot updateType={update.updateType} />
                          {update.authorName && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                                {getUserInitials(update.authorName)}
                              </span>
                              {update.authorName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        {isExpanded && update.updateData?.description && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {update.updateData.description as string}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateClick(update);
                              }}
                            >
                              Edit Update
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default DashboardUpdatesPanel;

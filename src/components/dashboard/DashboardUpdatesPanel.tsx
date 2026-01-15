import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { DashboardUpdate } from '@/hooks/useDashboardData';
import { BasePanel, PanelListItem } from '@/components/shared/Panel';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface DashboardUpdatesPanelProps {
  updates: DashboardUpdate[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onUpdateClick: (update: DashboardUpdate) => void;
  /**
   * @deprecated Since: 2026-01-15
   * Reason: Inline expand replaced with dedicated Update Details page
   * Migration: Navigate to /cases/:caseId/updates/:updateId
   * Remove after: Next major release
   */
  expandedId?: string | null;
  /**
   * @deprecated Since: 2026-01-15
   * Reason: Inline expand replaced with dedicated Update Details page
   * Migration: Navigate to /cases/:caseId/updates/:updateId
   * Remove after: Next major release
   */
  onExpandedChange?: (id: string | null) => void;
  updateTypePicklists: { value: string; color: string | null }[];
  isLoading?: boolean;
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

export function DashboardUpdatesPanel({
  updates,
  filter,
  onFilterChange,
  canViewAll,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateClick,
  // @deprecated - Props kept for backwards compatibility, no longer used
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expandedId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onExpandedChange,
  updateTypePicklists,
  isLoading = false,
}: DashboardUpdatesPanelProps) {
  const navigate = useNavigate();

  const filterOptions = canViewAll
    ? [
        { value: 'my', label: 'My Updates' },
        { value: 'all', label: 'All Updates' },
      ]
    : [];

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

  /**
   * Navigate to the dedicated Update Details page
   * @deprecated Previous behavior: Inline expand to show description
   * New behavior: Navigate to /cases/:caseId/updates/:updateId
   */
  const handleUpdateClick = (update: DashboardUpdate) => {
    navigate(`/cases/${update.caseId}/updates/${update.id}`);
  };

  return (
    <BasePanel
      title="Recent Updates"
      count={updates.length}
      emptyIcon={Bell}
      emptyMessage="No recent updates"
      showFilter={canViewAll}
      filterOptions={filterOptions}
      filterValue={filter}
      onFilterChange={(v) => onFilterChange(v as 'my' | 'all')}
      filterWidth="w-[120px]"
      isLoading={isLoading}
    >
      {updates.map((update) => {
        return (
          <PanelListItem
            key={update.id}
            onClick={() => handleUpdateClick(update)}
            isExpanded={false}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{getUpdateIcon(update.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium leading-tight truncate">
                    {update.message}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                  </span>
                  <UpdateTypeDot updateType={update.updateType} />
                  {update.authorName && (
                    <UserAvatar name={update.authorName} size="xs" showName />
                  )}
                </div>
                {/**
                 * @deprecated Since: 2026-01-15
                 * Previous behavior: Inline expanded content showing description and Edit button
                 * This content block has been removed in favor of the dedicated Update Details page.
                 * The following JSX was removed:
                 * 
                 * {isExpanded && update.updateData?.description && (
                 *   <div className="mt-3 pt-3 border-t">
                 *     <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                 *       {update.updateData.description as string}
                 *     </p>
                 *     <Button variant="outline" size="sm" className="mt-2" onClick={(e) => { ... }}>
                 *       Edit Update
                 *     </Button>
                 *   </div>
                 * )}
                 */}
              </div>
            </div>
          </PanelListItem>
        );
      })}
    </BasePanel>
  );
}

export default DashboardUpdatesPanel;

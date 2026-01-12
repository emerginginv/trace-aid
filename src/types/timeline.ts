export type TimelineEntryType = 'case' | 'subject' | 'update' | 'event' | 'attachment' | 'system';

export interface TimelineEntry {
  id: string;
  entryType: TimelineEntryType;
  action: string; // 'created', 'updated', 'archived', 'added', 'status_changed', 'completed'
  timestamp: string;
  title: string;
  subtitle?: string;
  details?: Record<string, unknown>;
  sourceId: string;
  sourceTable: string;
  userId?: string;
  userName?: string;
}

export interface TimelineFilters {
  entryType: 'all' | TimelineEntryType;
  sortDirection: 'asc' | 'desc';
}

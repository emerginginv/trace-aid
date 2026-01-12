import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TimelineEntry, TimelineEntryType } from "@/types/timeline";
import { usePermissions } from "@/hooks/usePermissions";

interface UseCaseTimelineOptions {
  caseId: string;
  entryTypeFilter: 'all' | TimelineEntryType;
  sortDirection: 'asc' | 'desc';
  pageSize?: number;
}

interface UseCaseTimelineResult {
  entries: TimelineEntry[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useCaseTimeline({
  caseId,
  entryTypeFilter,
  sortDirection,
  pageSize = 20,
}: UseCaseTimelineOptions): UseCaseTimelineResult {
  const [allEntries, setAllEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(pageSize);
  const { hasPermission } = usePermissions();

  const fetchTimelineData = useCallback(async () => {
    if (!caseId) return;
    
    setLoading(true);
    
    try {
      // Fetch user profiles for name lookups
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      
      const profileMap = new Map(
        (profiles || []).map(p => [p.id, p.full_name || p.email || "Unknown"])
      );

      // Parallel fetch from all data sources
      const [
        caseResult,
        subjectsResult,
        updatesResult,
        activitiesResult,
        attachmentsResult,
      ] = await Promise.all([
        // Case data
        supabase
          .from("cases")
          .select("id, created_at, user_id, status")
          .eq("id", caseId)
          .single(),
        
        // Subjects
        supabase
          .from("case_subjects")
          .select("id, name, subject_type, created_at, updated_at, archived_at, user_id, is_primary")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
        
        // Updates
        supabase
          .from("case_updates")
          .select("id, title, update_type, created_at, user_id, is_ai_summary")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
        
        // Activities (events, tasks, status changes)
        supabase
          .from("case_activities")
          .select("id, title, activity_type, created_at, completed, completed_at, user_id, status")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
        
        // Attachments
        supabase
          .from("case_attachments")
          .select("id, file_name, file_type, created_at, user_id")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
      ]);

      const entries: TimelineEntry[] = [];

      // Process case creation
      if (caseResult.data) {
        const caseData = caseResult.data;
        entries.push({
          id: `case-created-${caseData.id}`,
          entryType: 'case',
          action: 'created',
          timestamp: caseData.created_at,
          title: 'Case created',
          subtitle: `By ${profileMap.get(caseData.user_id) || 'Unknown'}`,
          sourceId: caseData.id,
          sourceTable: 'cases',
          userId: caseData.user_id,
          userName: profileMap.get(caseData.user_id),
        });
      }

      // Process subjects
      if (subjectsResult.data) {
        for (const subject of subjectsResult.data) {
          // Subject created
          entries.push({
            id: `subject-created-${subject.id}`,
            entryType: 'subject',
            action: 'added',
            timestamp: subject.created_at,
            title: `${subject.subject_type.charAt(0).toUpperCase() + subject.subject_type.slice(1)} subject added: ${subject.name}`,
            subtitle: subject.is_primary ? 'Primary subject' : undefined,
            sourceId: subject.id,
            sourceTable: 'case_subjects',
            userId: subject.user_id,
            userName: profileMap.get(subject.user_id),
          });

          // Subject updated (if different from created)
          if (subject.updated_at && subject.updated_at !== subject.created_at) {
            entries.push({
              id: `subject-updated-${subject.id}`,
              entryType: 'subject',
              action: 'updated',
              timestamp: subject.updated_at,
              title: `${subject.subject_type.charAt(0).toUpperCase() + subject.subject_type.slice(1)} updated: ${subject.name}`,
              sourceId: subject.id,
              sourceTable: 'case_subjects',
              userId: subject.user_id,
              userName: profileMap.get(subject.user_id),
            });
          }

          // Subject archived
          if (subject.archived_at) {
            entries.push({
              id: `subject-archived-${subject.id}`,
              entryType: 'subject',
              action: 'archived',
              timestamp: subject.archived_at,
              title: `Subject archived: ${subject.name}`,
              sourceId: subject.id,
              sourceTable: 'case_subjects',
              userId: subject.user_id,
              userName: profileMap.get(subject.user_id),
            });
          }
        }
      }

      // Process updates
      if (updatesResult.data) {
        for (const update of updatesResult.data) {
          entries.push({
            id: `update-created-${update.id}`,
            entryType: 'update',
            action: 'added',
            timestamp: update.created_at || new Date().toISOString(),
            title: update.is_ai_summary 
              ? 'AI-assisted summary saved' 
              : `Update added: ${update.title}`,
            subtitle: update.is_ai_summary 
              ? 'AI-generated content' 
              : (update.update_type || 'General'),
            sourceId: update.id,
            sourceTable: 'case_updates',
            userId: update.user_id,
            userName: profileMap.get(update.user_id),
          });
        }
      }

      // Process activities (events, tasks, status changes)
      if (activitiesResult.data) {
        for (const activity of activitiesResult.data) {
          // Status change activities go to system type
          if (activity.activity_type === 'Status Change') {
            entries.push({
              id: `system-status-${activity.id}`,
              entryType: 'system',
              action: 'status_changed',
              timestamp: activity.created_at,
              title: activity.title,
              sourceId: activity.id,
              sourceTable: 'case_activities',
              userId: activity.user_id,
              userName: profileMap.get(activity.user_id),
            });
          } else {
            // Regular event/task
            entries.push({
              id: `event-created-${activity.id}`,
              entryType: 'event',
              action: activity.completed ? 'completed' : 'created',
              timestamp: activity.created_at,
              title: `${activity.activity_type === 'Task' ? 'Task' : 'Event'} ${activity.completed ? 'completed' : 'logged'}: ${activity.title}`,
              subtitle: activity.activity_type,
              sourceId: activity.id,
              sourceTable: 'case_activities',
              userId: activity.user_id,
              userName: profileMap.get(activity.user_id),
            });

            // If completed at a different time, add completion entry
            if (activity.completed && activity.completed_at && activity.completed_at !== activity.created_at) {
              entries.push({
                id: `event-completed-${activity.id}`,
                entryType: 'event',
                action: 'completed',
                timestamp: activity.completed_at,
                title: `Task completed: ${activity.title}`,
                sourceId: activity.id,
                sourceTable: 'case_activities',
                userId: activity.user_id,
                userName: profileMap.get(activity.user_id),
              });
            }
          }
        }
      }

      // Process attachments
      if (attachmentsResult.data) {
        for (const attachment of attachmentsResult.data) {
          entries.push({
            id: `attachment-added-${attachment.id}`,
            entryType: 'attachment',
            action: 'added',
            timestamp: attachment.created_at,
            title: `Attachment added: ${attachment.file_name}`,
            subtitle: attachment.file_type,
            sourceId: attachment.id,
            sourceTable: 'case_attachments',
            userId: attachment.user_id,
            userName: profileMap.get(attachment.user_id),
          });
        }
      }

      setAllEntries(entries);
    } catch (error) {
      console.error("Error fetching timeline data:", error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  // Filter entries based on permissions
  const permissionFilteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      switch (entry.entryType) {
        case 'subject':
          return hasPermission('view_subjects') || hasPermission('edit_subjects');
        case 'update':
          return hasPermission('view_updates') || hasPermission('edit_updates');
        case 'event':
          return hasPermission('view_activities') || hasPermission('edit_activities');
        case 'attachment':
          return hasPermission('view_attachments') || hasPermission('edit_attachments');
        case 'case':
        case 'system':
        default:
          return true; // Case and system entries always visible
      }
    });
  }, [allEntries, hasPermission]);

  // Apply entry type filter
  const filteredEntries = useMemo(() => {
    if (entryTypeFilter === 'all') {
      return permissionFilteredEntries;
    }
    return permissionFilteredEntries.filter(entry => entry.entryType === entryTypeFilter);
  }, [permissionFilteredEntries, entryTypeFilter]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredEntries, sortDirection]);

  // Paginate entries
  const paginatedEntries = useMemo(() => {
    return sortedEntries.slice(0, displayCount);
  }, [sortedEntries, displayCount]);

  const hasMore = displayCount < sortedEntries.length;

  const loadMore = useCallback(() => {
    setDisplayCount(prev => prev + pageSize);
  }, [pageSize]);

  const refresh = useCallback(() => {
    setDisplayCount(pageSize);
    fetchTimelineData();
  }, [fetchTimelineData, pageSize]);

  return {
    entries: paginatedEntries,
    loading,
    hasMore,
    loadMore,
    refresh,
  };
}

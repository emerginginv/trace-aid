import { useState, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { History, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimelineEntryComponent, TimelineFilters } from "./timeline";
import { useCaseTimeline } from "@/hooks/use-case-timeline";
import { TimelineEntry, TimelineEntryType } from "@/types/timeline";

interface CaseTimelineProps {
  caseId: string;
}

export function CaseTimeline({ caseId }: CaseTimelineProps) {
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | TimelineEntryType>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { entries, loading, hasMore, loadMore } = useCaseTimeline({
    caseId,
    entryTypeFilter,
    sortDirection,
    pageSize: 20,
  });

  const handleNavigate = useCallback((entry: TimelineEntry) => {
    // Navigate to the source record's tab or detail page
    switch (entry.sourceTable) {
      case 'case_subjects':
        setSearchParams({ tab: 'subjects' }, { replace: true });
        break;
      case 'case_updates':
        /**
         * @deprecated Since: 2026-01-15
         * Previous behavior: setSearchParams({ tab: 'updates' }, { replace: true });
         * New behavior: Navigate directly to dedicated Update Details page
         */
        navigate(`/cases/${caseId}/updates/${entry.sourceId}`);
        break;
      case 'case_activities':
        setSearchParams({ tab: 'activities' }, { replace: true });
        break;
      case 'case_attachments':
        setSearchParams({ tab: 'attachments' }, { replace: true });
        break;
      case 'cases':
        setSearchParams({ tab: 'info' }, { replace: true });
        break;
      default:
        break;
    }
  }, [setSearchParams, navigate, caseId]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <History className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <CardTitle className="text-lg">Timeline</CardTitle>
              <CardDescription className="mt-1">
                Chronological history of all case activity
              </CardDescription>
            </div>
          </div>
          <TimelineFilters
            entryTypeFilter={entryTypeFilter}
            onEntryTypeChange={setEntryTypeFilter}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No timeline entries found</p>
            {entryTypeFilter !== 'all' && (
              <p className="text-sm text-muted-foreground mt-1">
                Try changing the filter to see more entries
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            {entries.map((entry, index) => (
              <TimelineEntryComponent
                key={entry.id}
                entry={entry}
                onNavigate={handleNavigate}
                isLast={index === entries.length - 1}
              />
            ))}

            {hasMore && (
              <div className="pt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

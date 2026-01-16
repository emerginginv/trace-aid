import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { useCaseUpdatesQuery } from "@/hooks/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Users, Bot, Clock, MoreVertical, Eye, ExternalLink } from "lucide-react";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { HelpfulHeader } from "@/components/help-center/ContextualHelp";
import { format, subDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseSelectorDialog } from "@/components/shared/CaseSelectorDialog";
import { UpdateForm } from "@/components/case-detail/UpdateForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCardsGrid, StatCardConfig, StatCardsGridSkeleton } from "@/components/shared/StatCardsGrid";
import { FilterToolbar } from "@/components/shared/FilterToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { UpdateCard } from "@/components/shared/UpdateCard";

interface UpdateWithCase {
  id: string;
  case_id: string;
  organization_id?: string | null;
  title: string;
  description?: string | null;
  update_type: string;
  is_ai_summary?: boolean | null;
  created_at?: string | null;
  user_id: string;
  cases: { id: string; case_number: string; title: string };
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

type UpdateCountKey = 'caseUpdates' | 'clientContacts' | 'aiSummaries' | 'thisWeek';

const STAT_CARDS: StatCardConfig<UpdateCountKey>[] = [
  { key: 'caseUpdates', label: 'Case Updates', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10', filterValue: 'Case Update' },
  { key: 'clientContacts', label: 'Client Contacts', icon: Users, color: 'text-green-500', bgColor: 'bg-green-500/10', filterValue: 'Client Contact' },
  { key: 'aiSummaries', label: 'AI Summaries', icon: Bot, color: 'text-purple-500', bgColor: 'bg-purple-500/10', filterValue: 'ai' },
  { key: 'thisWeek', label: 'This Week', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10', filterValue: 'week' },
];

const UPDATE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "Case Update", label: "Case Update" },
  { value: "Client Contact", label: "Client Contact" },
  { value: "3rd-Party Contact", label: "3rd-Party Contact" },
  { value: "Surveillance", label: "Surveillance" },
  { value: "Accounting", label: "Accounting" },
  { value: "Other", label: "Other" },
];

const getUpdateTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'Case Update': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Client Contact': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case '3rd-Party Contact': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'Surveillance': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'Accounting': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
    default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "update_type", label: "Type" },
  { key: "case_number", label: "Case #", format: (_, row) => row.cases?.case_number || "-" },
  { key: "author", label: "Author", format: (_, row) => row.author?.full_name || "Unknown" },
  { key: "is_ai_summary", label: "AI Summary", format: (v) => v ? "Yes" : "No" },
  { key: "created_at", label: "Created", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
];

export default function Updates() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { navigateWithSource } = useNavigationSource();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [specialFilter, setSpecialFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('updates-view-mode') as 'list' | 'cards') || 'list';
  });

  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const { data: rawUpdates = [], isLoading } = useCaseUpdatesQuery({ limit: 500 });
  const [enrichedUpdates, setEnrichedUpdates] = useState<UpdateWithCase[]>([]);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => { localStorage.setItem('updates-view-mode', viewMode); }, [viewMode]);

  useEffect(() => {
    const enrichUpdates = async () => {
      if (rawUpdates.length === 0) { setEnrichedUpdates([]); return; }
      setEnriching(true);
      try {
        const caseIds = [...new Set(rawUpdates.map(u => u.case_id))];
        const userIds = [...new Set(rawUpdates.map(u => u.user_id))];

        const [casesResult, usersResult] = await Promise.all([
          caseIds.length > 0 ? supabase.from("cases").select("id, case_number, title").in("id", caseIds) : { data: [] },
          userIds.length > 0 ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds) : { data: [] },
        ]);

        const casesMap = (casesResult.data || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, any>);
        const usersMap = (usersResult.data || []).reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, any>);

        const enriched = rawUpdates
          .filter(u => casesMap[u.case_id])
          .map(u => ({
            ...u,
            cases: casesMap[u.case_id],
            author: usersMap[u.user_id] || null,
          }));

        setEnrichedUpdates(enriched);
      } catch (error) {
        console.error("Error enriching updates:", error);
      } finally {
        setEnriching(false);
      }
    };
    enrichUpdates();
  }, [rawUpdates]);

  const counts = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    return enrichedUpdates.reduce((acc, u) => {
      if (u.update_type === 'Case Update') acc.caseUpdates++;
      if (u.update_type === 'Client Contact') acc.clientContacts++;
      if (u.is_ai_summary) acc.aiSummaries++;
      if (u.created_at && isAfter(new Date(u.created_at), oneWeekAgo)) acc.thisWeek++;
      return acc;
    }, { caseUpdates: 0, clientContacts: 0, aiSummaries: 0, thisWeek: 0 } as Record<UpdateCountKey, number>);
  }, [enrichedUpdates]);

  const handleStatCardClick = (key: UpdateCountKey, filterValue?: string) => {
    if (filterValue === 'ai' || filterValue === 'week') {
      setSpecialFilter(specialFilter === filterValue ? null : filterValue);
      setTypeFilter('all');
    } else if (filterValue) {
      setTypeFilter(typeFilter === filterValue ? 'all' : filterValue);
      setSpecialFilter(null);
    }
  };

  const filteredUpdates = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    return enrichedUpdates.filter((update) => {
      if (typeFilter !== "all" && update.update_type !== typeFilter) return false;
      if (specialFilter === 'ai' && !update.is_ai_summary) return false;
      if (specialFilter === 'week' && (!update.created_at || !isAfter(new Date(update.created_at), oneWeekAgo))) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!update.title.toLowerCase().includes(query) &&
            !update.description?.toLowerCase().includes(query) &&
            !update.cases.case_number.toLowerCase().includes(query) &&
            !update.author?.full_name?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedUpdates, typeFilter, specialFilter, searchQuery]);

  const loading = isLoading || enriching;

  if (permissionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <StatCardsGridSkeleton />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!hasPermission('view_updates')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium">Access Restricted</h3>
          <p className="text-muted-foreground mt-2">You don't have permission to view updates.</p>
        </Card>
      </div>
    );
  }

  const navigateToUpdate = (update: UpdateWithCase) => navigateWithSource(navigate, `/updates/${update.id}`, 'updates_list');

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Updates"
        titleComponent={
          <HelpfulHeader feature="global_updates">
            <h1 className="text-2xl font-bold tracking-tight">All Updates</h1>
          </HelpfulHeader>
        }
        description="View and manage updates across all cases"
        showAddButton={hasPermission('add_updates')}
        addButtonLabel="Add Update"
        onAddClick={() => setShowCaseSelector(true)}
      />

      <StatCardsGrid
        stats={STAT_CARDS}
        counts={counts}
        activeFilter={specialFilter || (typeFilter !== 'all' ? typeFilter : undefined)}
        onStatClick={handleStatCardClick}
        isLoading={loading}
      />

      <FilterToolbar
        searchPlaceholder="Search updates, cases, or authors..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[{ value: typeFilter, onChange: (v) => { setTypeFilter(v); setSpecialFilter(null); }, options: UPDATE_TYPES, placeholder: "Update Type", width: "w-[180px]" }]}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle
        showExport
        onExportCSV={() => exportToCSV(filteredUpdates, EXPORT_COLUMNS, "updates")}
        onExportPDF={() => exportToPDF(filteredUpdates, EXPORT_COLUMNS, "All Updates", "updates")}
        importTemplateFileName="07_Updates.csv"
        importEntityDisplayName="Updates"
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filteredUpdates.length === 0 ? (
        <EmptyState icon={FileText} title="No updates found" description="Try adjusting your filters" />
      ) : viewMode === 'list' ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Update</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUpdates.map((update) => (
                <TableRow key={update.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigateToUpdate(update)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={update.author?.full_name} avatarUrl={update.author?.avatar_url} size="md" />
                      <div>
                        <div className="font-medium line-clamp-1">{update.title}</div>
                        {update.is_ai_summary && (
                          <div className="flex items-center gap-1 text-xs text-[hsl(270,85%,55%)] dark:text-[hsl(270,85%,65%)]">
                            <Bot className="h-3 w-3" />AI Summary
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={getUpdateTypeBadgeColor(update.update_type)}>{update.update_type}</Badge></TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{update.cases.case_number}</div>
                      <div className="text-muted-foreground truncate max-w-[200px]">{update.cases.title}</div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm">{update.author?.full_name || "Unknown"}</span></TableCell>
                  <TableCell className="text-muted-foreground">{update.created_at ? format(new Date(update.created_at), "MMM d, yyyy") : "-"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigateToUpdate(update)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/cases/${update.cases.id}`)}><ExternalLink className="h-4 w-4 mr-2" />Go to Case</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUpdates.map((update) => (
            <UpdateCard
              key={update.id}
              update={{
                id: update.id,
                title: update.title,
                description: update.description,
                update_type: update.update_type,
                is_ai_summary: update.is_ai_summary,
                created_at: update.created_at,
                case_number: update.cases.case_number,
                case_title: update.cases.title,
                author_name: update.author?.full_name,
                author_avatar: update.author?.avatar_url,
              }}
              onClick={() => navigateToUpdate(update)}
            />
          ))}
        </div>
      )}

      <CaseSelectorDialog
        open={showCaseSelector}
        onOpenChange={setShowCaseSelector}
        onSelectCase={(caseId) => { setSelectedCaseId(caseId); setShowUpdateForm(true); }}
        title="Select a Case"
        description="Choose a case to add a new update to"
      />

      {selectedCaseId && organization?.id && (
        <UpdateForm
          caseId={selectedCaseId}
          open={showUpdateForm}
          onOpenChange={(open) => { setShowUpdateForm(open); if (!open) setSelectedCaseId(null); }}
          onSuccess={() => { setShowUpdateForm(false); setSelectedCaseId(null); }}
          organizationId={organization.id}
        />
      )}
    </div>
  );
}

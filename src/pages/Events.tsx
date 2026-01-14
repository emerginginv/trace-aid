import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { useEventsQuery } from "@/hooks/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, Users, Phone, Car, MoreVertical, Eye, ExternalLink, MapPin } from "lucide-react";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseSelectorDialog } from "@/components/shared/CaseSelectorDialog";
import { ActivityForm } from "@/components/case-detail/ActivityForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCardsGrid, StatCardConfig, StatCardsGridSkeleton } from "@/components/shared/StatCardsGrid";
import { FilterToolbar } from "@/components/shared/FilterToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface EventWithCase {
  id: string;
  case_id: string;
  activity_type: string;
  title: string;
  description?: string | null;
  status: string;
  due_date?: string | null;
  address?: string | null;
  completed?: boolean | null;
  completed_at?: string | null;
  assigned_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  service_name?: string | null;
  cases: { id: string; case_number: string; title: string };
  assigned_user?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

type EventCountKey = 'total' | 'meetings' | 'calls' | 'fieldWork';

const STAT_CARDS: StatCardConfig<EventCountKey>[] = [
  { key: 'total', label: 'Total Events', icon: Calendar, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'meetings', label: 'Meetings', icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { key: 'calls', label: 'Calls', icon: Phone, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { key: 'fieldWork', label: 'Field Work', icon: Car, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
    default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  }
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "service_name", label: "Service", format: (v: any) => v || "-" },
  { key: "case_number", label: "Case #", format: (_: any, row: any) => row.cases?.case_number || "-" },
  { key: "status", label: "Status", format: (v) => STATUS_OPTIONS.find(s => s.value === v)?.label || v },
  { key: "due_date", label: "Due Date", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
  { key: "address", label: "Location", format: (v) => v || "-" },
  { key: "assigned_to", label: "Assigned To", format: (_, row) => row.assigned_user?.full_name || "-" },
];

export default function Events() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { navigateWithSource } = useNavigationSource();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('events-view-mode') as 'list' | 'cards') || 'cards';
  });

  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);

  const { data: rawEvents = [], isLoading } = useEventsQuery({ limit: 500 });
  const [enrichedEvents, setEnrichedEvents] = useState<EventWithCase[]>([]);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => { localStorage.setItem('events-view-mode', viewMode); }, [viewMode]);

  useEffect(() => {
    if (!organization?.id) return;
    fetchUsers();
  }, [organization?.id]);

  useEffect(() => {
    const enrichEvents = async () => {
      if (rawEvents.length === 0) { setEnrichedEvents([]); return; }
      setEnriching(true);
      try {
        const caseIds = [...new Set(rawEvents.map(e => e.case_id))];
        const userIds = [...new Set(rawEvents.filter(e => e.assigned_user_id).map(e => e.assigned_user_id!))];

        const [casesResult, usersResult] = await Promise.all([
          caseIds.length > 0 ? supabase.from("cases").select("id, case_number, title").in("id", caseIds) : { data: [] },
          userIds.length > 0 ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds) : { data: [] },
        ]);

        const casesMap = (casesResult.data || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, any>);
        const usersMap = (usersResult.data || []).reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, any>);

        const enriched = rawEvents
          .filter(e => casesMap[e.case_id])
          .map(e => ({
            ...e,
            cases: casesMap[e.case_id],
            assigned_user: e.assigned_user_id ? usersMap[e.assigned_user_id] || null : null,
          }));

        setEnrichedEvents(enriched);
      } catch (error) {
        console.error("Error enriching events:", error);
      } finally {
        setEnriching(false);
      }
    };
    enrichEvents();
  }, [rawEvents]);

  const fetchUsers = async () => {
    if (!organization?.id) return;
    try {
      const { data } = await supabase.from("organization_members").select("user_id, profiles(id, email, full_name)").eq("organization_id", organization.id);
      const usersList = (data || []).map((m: any) => m.profiles).filter(Boolean).map((p: any) => ({ id: p.id, email: p.email || "", full_name: p.full_name }));
      setUsers(usersList);
    } catch (error) { console.error("Error fetching users:", error); }
  };

  const counts = useMemo(() => {
    return enrichedEvents.reduce((acc, e) => {
      acc.total++;
      const serviceName = (e.service_name || '').toLowerCase();
      if (serviceName.includes('meeting')) acc.meetings++;
      if (serviceName.includes('call')) acc.calls++;
      if (serviceName.includes('field') || serviceName.includes('surveillance') || serviceName.includes('site')) acc.fieldWork++;
      return acc;
    }, { total: 0, meetings: 0, calls: 0, fieldWork: 0 } as Record<EventCountKey, number>);
  }, [enrichedEvents]);

  const filteredEvents = useMemo(() => {
    return enrichedEvents.filter((event) => {
      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(query) &&
            !event.description?.toLowerCase().includes(query) &&
            !event.cases.case_number.toLowerCase().includes(query) &&
            !event.address?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedEvents, statusFilter, searchQuery]);

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

  if (!hasPermission('view_activities')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium">Access Restricted</h3>
          <p className="text-muted-foreground mt-2">You don't have permission to view events.</p>
        </Card>
      </div>
    );
  }

  const isOverdue = (dueDate: string | null | undefined, status: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return isBefore(new Date(dueDate), new Date());
  };

  const navigateToCase = (caseId: string) => navigateWithSource(navigate, `/cases/${caseId}`, 'events_list');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="View and manage events across all cases"
        showAddButton={hasPermission('add_activities')}
        addButtonLabel="Add Event"
        onAddClick={() => setShowCaseSelector(true)}
      />

      <StatCardsGrid stats={STAT_CARDS} counts={counts} isLoading={loading} />

      <FilterToolbar
        searchPlaceholder="Search events or cases..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[{ value: statusFilter, onChange: setStatusFilter, options: STATUS_OPTIONS, placeholder: "Status" }]}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle
        showExport
        onExportCSV={() => exportToCSV(filteredEvents, EXPORT_COLUMNS, "events")}
        onExportPDF={() => exportToPDF(filteredEvents, EXPORT_COLUMNS, "Events", "events")}
        importTemplateFileName="15_Events.csv"
        importEntityDisplayName="Events"
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState icon={Calendar} title="No events found" description="Try adjusting your filters" />
      ) : viewMode === 'list' ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => {
                const overdue = isOverdue(event.due_date, event.status);
                return (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigateToCase(event.cases.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center bg-green-500/10">
                          <Calendar className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <div className="font-medium">{event.title}</div>
                          {event.description && <div className="text-sm text-muted-foreground truncate max-w-[220px]">{event.description}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{event.service_name || "General"}</Badge></TableCell>
                    <TableCell><span className="font-mono text-xs text-muted-foreground">{event.cases.case_number}</span></TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-xs", getStatusBadgeStyles(event.status))}>{STATUS_OPTIONS.find(s => s.value === event.status)?.label || event.status}</Badge></TableCell>
                    <TableCell>{event.due_date ? <span className={cn(overdue && "text-red-500 font-medium")}>{format(new Date(event.due_date), "MMM d, yyyy")}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{event.address ? <div className="flex items-center gap-1 text-sm text-muted-foreground truncate max-w-[150px]"><MapPin className="h-3 w-3 flex-shrink-0" />{event.address}</div> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      {event.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar name={event.assigned_user.full_name} avatarUrl={event.assigned_user.avatar_url} size="sm" />
                          <span className="text-sm truncate max-w-[100px]">{event.assigned_user.full_name}</span>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigateToCase(event.cases.id)}><Eye className="h-4 w-4 mr-2" />View Case</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/cases/${event.cases.id}`, '_blank')}><ExternalLink className="h-4 w-4 mr-2" />Open in New Tab</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const overdue = isOverdue(event.due_date, event.status);
            return (
              <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-all group" onClick={() => navigateToCase(event.cases.id)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center bg-green-500/10 flex-shrink-0">
                        <Calendar className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">{event.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{event.service_name || "General"}</Badge>
                          <Badge variant="outline" className={cn("text-xs", getStatusBadgeStyles(event.status))}>{STATUS_OPTIONS.find(s => s.value === event.status)?.label || event.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  {event.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{event.description}</p>}
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Case:</span>
                      <span className="font-mono text-xs">{event.cases.case_number}</span>
                    </div>
                    {event.due_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Due:</span>
                        <span className={cn(overdue && "text-red-500 font-medium")}>{format(new Date(event.due_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {event.address && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" /><span className="truncate">{event.address}</span></div>}
                    {event.assigned_user && (
                      <div className="flex items-center gap-2 pt-2">
                        <UserAvatar name={event.assigned_user.full_name} avatarUrl={event.assigned_user.avatar_url} size="sm" />
                        <span className="text-sm text-muted-foreground">{event.assigned_user.full_name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CaseSelectorDialog
        open={showCaseSelector}
        onOpenChange={setShowCaseSelector}
        onSelectCase={(caseId) => { setSelectedCaseId(caseId); setShowActivityForm(true); }}
        title="Select a Case"
        description="Choose a case to add a new event to"
      />

      {selectedCaseId && organization?.id && (
        <ActivityForm
          caseId={selectedCaseId}
          activityType="event"
          users={users}
          open={showActivityForm}
          onOpenChange={(open) => { setShowActivityForm(open); if (!open) setSelectedCaseId(null); }}
          onSuccess={() => { setShowActivityForm(false); setSelectedCaseId(null); }}
          organizationId={organization.id}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImportTemplateButton } from "@/components/ui/import-template-button";
import { Calendar, Clock, CheckCircle, Search, LayoutGrid, List, MoreVertical, Eye, ExternalLink, MapPin, Download, FileSpreadsheet, FileText, Phone, Users, Car } from "lucide-react";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface EventWithCase {
  id: string;
  case_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  address: string | null;
  event_subtype: string | null;
  completed: boolean | null;
  completed_at: string | null;
  assigned_user_id: string | null;
  created_at: string;
  updated_at: string;
  cases: {
    id: string;
    case_number: string;
    title: string;
  };
  assigned_user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface EventCounts {
  total: number;
  meetings: number;
  calls: number;
  fieldWork: number;
  completed: number;
}

const STAT_CARDS = [
  { key: 'total' as const, label: 'Total Events', icon: Calendar, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'meetings' as const, label: 'Meetings', icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { key: 'calls' as const, label: 'Calls', icon: Phone, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { key: 'fieldWork' as const, label: 'Field Work', icon: Car, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EVENT_SUBTYPE_OPTIONS = [
  { value: 'all', label: 'All Subtypes' },
  { value: 'Client Meeting', label: 'Client Meeting' },
  { value: 'Team Meeting', label: 'Team Meeting' },
  { value: 'Phone Call', label: 'Phone Call' },
  { value: 'Video Call', label: 'Video Call' },
  { value: 'Field Work', label: 'Field Work' },
  { value: 'Site Visit', label: 'Site Visit' },
  { value: 'Interview', label: 'Interview' },
  { value: 'Surveillance', label: 'Surveillance' },
  { value: 'Court Appearance', label: 'Court Appearance' },
  { value: 'Other', label: 'Other' },
];

const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'in_progress':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'cancelled':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  }
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "event_subtype", label: "Subtype", format: (v) => v || "-" },
  { key: "case_number", label: "Case #", format: (_, row) => row.cases?.case_number || "-" },
  { key: "case_title", label: "Case Title", format: (_, row) => row.cases?.title || "-" },
  { key: "status", label: "Status", format: (v) => STATUS_OPTIONS.find(s => s.value === v)?.label || v },
  { key: "due_date", label: "Due Date", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
  { key: "address", label: "Location", format: (v) => v || "-" },
  { key: "assigned_to", label: "Assigned To", format: (_, row) => row.assigned_user?.full_name || "-" },
  { key: "created_at", label: "Created", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
];

export default function Events() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { navigateWithSource } = useNavigationSource();

  const [events, setEvents] = useState<EventWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [subtypeFilter, setSubtypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('events-view-mode') as 'list' | 'cards') || 'cards';
  });

  const [counts, setCounts] = useState<EventCounts>({
    total: 0,
    meetings: 0,
    calls: 0,
    fieldWork: 0,
    completed: 0,
  });

  useEffect(() => {
    if (!organization?.id) return;
    fetchEvents();
  }, [organization?.id]);

  useEffect(() => {
    localStorage.setItem('events-view-mode', viewMode);
  }, [viewMode]);

  const fetchEvents = async () => {
    if (!organization?.id) return;
    setLoading(true);

    try {
      // Fetch only events (activity_type = 'event')
      const { data: eventsData, error: eventsError } = await supabase
        .from("case_activities")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("activity_type", "event")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (eventsError) throw eventsError;

      // Fetch cases for the events
      const caseIds = [...new Set((eventsData || []).map(a => a.case_id))];
      let casesMap: Record<string, { id: string; case_number: string; title: string }> = {};
      
      if (caseIds.length > 0) {
        const { data: cases } = await supabase
          .from("cases")
          .select("id, case_number, title")
          .in("id", caseIds);
        
        if (cases) {
          casesMap = cases.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
          }, {} as typeof casesMap);
        }
      }

      // Fetch assigned users separately
      const assignedUserIds = [...new Set((eventsData || []).filter(a => a.assigned_user_id).map(a => a.assigned_user_id))];
      
      let usersMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
      if (assignedUserIds.length > 0) {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", assignedUserIds);
        
        if (users) {
          usersMap = users.reduce((acc, u) => {
            acc[u.id] = u;
            return acc;
          }, {} as typeof usersMap);
        }
      }

      const enrichedEvents: EventWithCase[] = (eventsData || [])
        .filter(a => casesMap[a.case_id])
        .map((a) => ({
          ...a,
          cases: casesMap[a.case_id],
          assigned_user: a.assigned_user_id ? usersMap[a.assigned_user_id] || null : null,
        }));

      setEvents(enrichedEvents);

      // Calculate counts
      const newCounts: EventCounts = {
        total: enrichedEvents.length,
        meetings: 0,
        calls: 0,
        fieldWork: 0,
        completed: 0,
      };

      enrichedEvents.forEach((e) => {
        if (e.status === 'completed') newCounts.completed++;
        const subtype = e.event_subtype?.toLowerCase() || '';
        if (subtype.includes('meeting')) newCounts.meetings++;
        if (subtype.includes('call')) newCounts.calls++;
        if (subtype.includes('field') || subtype.includes('surveillance') || subtype.includes('site')) newCounts.fieldWork++;
      });

      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Subtype filter
      if (subtypeFilter !== "all" && event.event_subtype !== subtypeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && event.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDescription = event.description?.toLowerCase().includes(query);
        const matchesCaseNumber = event.cases.case_number.toLowerCase().includes(query);
        const matchesCaseTitle = event.cases.title.toLowerCase().includes(query);
        const matchesAddress = event.address?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesCaseNumber && !matchesCaseTitle && !matchesAddress) {
          return false;
        }
      }

      return true;
    });
  }, [events, subtypeFilter, statusFilter, searchQuery]);

  if (permissionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
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

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusLabel = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.label || status;
  };

  const navigateToCase = (caseId: string) => {
    navigateWithSource(navigate, `/cases/${caseId}`, 'events_list');
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return isBefore(new Date(dueDate), new Date());
  };

  const handleExportCSV = () => {
    exportToCSV(filteredEvents, EXPORT_COLUMNS, "events");
  };

  const handleExportPDF = () => {
    exportToPDF(filteredEvents, EXPORT_COLUMNS, "Events", "events");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground">View and manage events across all cases</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.key} 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => {
                if (stat.key === 'meetings') setSubtypeFilter(subtypeFilter === 'Client Meeting' ? 'all' : 'Client Meeting');
                else if (stat.key === 'calls') setSubtypeFilter(subtypeFilter === 'Phone Call' ? 'all' : 'Phone Call');
                else if (stat.key === 'fieldWork') setSubtypeFilter(subtypeFilter === 'Field Work' ? 'all' : 'Field Work');
              }}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", stat.bgColor)}>
                  <Icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts[stat.key]}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events or cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subtypeFilter} onValueChange={setSubtypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Subtype" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_SUBTYPE_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ImportTemplateButton templateFileName="15_Events.csv" entityDisplayName="Events" />
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No events found</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Subtype</TableHead>
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
                  <TableRow
                    key={event.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigateToCase(event.cases.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center bg-green-500/10">
                          <Calendar className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <div className="font-medium">{event.title}</div>
                          {event.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[220px]">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {event.event_subtype || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {event.cases.case_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", getStatusBadgeStyles(event.status))}>
                        {getStatusLabel(event.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.due_date ? (
                        <span className={cn(overdue && "text-red-500 font-medium")}>
                          {format(new Date(event.due_date), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.address ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground truncate max-w-[150px]">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {event.address}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={event.assigned_user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(event.assigned_user.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[100px]">
                            {event.assigned_user.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigateToCase(event.cases.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Case
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/cases/${event.cases.id}`, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in New Tab
                          </DropdownMenuItem>
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
              <Card
                key={event.id}
                className="cursor-pointer hover:shadow-lg transition-all group"
                onClick={() => navigateToCase(event.cases.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center bg-green-500/10 flex-shrink-0">
                        <Calendar className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {event.event_subtype || "General"}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", getStatusBadgeStyles(event.status))}>
                            {getStatusLabel(event.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigateToCase(event.cases.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Case
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/cases/${event.cases.id}`, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in New Tab
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Case:</span>
                      <span className="font-mono text-xs">{event.cases.case_number}</span>
                    </div>
                    {event.due_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Due:</span>
                        <span className={cn(overdue && "text-red-500 font-medium")}>
                          {format(new Date(event.due_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    {event.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.address}</span>
                      </div>
                    )}
                    {event.assigned_user && (
                      <div className="flex items-center gap-2 pt-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={event.assigned_user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(event.assigned_user.full_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {event.assigned_user.full_name}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

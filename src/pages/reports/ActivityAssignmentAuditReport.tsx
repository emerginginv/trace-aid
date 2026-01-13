import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { format, startOfMonth, endOfMonth, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";

interface ActivityRow {
  id: string;
  title: string;
  caseId: string;
  caseNumber: string;
  assignedToId: string | null;
  assignedToName: string;
  activityType: string;
  calendarName: string;
  calendarColor: string;
  service: string | null;
  status: string;
  assignedDate: string;
  dueDate: string | null;
  completedAt: string | null;
  timeToComplete: string;
}

interface StaffMember {
  id: string;
  name: string;
  color?: string;
}

interface CaseType {
  value: string;
  label: string;
}

const calculateTimeToComplete = (createdAt: string, completedAt: string | null): string => {
  if (!completedAt) return "";
  const start = new Date(createdAt);
  const end = new Date(completedAt);
  
  const days = differenceInDays(end, start);
  const hours = differenceInHours(end, start) % 24;
  const minutes = differenceInMinutes(end, start) % 60;
  const seconds = differenceInSeconds(end, start) % 60;
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "complete":
    case "completed":
      return "bg-green-500";
    case "in progress":
    case "in_progress":
      return "bg-blue-500";
    case "not started":
    case "not_started":
    case "pending":
      return "bg-gray-400";
    case "cancelled":
    case "canceled":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
};

// Default calendar colors for staff members
const CALENDAR_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#8B5CF6", // purple
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
];

export default function ActivityAssignmentAuditReport() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [caseManagers, setCaseManagers] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedActivityType, setSelectedActivityType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCalendar, setSelectedCalendar] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [selectedAssignedTo, setSelectedAssignedTo] = useState("all");
  const [selectedCaseType, setSelectedCaseType] = useState("all");
  const [selectedCaseManager, setSelectedCaseManager] = useState("all");
  const [hideSearch, setHideSearch] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<keyof ActivityRow>("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!organizationId) return;

      // Fetch staff members via organization_members
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId);

      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
          .order("full_name");

        if (profiles) {
          const staff = profiles.map((p, index) => ({
            id: p.id,
            name: p.full_name || "Unknown",
            color: CALENDAR_COLORS[index % CALENDAR_COLORS.length],
          }));
          setStaffMembers(staff);
          setCaseManagers(staff);
        }
      }

      // Fetch unique services (event_subtype) from case_activities
      const { data: activityServices } = await supabase
        .from("case_activities")
        .select("event_subtype")
        .eq("organization_id", organizationId)
        .not("event_subtype", "is", null);

      if (activityServices) {
        const uniqueServices = [...new Set(activityServices.map((a) => a.event_subtype).filter(Boolean))] as string[];
        setServices(uniqueServices);
      }

      // Fetch unique case types from cases
      const { data: cases } = await supabase
        .from("cases")
        .select("case_type_tag")
        .eq("organization_id", organizationId)
        .not("case_type_tag", "is", null);

      if (cases) {
        const uniqueCaseTypes = [...new Set(cases.map((c) => c.case_type_tag).filter(Boolean))];
        setCaseTypes(uniqueCaseTypes.map((ct) => ({ value: ct!, label: ct! })));
      }
    };

    fetchFilterOptions();
  }, [organizationId]);

  const fetchActivities = async () => {
    if (!organizationId) return;
    setIsLoading(true);

    try {
      // Build query
      let query = supabase
        .from("case_activities")
        .select(`
          id,
          title,
          activity_type,
          status,
          due_date,
          event_subtype,
          created_at,
          completed,
          completed_at,
          assigned_user_id,
          case_id,
          organization_id
        `)
        .eq("organization_id", organizationId)
        .order("due_date", { ascending: false });

      // Apply date range filter
      if (startDate) {
        query = query.gte("due_date", startDate);
      }
      if (endDate) {
        query = query.lte("due_date", endDate);
      }

      if (selectedActivityType !== "all") {
        query = query.eq("activity_type", selectedActivityType);
      }

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      if (selectedAssignedTo !== "all") {
        query = query.eq("assigned_user_id", selectedAssignedTo);
      }

      if (selectedCalendar !== "all") {
        query = query.eq("assigned_user_id", selectedCalendar);
      }

      if (selectedService !== "all") {
        query = query.eq("event_subtype", selectedService);
      }

      const { data: activityData, error } = await query;

      if (error) throw error;

      if (!activityData || activityData.length === 0) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      // Get unique IDs for related data
      const userIds = [...new Set(activityData.map((a) => a.assigned_user_id).filter(Boolean))];
      const caseIds = [...new Set(activityData.map((a) => a.case_id).filter(Boolean))];

      // Fetch related data in parallel
      const [profilesResult, casesResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", userIds)
          : Promise.resolve({ data: [] }),
        caseIds.length > 0
          ? supabase.from("cases").select("id, case_number, case_type_tag, case_manager_id").in("id", caseIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map(
        (profilesResult.data || []).map((p) => [p.id, p.full_name || "Unknown"])
      );
      const casesMap = new Map(
        (casesResult.data || []).map((c) => [c.id, { 
          caseNumber: c.case_number, 
          caseType: c.case_type_tag,
          caseManagerId: c.case_manager_id 
        }])
      );

      // Filter by case type if selected
      let filteredActivities = activityData;
      if (selectedCaseType !== "all") {
        const caseTypeCaseIds = new Set(
          (casesResult.data || [])
            .filter((c) => c.case_type_tag === selectedCaseType)
            .map((c) => c.id)
        );
        filteredActivities = activityData.filter((a) => a.case_id && caseTypeCaseIds.has(a.case_id));
      }

      // Filter by case manager if selected
      if (selectedCaseManager !== "all") {
        const caseManagerCaseIds = new Set(
          (casesResult.data || [])
            .filter((c) => c.case_manager_id === selectedCaseManager)
            .map((c) => c.id)
        );
        filteredActivities = filteredActivities.filter((a) => a.case_id && caseManagerCaseIds.has(a.case_id));
      }

      // Map to ActivityRow format
      const staffColorMap = new Map(staffMembers.map((s) => [s.id, s.color || CALENDAR_COLORS[0]]));
      
      const mappedActivities: ActivityRow[] = filteredActivities.map((activity) => {
        const caseInfo = activity.case_id ? casesMap.get(activity.case_id) : null;
        const assignedUserName = activity.assigned_user_id ? (profilesMap.get(activity.assigned_user_id) || "Unassigned") : "Unassigned";
        const calendarColor = activity.assigned_user_id ? (staffColorMap.get(activity.assigned_user_id) || CALENDAR_COLORS[0]) : CALENDAR_COLORS[0];
        
        return {
          id: activity.id,
          title: activity.title,
          caseId: activity.case_id || "",
          caseNumber: caseInfo?.caseNumber || "-",
          assignedToId: activity.assigned_user_id,
          assignedToName: assignedUserName,
          activityType: activity.activity_type === "task" ? "Task" : "Event",
          calendarName: assignedUserName,
          calendarColor: calendarColor,
          service: activity.event_subtype,
          status: activity.status || "Not Started",
          assignedDate: activity.created_at,
          dueDate: activity.due_date,
          completedAt: activity.completed_at,
          timeToComplete: calculateTimeToComplete(activity.created_at, activity.completed_at),
        };
      });

      setActivities(mappedActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when organization changes
  useEffect(() => {
    fetchActivities();
  }, [organizationId]);

  // Sort data
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === "asc" ? 1 : -1;
      if (bValue === null) return sortDirection === "asc" ? -1 : 1;
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  }, [activities, sortField, sortDirection]);

  // Paginate data
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedActivities.slice(start, start + pageSize);
  }, [sortedActivities, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedActivities.length / pageSize);
  const showingStart = sortedActivities.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * pageSize, sortedActivities.length);

  const handleSort = (field: keyof ActivityRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "MM/dd/yyyy hh:mm a");
  };

  const SortIcon = ({ field }: { field: keyof ActivityRow }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Reports
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Activity Assignment Audit</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Activity Assignment Audit</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(startDate), "MM/dd/yyyy")} - {format(new Date(endDate), "MM/dd/yyyy")}
        </p>
      </div>

      {/* Filters */}
      <Collapsible open={!hideSearch} onOpenChange={(open) => setHideSearch(!open)}>
        <Card className="print:hidden">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {hideSearch ? "Show Search" : "Hide Search"}
                  {hideSearch ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronUp className="h-4 w-4 ml-1" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Activity Type */}
                <div className="space-y-2">
                  <Label>Activity Type</Label>
                  <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Activities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activities</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="event">Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Calendar */}
                <div className="space-y-2">
                  <Label>Calendar</Label>
                  <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Calendars" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Calendars</SelectItem>
                      {staffMembers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: staff.color }}
                            />
                            {staff.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service */}
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned To */}
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Select value={selectedAssignedTo} onValueChange={setSelectedAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {staffMembers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Case Type */}
                <div className="space-y-2">
                  <Label>Case Type</Label>
                  <Select value={selectedCaseType} onValueChange={setSelectedCaseType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Case Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Case Types</SelectItem>
                      {caseTypes.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>
                          {ct.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Case Manager */}
                <div className="space-y-2">
                  <Label>Case Manager</Label>
                  <Select value={selectedCaseManager} onValueChange={setSelectedCaseManager}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Case Managers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Case Managers</SelectItem>
                      {caseManagers.map((cm) => (
                        <SelectItem key={cm.id} value={cm.id}>
                          {cm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={fetchActivities} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Update"}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {showingStart} - {showingEnd} of {sortedActivities.length}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("title")}
                >
                  Activity <SortIcon field="title" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("assignedToName")}
                >
                  Assigned To <SortIcon field="assignedToName" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("activityType")}
                >
                  Type <SortIcon field="activityType" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("calendarName")}
                >
                  Calendar <SortIcon field="calendarName" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("service")}
                >
                  Service <SortIcon field="service" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("status")}
                >
                  Status <SortIcon field="status" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("assignedDate")}
                >
                  Assigned <SortIcon field="assignedDate" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("dueDate")}
                >
                  Start / Due <SortIcon field="dueDate" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("completedAt")}
                >
                  Completed <SortIcon field="completedAt" />
                </TableHead>
                <TableHead>Time to Complete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No activities found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div>
                        <Link 
                          to={`/cases/${activity.caseId}`} 
                          className="text-primary hover:underline font-medium"
                        >
                          {activity.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {activity.caseNumber}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {activity.assignedToId ? (
                        <Link 
                          to={`/users/${activity.assignedToId}`}
                          className="text-primary hover:underline"
                        >
                          {activity.assignedToName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>{activity.activityType}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="border-0"
                        style={{ 
                          backgroundColor: `${activity.calendarColor}20`,
                          color: activity.calendarColor,
                        }}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-1.5" 
                          style={{ backgroundColor: activity.calendarColor }}
                        />
                        {activity.calendarName}
                      </Badge>
                    </TableCell>
                    <TableCell>{activity.service || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`} />
                        {activity.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(activity.assignedDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(activity.dueDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(activity.completedAt)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {activity.timeToComplete || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      )}
    </div>
  );
}

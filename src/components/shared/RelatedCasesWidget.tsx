import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Briefcase, Search, ExternalLink, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface RelatedCasesWidgetProps {
  entityType: "account" | "contact";
  entityId: string;
}

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  investigator_ids: string[] | null;
  case_manager_id: string | null;
}

interface CaseStatus {
  id: string;
  value: string;
  color: string | null;
  status_type: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
}

type SortColumn = "case_number" | "title" | "status" | "created_at" | "updated_at";
type SortDirection = "asc" | "desc";

const INITIAL_LIMIT = 25;
const LOAD_MORE_LIMIT = 25;

export function RelatedCasesWidget({ entityType, entityId }: RelatedCasesWidgetProps) {
  const { organization } = useOrganization();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [caseStatuses, setCaseStatuses] = useState<CaseStatus[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [sortColumn, setSortColumn] = useState<SortColumn>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);

  useEffect(() => {
    if (organization?.id && entityId) {
      fetchCases();
      fetchCaseStatuses();
    }
  }, [organization?.id, entityId, entityType]);

  const fetchCases = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from("cases")
        .select("id, case_number, title, status, created_at, updated_at, investigator_ids, case_manager_id")
        .eq("organization_id", organization.id)
        .order("updated_at", { ascending: false });

      if (entityType === "account") {
        query = query.eq("account_id", entityId);
      } else {
        query = query.eq("contact_id", entityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCases(data || []);

      // Fetch profiles for investigators
      const allUserIds = new Set<string>();
      data?.forEach((c) => {
        if (c.investigator_ids) {
          c.investigator_ids.forEach((id) => allUserIds.add(id));
        }
        if (c.case_manager_id) {
          allUserIds.add(c.case_manager_id);
        }
      });

      if (allUserIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(allUserIds));

        if (profilesData) {
          const profileMap: Record<string, Profile> = {};
          profilesData.forEach((p) => {
            profileMap[p.id] = p;
          });
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error fetching related cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseStatuses = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from("picklists")
        .select("id, value, color, status_type")
        .eq("organization_id", organization.id)
        .eq("type", "case_status")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setCaseStatuses(data || []);
    } catch (error) {
      console.error("Error fetching case statuses:", error);
    }
  };

  const getStatusStyle = (status: string) => {
    const statusItem = caseStatuses.find((s) => s.value === status);
    if (statusItem?.color) {
      return {
        backgroundColor: `${statusItem.color}20`,
        color: statusItem.color,
        borderColor: `${statusItem.color}40`,
      };
    }
    return {};
  };

  const getStatusLabel = (status: string) => {
    const statusItem = caseStatuses.find((s) => s.value === status);
    return statusItem?.value || status;
  };

  const getInvestigatorNames = (caseItem: CaseItem) => {
    const names: string[] = [];
    if (caseItem.case_manager_id && profiles[caseItem.case_manager_id]) {
      names.push(profiles[caseItem.case_manager_id].full_name || "Unknown");
    }
    if (caseItem.investigator_ids) {
      caseItem.investigator_ids.forEach((id) => {
        if (profiles[id] && id !== caseItem.case_manager_id) {
          names.push(profiles[id].full_name || "Unknown");
        }
      });
    }
    return names.length > 0 ? names.join(", ") : "-";
  };

  const filteredAndSortedCases = useMemo(() => {
    let result = [...cases];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.case_number.toLowerCase().includes(query) ||
          c.title.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case "case_number":
          comparison = a.case_number.localeCompare(b.case_number);
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "updated_at":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [cases, searchQuery, statusFilter, sortColumn, sortDirection]);

  const displayedCases = useMemo(() => {
    return filteredAndSortedCases.slice(0, displayLimit);
  }, [filteredAndSortedCases, displayLimit]);

  const hasMore = filteredAndSortedCases.length > displayLimit;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + LOAD_MORE_LIMIT);
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: SortColumn;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Related Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const entityLabel = entityType === "account" ? "account" : "contact";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Related Cases
          <Badge variant="secondary" className="ml-2">
            {cases.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {caseStatuses.map((status) => (
                <SelectItem key={status.id} value={status.value}>
                  {status.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cases Table */}
        {cases.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No cases are currently associated with this {entityLabel}.
          </p>
        ) : filteredAndSortedCases.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No cases match the selected filters.
          </p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="case_number">Case #</SortableHeader>
                    <SortableHeader column="title">Title</SortableHeader>
                    <SortableHeader column="status">Status</SortableHeader>
                    <TableHead>Investigator(s)</TableHead>
                    <SortableHeader column="created_at">Created</SortableHeader>
                    <SortableHeader column="updated_at">Updated</SortableHeader>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCases.map((caseItem) => (
                    <TableRow key={caseItem.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/cases/${caseItem.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {caseItem.case_number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={caseItem.title}>
                        {caseItem.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={getStatusStyle(caseItem.status)}
                        >
                          {getStatusLabel(caseItem.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {getInvestigatorNames(caseItem)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(caseItem.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(caseItem.updated_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/cases/${caseItem.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={handleLoadMore}>
                  Load More ({filteredAndSortedCases.length - displayLimit} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

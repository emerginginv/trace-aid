import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { FileInput, Plus, Download, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { toast } from "sonner";

interface CaseRequestSubject {
  first_name: string | null;
  last_name: string | null;
  is_primary: boolean | null;
}

interface CaseRequest {
  id: string;
  request_number: string | null;
  status: string;
  submitted_at: string;
  submitted_client_name: string | null;
  case_request_subjects: CaseRequestSubject[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Export columns definition
const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "request_number", label: "Request #" },
  { key: "subject", label: "Subject" },
  { key: "client", label: "Client" },
  { key: "status", label: "Status" },
  { key: "submitted_at", label: "Request Date" },
];

export default function CaseRequests() {
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [requests, setRequests] = useState<CaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useSetBreadcrumbs([
    { label: "Cases", href: "/cases" },
    { label: "Case Requests" },
  ]);

  useEffect(() => {
    if (organization?.id && !permissionsLoading && hasPermission('view_case_requests')) {
      fetchRequests();
    } else if (!permissionsLoading && !hasPermission('view_case_requests')) {
      setLoading(false);
    }
  }, [organization?.id, permissionsLoading]);

  const fetchRequests = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_requests')
        .select(`
          id,
          request_number,
          status,
          submitted_at,
          submitted_client_name,
          case_request_subjects (
            first_name,
            last_name,
            is_primary
          )
        `)
        .eq('organization_id', organization.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setRequests((data as CaseRequest[]) || []);
    } catch (error) {
      console.error('Error fetching case requests:', error);
      toast.error('Failed to load case requests');
    } finally {
      setLoading(false);
    }
  };

  // Get primary subject name
  const getPrimarySubjectName = (subjects: CaseRequestSubject[]): string => {
    const primary = subjects.find(s => s.is_primary);
    if (primary) {
      const parts = [primary.first_name, primary.last_name].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : '—';
    }
    // Fallback to first subject
    if (subjects.length > 0) {
      const first = subjects[0];
      const parts = [first.first_name, first.last_name].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : '—';
    }
    return '—';
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Status filter
      if (statusFilter !== "all" && req.status.toLowerCase() !== statusFilter) {
        return false;
      }
      
      // Search filter (subject name)
      if (searchTerm) {
        const subjectName = getPrimarySubjectName(req.case_request_subjects).toLowerCase();
        const clientName = (req.submitted_client_name || '').toLowerCase();
        const requestNumber = (req.request_number || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        if (!subjectName.includes(search) && !clientName.includes(search) && !requestNumber.includes(search)) {
          return false;
        }
      }
      
      return true;
    });
  }, [requests, statusFilter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, pageSize]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRequests.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredRequests.map(req => ({
      request_number: req.request_number || '',
      subject: getPrimarySubjectName(req.case_request_subjects),
      client: req.submitted_client_name || '',
      status: req.status,
      submitted_at: format(new Date(req.submitted_at), 'MM/dd/yyyy'),
    }));
    exportToCSV(data, EXPORT_COLUMNS, 'case-requests');
  };

  const handleExportPDF = () => {
    const data = filteredRequests.map(req => ({
      request_number: req.request_number || '',
      subject: getPrimarySubjectName(req.case_request_subjects),
      client: req.submitted_client_name || '',
      status: req.status,
      submitted_at: format(new Date(req.submitted_at), 'MM/dd/yyyy'),
    }));
    exportToPDF(data, EXPORT_COLUMNS, 'Case Requests', 'case-requests');
  };

  // Permission check
  if (permissionsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!hasPermission('view_case_requests')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            You don't have permission to view case requests.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileInput className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Case Requests</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/cases/requests/new">
              <Plus className="h-4 w-4 mr-2" />
              New Case Request
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, client, or request #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-4">
        Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <FileInput className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No case requests yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" 
                  ? "No requests match your filters." 
                  : "Case requests will appear here when submitted."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button asChild>
                  <Link to="/cases/requests/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Request
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === paginatedRequests.length && paginatedRequests.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Request #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(request.id)}
                        onCheckedChange={() => toggleSelect(request.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link 
                        to={`/cases/requests/${request.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {request.request_number || '—'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getPrimarySubjectName(request.case_request_subjects)}
                    </TableCell>
                    <TableCell>
                      {request.submitted_client_name || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} showPulse={false} size="sm" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.submitted_at), 'MM/dd/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredRequests.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1}
            </span>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

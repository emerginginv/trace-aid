import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Search, LayoutGrid, List, Trash2, Download, FileSpreadsheet, FileText } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { CaseForm } from "@/components/CaseForm";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format } from "date-fns";
import { CasesPageSkeleton } from "@/components/ui/list-page-skeleton";

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  due_date: string;
  created_at: string;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "case_number", label: "Case Number" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "start_date", label: "Start Date" },
  { key: "due_date", label: "Due Date" },
  { key: "actions", label: "Actions", hideable: false },
];

const Cases = () => {
  const navigate = useNavigate();
  const { isVendor } = useUserRole();
  const { hasPermission } = usePermissions();
  const { organization } = useOrganization();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [statusPicklists, setStatusPicklists] = useState<Array<{
    id: string;
    value: string;
    color: string;
    status_type?: string;
  }>>([]);
  const [statusTypeFilter, setStatusTypeFilter] = useState<string>('all');
  const { sortColumn, sortDirection, handleSort } = useSortPreference("cases", "case_number", "desc");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("cases-columns", COLUMNS);

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchCases();
      fetchPicklists();
    }
  }, [organization?.id]);

  const fetchPicklists = async () => {
    if (!organization?.id) return;
    
    try {
      const { data: statusData } = await supabase
        .from("picklists")
        .select("id, value, color, status_type")
        .eq("type", "case_status")
        .eq("is_active", true)
        .or(`organization_id.eq.${organization.id},organization_id.is.null`)
        .order("display_order");
      
      if (statusData) {
        setStatusPicklists(statusData);
      }
    } catch (error) {
      console.error("Error fetching picklists:", error);
    }
  };

  const fetchCases = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      toast.error("Error fetching cases");
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const statusItem = statusPicklists.find(s => s.value === status);
    if (statusItem?.color) {
      return {
        backgroundColor: `${statusItem.color}20`,
        color: statusItem.color,
        borderColor: `${statusItem.color}40`
      };
    }
    return {};
  };

  const isClosedCase = (status: string) => {
    const statusItem = statusPicklists.find(s => s.value === status);
    return statusItem?.status_type === 'closed';
  };

  const handleDeleteClick = (caseId: string) => {
    setCaseToDelete(caseId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!caseToDelete) return;
    try {
      const { error } = await supabase.from("cases").delete().eq("id", caseToDelete);
      if (error) throw error;
      toast.success("Case deleted successfully");
      fetchCases();
    } catch (error) {
      toast.error("Error deleting case");
    } finally {
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  };


  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = searchQuery === '' || caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) || caseItem.case_number.toLowerCase().includes(searchQuery.toLowerCase()) || caseItem.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    const statusPicklist = statusPicklists.find(s => s.value === caseItem.status);
    const matchesStatusType = statusTypeFilter === 'all' || statusPicklist?.status_type === statusTypeFilter;
    return matchesSearch && matchesStatus && matchesStatusType;
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal = a[sortColumn as keyof Case];
    let bVal = b[sortColumn as keyof Case];
    
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return 0;
  });

  // Export columns definition
  const EXPORT_COLUMNS: ExportColumn[] = [
    { key: "case_number", label: "Case Number" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "start_date", label: "Start Date", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
    { key: "due_date", label: "Due Date", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
  ];

  const handleExportCSV = () => exportToCSV(sortedCases, EXPORT_COLUMNS, "cases");
  const handleExportPDF = () => exportToPDF(sortedCases, EXPORT_COLUMNS, "Cases Report", "cases");

  if (loading) {
    return <CasesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {isVendor && <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            You are viewing cases assigned to you. You can only see and update your assigned work.
          </AlertDescription>
        </Alert>}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isVendor ? 'My Cases' : 'Cases'}</h1>
          <p className="text-muted-foreground mt-2">
            {isVendor ? 'View and update your assigned cases' : 'Manage and track your investigation cases'}
          </p>
        </div>
        {!isVendor && hasPermission('add_cases') && <Button className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" />
            New Case
          </Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cases by title, number, or description..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusTypeFilter} onValueChange={setStatusTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Case Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cases</SelectItem>
            <SelectItem value="open">🔵 Open Cases</SelectItem>
            <SelectItem value="closed">⚪ Closed Cases</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusPicklists.map(status => <SelectItem key={status.id} value={status.value}>{status.value}</SelectItem>)}
          </SelectContent>
        </Select>
        <ColumnVisibility
          columns={COLUMNS}
          visibility={visibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
        />
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
        <div className="flex gap-1 border rounded-md p-1 h-10">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-7 w-7 p-0">
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 w-7 p-0 bg-blue-500 hover:bg-blue-400">
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedCases.length} case{sortedCases.length !== 1 ? 's' : ''}
      </div>

      {cases.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No cases yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first case
            </p>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Create First Case
            </Button>
          </CardContent>
        </Card> : filteredCases.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No cases match your search criteria</p>
          </CardContent>
        </Card> : viewMode === 'grid' ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedCases.map(caseItem => <Card key={caseItem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{caseItem.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Case #{caseItem.case_number}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="border" style={getStatusStyle(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {caseItem.description || "No description provided"}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>Started: {new Date(caseItem.start_date).toLocaleDateString()}</span>
                  {caseItem.due_date && <span>Due: {new Date(caseItem.due_date).toLocaleDateString()}</span>}
                </div>
                <div className="flex justify-end gap-2">
                  {hasPermission('delete_cases') && <Button variant="ghost" size="icon" onClick={(e) => {
                      e.preventDefault();
                      handleDeleteClick(caseItem.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>}
                </div>
              </CardContent>
            </Card>)}
        </div> : <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
          {sortedCases.map(caseItem => {
          const isClosed = isClosedCase(caseItem.status);
          return <Card key={caseItem.id} className={`p-4 ${isClosed ? 'opacity-60' : ''} cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => navigate(`/cases/${caseItem.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/cases/${caseItem.id}`);
                    }
                  }}
                >
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-sm">{caseItem.case_number}</div>
                    <div className={`font-medium mt-1 flex items-center gap-2 ${isClosed ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {caseItem.title}
                      {isClosed && <Badge variant="secondary" className="text-xs">
                          Closed
                        </Badge>}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge className="border" style={getStatusStyle(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Start: {new Date(caseItem.start_date).toLocaleDateString()}</div>
                    {caseItem.due_date && <div>Due: {new Date(caseItem.due_date).toLocaleDateString()}</div>}
                  </div>

                  {hasPermission('delete_cases') && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(caseItem.id);
                      }} className="flex-1">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </Card>;
        })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible("case_number") && (
                    <SortableTableHead
                      column="case_number"
                      label="Case Number"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("title") && (
                    <SortableTableHead
                      column="title"
                      label="Title"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("status") && (
                    <SortableTableHead
                      column="status"
                      label="Status"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("start_date") && (
                    <SortableTableHead
                      column="start_date"
                      label="Start Date"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("due_date") && (
                    <SortableTableHead
                      column="due_date"
                      label="Due Date"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("actions") && (
                    <SortableTableHead
                      column=""
                      label="Actions"
                      sortColumn=""
                      sortDirection="asc"
                      onSort={() => {}}
                      className="text-right"
                    />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCases.map(caseItem => {
              const isClosed = isClosedCase(caseItem.status);
              return <TableRow 
                  key={caseItem.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${isClosed ? 'opacity-60' : ''}`}
                  onClick={() => navigate(`/cases/${caseItem.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/cases/${caseItem.id}`);
                    }
                  }}
                >
                    {isVisible("case_number") && (
                      <TableCell className={`font-medium ${isClosed ? 'text-muted-foreground' : ''}`}>
                        {caseItem.case_number}
                      </TableCell>
                    )}
                    {isVisible("title") && (
                      <TableCell className={isClosed ? 'text-muted-foreground' : ''}>
                        <div className="flex items-center gap-2">
                          {caseItem.title}
                          {isClosed && <Badge variant="secondary" className="text-xs">
                              Closed
                            </Badge>}
                        </div>
                      </TableCell>
                    )}
                    {isVisible("status") && (
                      <TableCell>
                        <Badge className="border" style={getStatusStyle(caseItem.status)}>
                          {caseItem.status}
                        </Badge>
                      </TableCell>
                    )}
                    {isVisible("start_date") && (
                      <TableCell>{new Date(caseItem.start_date).toLocaleDateString()}</TableCell>
                    )}
                    {isVisible("due_date") && (
                      <TableCell>
                        {caseItem.due_date ? new Date(caseItem.due_date).toLocaleDateString() : "-"}
                      </TableCell>
                    )}
                    {isVisible("actions") && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('delete_cases') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(caseItem.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>;
            })}
              </TableBody>
            </Table>
          </Card>
        </>}

      <CaseForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        onSuccess={fetchCases} 
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Case"
        description="Are you sure you want to delete this case? This action cannot be undone."
      />

      <ScrollProgress />
    </div>
  );
};

export default Cases;

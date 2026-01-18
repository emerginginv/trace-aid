import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ImportTemplateButton } from "@/components/ui/import-template-button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { User, Car, MapPin, Package, Building2, Search, MoreVertical, ExternalLink, Download, FileSpreadsheet, FileText, Pencil, Trash2, RefreshCw, Archive, ArchiveRestore, X } from "lucide-react";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSubjectProfileImages } from "@/hooks/use-subject-profile-images";
import { SubjectCategory, SUBJECT_CATEGORY_LABELS, PERSON_ROLES } from "@/components/case-detail/subjects/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface SubjectWithCase {
  id: string;
  case_id: string;
  organization_id: string;
  subject_type: SubjectCategory;
  name: string;
  display_name: string | null;
  details: Record<string, any>;
  notes: string | null;
  status: string;
  role: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  is_primary: boolean | null;
  created_at: string;
  updated_at: string;
  cases: {
    id: string;
    case_number: string;
    title: string;
  };
}

interface SubjectCounts {
  person: number;
  vehicle: number;
  location: number;
  item: number;
  business: number;
}

const CATEGORY_ICONS: Record<SubjectCategory, React.ElementType> = {
  person: User,
  vehicle: Car,
  location: MapPin,
  item: Package,
  business: Building2,
};

const STAT_CARDS = [
  { key: 'person' as const, label: 'People', icon: User, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'vehicle' as const, label: 'Vehicles', icon: Car, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { key: 'location' as const, label: 'Locations', icon: MapPin, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { key: 'item' as const, label: 'Items', icon: Package, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { key: 'business' as const, label: 'Businesses', icon: Building2, color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "name", label: "Name", format: (_, row) => row.display_name || row.name },
  { key: "subject_type", label: "Category", format: (v) => SUBJECT_CATEGORY_LABELS[v as SubjectCategory] || v },
  { key: "role", label: "Role" },
  { key: "case_number", label: "Case #", format: (_, row) => row.cases?.case_number || "-" },
  { key: "case_title", label: "Case Title", format: (_, row) => row.cases?.title || "-" },
  { key: "status", label: "Status", format: (v) => v === 'active' ? 'Active' : 'Archived' },
  { key: "created_at", label: "Created", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
];

export default function Subjects() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { navigateWithSource } = useNavigationSource();

  const [subjects, setSubjects] = useState<SubjectWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permission checks
  const canEditSubjects = hasPermission("edit_subjects");
  const canDeleteSubjects = hasPermission("delete_subjects");

  const [counts, setCounts] = useState<SubjectCounts>({
    person: 0,
    vehicle: 0,
    location: 0,
    item: 0,
    business: 0,
  });

  useEffect(() => {
    if (!organization?.id) {
      console.log("Subjects: No organization ID available yet");
      return;
    }
    console.log("Subjects: Fetching for org", organization.id);
    fetchSubjects();
  }, [organization?.id]);

  const fetchSubjects = async () => {
    if (!organization?.id) return;
    setLoading(true);

    try {
      // Step 1: Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("case_subjects")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (subjectsError) {
        console.error("Subjects: Query error:", subjectsError);
        throw subjectsError;
      }

      // Step 2: Get unique case IDs and fetch cases separately
      const caseIds = [...new Set((subjectsData || []).map(s => s.case_id))];
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

      // Step 3: Merge subjects with their cases
      const enrichedSubjects: SubjectWithCase[] = (subjectsData || [])
        .filter(s => casesMap[s.case_id]) // Only include subjects with valid cases
        .map((item: any) => ({
          ...item,
          cases: casesMap[item.case_id]
        }));

      setSubjects(enrichedSubjects);

      // Calculate counts for active subjects
      const newCounts: SubjectCounts = { person: 0, vehicle: 0, location: 0, item: 0, business: 0 };
      enrichedSubjects.forEach((s) => {
        if (s.status === 'active' && s.subject_type in newCounts) {
          newCounts[s.subject_type as keyof SubjectCounts]++;
        }
      });
      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      // Category filter
      if (categoryFilter !== "all" && subject.subject_type !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && subject.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = subject.name.toLowerCase().includes(query);
        const matchesDisplayName = subject.display_name?.toLowerCase().includes(query);
        const matchesNotes = subject.notes?.toLowerCase().includes(query);
        const matchesCaseNumber = subject.cases.case_number.toLowerCase().includes(query);
        const matchesCaseTitle = subject.cases.title.toLowerCase().includes(query);
        
        if (!matchesName && !matchesDisplayName && !matchesNotes && !matchesCaseNumber && !matchesCaseTitle) {
          return false;
        }
      }

      return true;
    });
  }, [subjects, categoryFilter, statusFilter, searchQuery]);

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredSubjects.length && filteredSubjects.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubjects.map(s => s.id)));
    }
  }, [filteredSubjects, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Single delete handler
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("case_subjects")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete subject");
        console.error("Delete error:", error);
        return;
      }

      toast.success("Subject deleted successfully");
      fetchSubjects();
      setSingleDeleteId(null);
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk status change handler
  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("case_subjects")
        .update({ status: newStatus })
        .in("id", Array.from(selectedIds));

      if (error) {
        toast.error("Failed to update subjects");
        console.error("Bulk status update error:", error);
        return;
      }

      toast.success(`Updated ${selectedIds.size} subject${selectedIds.size !== 1 ? 's' : ''} to ${newStatus}`);
      setSelectedIds(new Set());
      fetchSubjects();
    } catch (error) {
      console.error("Error updating subjects:", error);
      toast.error("Failed to update subjects");
    }
  };

  // Bulk delete handler
  const handleBulkDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("case_subjects")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) {
        toast.error("Failed to delete subjects");
        console.error("Bulk delete error:", error);
        return;
      }

      toast.success(`Deleted ${selectedIds.size} subject${selectedIds.size !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
      fetchSubjects();
    } catch (error) {
      console.error("Error deleting subjects:", error);
      toast.error("Failed to delete subjects");
    } finally {
      setIsDeleting(false);
    }
  };

  // Navigate to edit
  const navigateToEdit = (subject: SubjectWithCase) => {
    navigateWithSource(navigate, `/cases/${subject.cases.id}/subjects/${subject.id}?edit=true`, 'subjects_list');
  };

  const subjectsForImages = filteredSubjects.map(s => ({
    id: s.id,
    profile_image_url: s.profile_image_url || null,
    cover_image_url: s.cover_image_url || null
  }));
  const { signedUrls, getSignedUrl } = useSubjectProfileImages(subjectsForImages);

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

  if (!hasPermission('view_subjects')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium">Access Restricted</h3>
          <p className="text-muted-foreground mt-2">You don't have permission to view subjects.</p>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string | null) => {
    if (!role) return "Unknown";
    const found = PERSON_ROLES.find(r => r.value === role);
    return found?.label || role;
  };

  const navigateToSubject = (subject: SubjectWithCase) => {
    navigateWithSource(navigate, `/cases/${subject.cases.id}/subjects/${subject.id}`, 'subjects_list');
  };

  const handleExportCSV = () => {
    exportToCSV(filteredSubjects, EXPORT_COLUMNS, "subjects");
  };

  const handleExportPDF = () => {
    exportToPDF(filteredSubjects, EXPORT_COLUMNS, "All Subjects", "subjects");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Subjects</h1>
        <p className="text-muted-foreground">View and manage subjects across all cases</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCategoryFilter(categoryFilter === stat.key ? 'all' : stat.key)}>
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
            placeholder="Search subjects or cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="person">People</SelectItem>
            <SelectItem value="vehicle">Vehicles</SelectItem>
            <SelectItem value="location">Locations</SelectItem>
            <SelectItem value="item">Items</SelectItem>
            <SelectItem value="business">Businesses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
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
        <ImportTemplateButton templateFileName="05_Subjects.csv" entityDisplayName="Subjects" />
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} subject{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap gap-2">
            {canEditSubjects && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('active')}>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Set Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('archived')}>
                    <Archive className="h-4 w-4 mr-2" />
                    Set Archived
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canDeleteSubjects && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No subjects found</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedIds.size === filteredSubjects.length && filteredSubjects.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[280px]">Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject) => {
                const Icon = CATEGORY_ICONS[subject.subject_type];
                const signedUrl = getSignedUrl(subject.id);

                return (
                  <TableRow
                    key={subject.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigateToSubject(subject)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(subject.id)}
                        onCheckedChange={() => toggleSelect(subject.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {subject.subject_type === 'person' ? (
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={signedUrl || undefined} alt={subject.name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(subject.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{subject.display_name || subject.name}</div>
                          {subject.role && (
                            <div className="text-sm text-muted-foreground">{getRoleLabel(subject.role)}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {SUBJECT_CATEGORY_LABELS[subject.subject_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{subject.cases.case_number}</div>
                        <div className="text-muted-foreground truncate max-w-[200px]">{subject.cases.title}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={subject.status === 'active' ? 'default' : 'secondary'}
                        className={subject.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                      >
                        {subject.status === 'active' ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(subject.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/cases/${subject.cases.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Go to Case
                          </DropdownMenuItem>
                          {canEditSubjects && (
                            <DropdownMenuItem onClick={() => navigateToEdit(subject)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Subject
                            </DropdownMenuItem>
                          )}
                          {canDeleteSubjects && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setSingleDeleteId(subject.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Subject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Results count */}
      {!loading && filteredSubjects.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredSubjects.length} of {subjects.length} subjects
        </p>
      )}

      {/* Single Delete Confirmation */}
      <ConfirmationDialog
        open={!!singleDeleteId}
        onOpenChange={(open) => !open && setSingleDeleteId(null)}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={isDeleting}
        onConfirm={() => singleDeleteId && handleDelete(singleDeleteId)}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Subjects"
        description={`Are you sure you want to delete ${selectedIds.size} subject${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleBulkDeleteConfirm}
      />
    </div>
  );
}

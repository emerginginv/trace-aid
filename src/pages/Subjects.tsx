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
import { User, Car, MapPin, Package, Search, LayoutGrid, List, MoreVertical, Eye, ExternalLink, Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSubjectProfileImages } from "@/hooks/use-subject-profile-images";
import { SubjectCategory, SUBJECT_CATEGORY_LABELS, PERSON_ROLES } from "@/components/case-detail/subjects/types";
import { Skeleton } from "@/components/ui/skeleton";

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
}

const CATEGORY_ICONS: Record<SubjectCategory, React.ElementType> = {
  person: User,
  vehicle: Car,
  location: MapPin,
  item: Package,
};

const STAT_CARDS = [
  { key: 'person' as const, label: 'People', icon: User, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'vehicle' as const, label: 'Vehicles', icon: Car, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { key: 'location' as const, label: 'Locations', icon: MapPin, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { key: 'item' as const, label: 'Items', icon: Package, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
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
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('subjects-view-mode') as 'list' | 'cards') || 'cards';
  });

  const [counts, setCounts] = useState<SubjectCounts>({
    person: 0,
    vehicle: 0,
    location: 0,
    item: 0,
  });

  useEffect(() => {
    if (!organization?.id) {
      console.log("Subjects: No organization ID available yet");
      return;
    }
    console.log("Subjects: Fetching for org", organization.id);
    fetchSubjects();
  }, [organization?.id]);

  useEffect(() => {
    localStorage.setItem('subjects-view-mode', viewMode);
  }, [viewMode]);

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
      const newCounts: SubjectCounts = { person: 0, vehicle: 0, location: 0, item: 0 };
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No subjects found</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
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
                          <DropdownMenuItem onClick={() => navigateToSubject(subject)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/cases/${subject.cases.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Go to Case
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSubjects.map((subject) => {
            const Icon = CATEGORY_ICONS[subject.subject_type];
            const signedUrl = signedUrls[subject.id];
            const isArchived = subject.status === 'archived';

            return (
              <Card
                key={subject.id}
                className={cn(
                  "relative overflow-hidden transition-shadow hover:shadow-md cursor-pointer group",
                  isArchived && "opacity-70"
                )}
                onClick={() => navigateToSubject(subject)}
              >
                {/* Cover Section */}
                <div className="h-16 bg-gradient-to-br from-primary/20 via-primary/10 to-muted" />

                {/* Status Badge */}
                {isArchived && (
                  <Badge variant="secondary" className="absolute top-2 right-2 text-xs z-10">
                    Archived
                  </Badge>
                )}
                {subject.is_primary && !isArchived && (
                  <Badge className="absolute top-2 right-2 text-xs bg-primary text-white z-10">
                    Primary
                  </Badge>
                )}

                {/* Avatar */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                  {subject.subject_type === 'person' ? (
                    <Avatar className="h-20 w-20 border-4 border-card shadow-md">
                      <AvatarImage src={signedUrl || undefined} alt={subject.name} />
                      <AvatarFallback className="text-lg bg-muted">
                        {getInitials(subject.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-muted border-4 border-card shadow-md flex items-center justify-center">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <CardContent className="pt-12 pb-4 flex flex-col items-center text-center">
                  <h3 className="font-semibold text-foreground truncate w-full">
                    {subject.display_name || subject.name}
                  </h3>
                  {subject.role && (
                    <p className="text-sm text-muted-foreground">{getRoleLabel(subject.role)}</p>
                  )}
                  <Badge variant="outline" className="mt-2 capitalize text-xs">
                    {SUBJECT_CATEGORY_LABELS[subject.subject_type]}
                  </Badge>
                  <div className="mt-3 pt-3 border-t w-full">
                    <p className="text-xs text-muted-foreground">Case</p>
                    <p className="text-sm font-medium truncate">{subject.cases.case_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{subject.cases.title}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {!loading && filteredSubjects.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredSubjects.length} of {subjects.length} subjects
        </p>
      )}
    </div>
  );
}

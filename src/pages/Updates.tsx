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
import { AIBadge } from "@/components/ui/ai-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImportTemplateButton } from "@/components/ui/import-template-button";
import { FileText, Users, Bot, Clock, Search, LayoutGrid, List, MoreVertical, Eye, ExternalLink, Download, FileSpreadsheet, Plus } from "lucide-react";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { HelpfulHeader } from "@/components/help-center/ContextualHelp";
import { format, subDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseSelectorDialog } from "@/components/shared/CaseSelectorDialog";
import { UpdateForm } from "@/components/case-detail/UpdateForm";

interface UpdateWithCase {
  id: string;
  case_id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  update_type: string;
  is_ai_summary: boolean | null;
  created_at: string | null;
  user_id: string;
  cases: {
    id: string;
    case_number: string;
    title: string;
  };
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface UpdateCounts {
  caseUpdates: number;
  clientContacts: number;
  aiSummaries: number;
  thisWeek: number;
}

const UPDATE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "Case Update", label: "Case Update" },
  { value: "Client Contact", label: "Client Contact" },
  { value: "3rd-Party Contact", label: "3rd-Party Contact" },
  { value: "Surveillance", label: "Surveillance" },
  { value: "Accounting", label: "Accounting" },
  { value: "Other", label: "Other" },
];

const STAT_CARDS = [
  { key: 'caseUpdates' as const, label: 'Case Updates', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10', filterValue: 'Case Update' },
  { key: 'clientContacts' as const, label: 'Client Contacts', icon: Users, color: 'text-green-500', bgColor: 'bg-green-500/10', filterValue: 'Client Contact' },
  { key: 'aiSummaries' as const, label: 'AI Summaries', icon: Bot, color: 'text-purple-500', bgColor: 'bg-purple-500/10', filterValue: 'ai' },
  { key: 'thisWeek' as const, label: 'This Week', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10', filterValue: 'week' },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "update_type", label: "Type" },
  { key: "case_number", label: "Case #", format: (_, row) => row.cases?.case_number || "-" },
  { key: "case_title", label: "Case Title", format: (_, row) => row.cases?.title || "-" },
  { key: "author", label: "Author", format: (_, row) => row.author?.full_name || "Unknown" },
  { key: "is_ai_summary", label: "AI Summary", format: (v) => v ? "Yes" : "No" },
  { key: "created_at", label: "Created", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
];

export default function Updates() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { navigateWithSource } = useNavigationSource();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [updates, setUpdates] = useState<UpdateWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [specialFilter, setSpecialFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('updates-view-mode') as 'list' | 'cards') || 'list';
  });

  // State for adding new update
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const [counts, setCounts] = useState<UpdateCounts>({
    caseUpdates: 0,
    clientContacts: 0,
    aiSummaries: 0,
    thisWeek: 0,
  });

  useEffect(() => {
    if (!organization?.id) return;
    fetchUpdates();
  }, [organization?.id]);

  useEffect(() => {
    localStorage.setItem('updates-view-mode', viewMode);
  }, [viewMode]);

  const fetchUpdates = async () => {
    if (!organization?.id) return;
    setLoading(true);

    try {
      // Step 1: Fetch updates
      const { data: updatesData, error: updatesError } = await supabase
        .from("case_updates")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (updatesError) {
        console.error("Updates: Query error:", updatesError);
        throw updatesError;
      }

      // Step 2: Get unique case IDs and fetch cases separately
      const caseIds = [...new Set((updatesData || []).map(u => u.case_id))];
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

      // Step 3: Get unique user IDs and fetch profiles
      const userIds = [...new Set((updatesData || []).map(u => u.user_id))];
      let usersMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (profiles) {
          usersMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as typeof usersMap);
        }
      }

      // Step 4: Merge updates with their cases and authors
      const enrichedUpdates: UpdateWithCase[] = (updatesData || [])
        .filter(u => casesMap[u.case_id])
        .map((item: any) => ({
          ...item,
          cases: casesMap[item.case_id],
          author: usersMap[item.user_id] || null
        }));

      setUpdates(enrichedUpdates);

      // Calculate counts
      const oneWeekAgo = subDays(new Date(), 7);
      const newCounts: UpdateCounts = {
        caseUpdates: 0,
        clientContacts: 0,
        aiSummaries: 0,
        thisWeek: 0,
      };

      enrichedUpdates.forEach((u) => {
        if (u.update_type === 'Case Update') newCounts.caseUpdates++;
        if (u.update_type === 'Client Contact') newCounts.clientContacts++;
        if (u.is_ai_summary) newCounts.aiSummaries++;
        if (u.created_at && isAfter(new Date(u.created_at), oneWeekAgo)) newCounts.thisWeek++;
      });
      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching updates:", error);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatCardClick = (filterValue: string) => {
    if (filterValue === 'ai' || filterValue === 'week') {
      setSpecialFilter(specialFilter === filterValue ? null : filterValue);
      setTypeFilter('all');
    } else {
      setTypeFilter(typeFilter === filterValue ? 'all' : filterValue);
      setSpecialFilter(null);
    }
  };

  const filteredUpdates = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    
    return updates.filter((update) => {
      // Type filter
      if (typeFilter !== "all" && update.update_type !== typeFilter) {
        return false;
      }

      // Special filters
      if (specialFilter === 'ai' && !update.is_ai_summary) {
        return false;
      }
      if (specialFilter === 'week' && (!update.created_at || !isAfter(new Date(update.created_at), oneWeekAgo))) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = update.title.toLowerCase().includes(query);
        const matchesDescription = update.description?.toLowerCase().includes(query);
        const matchesCaseNumber = update.cases.case_number.toLowerCase().includes(query);
        const matchesCaseTitle = update.cases.title.toLowerCase().includes(query);
        const matchesAuthor = update.author?.full_name?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesCaseNumber && !matchesCaseTitle && !matchesAuthor) {
          return false;
        }
      }

      return true;
    });
  }, [updates, typeFilter, specialFilter, searchQuery]);

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

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

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

  const navigateToUpdate = (update: UpdateWithCase) => {
    navigateWithSource(navigate, `/updates/${update.id}`, 'updates_list');
  };

  const handleExportCSV = () => {
    exportToCSV(filteredUpdates, EXPORT_COLUMNS, "updates");
  };

  const handleExportPDF = () => {
    exportToPDF(filteredUpdates, EXPORT_COLUMNS, "All Updates", "updates");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <HelpfulHeader feature="global_updates">
            <h1 className="text-2xl font-bold tracking-tight">All Updates</h1>
          </HelpfulHeader>
          <p className="text-muted-foreground">View and manage updates across all cases</p>
        </div>
        {hasPermission('add_updates') && (
          <Button onClick={() => setShowCaseSelector(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Update
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          const isActive = (stat.filterValue === 'ai' || stat.filterValue === 'week') 
            ? specialFilter === stat.filterValue 
            : typeFilter === stat.filterValue;
          return (
            <Card 
              key={stat.key} 
              className={cn(
                "cursor-pointer hover:shadow-md transition-shadow",
                isActive && "ring-2 ring-primary"
              )} 
              onClick={() => handleStatCardClick(stat.filterValue)}
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
            placeholder="Search updates, cases, or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setSpecialFilter(null); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Update Type" />
          </SelectTrigger>
          <SelectContent>
            {UPDATE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
        <ImportTemplateButton templateFileName="07_Updates.csv" entityDisplayName="Updates" />
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
      ) : filteredUpdates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No updates found</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
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
                <TableRow
                  key={update.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigateToUpdate(update)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={update.author?.avatar_url || undefined} alt={update.author?.full_name || "Author"} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(update.author?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium line-clamp-1">{update.title}</div>
                        {update.is_ai_summary && (
                          <div className="flex items-center gap-1 text-xs text-[hsl(270,85%,55%)] dark:text-[hsl(270,85%,65%)]">
                            <Bot className="h-3 w-3" />
                            AI Summary
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getUpdateTypeBadgeColor(update.update_type)}>
                      {update.update_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{update.cases.case_number}</div>
                      <div className="text-muted-foreground truncate max-w-[200px]">{update.cases.title}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{update.author?.full_name || "Unknown"}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {update.created_at ? format(new Date(update.created_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigateToUpdate(update)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/cases/${update.cases.id}`)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Go to Case
                        </DropdownMenuItem>
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
            <Card
              key={update.id}
              className="relative overflow-hidden transition-shadow hover:shadow-md cursor-pointer group"
              onClick={() => navigateToUpdate(update)}
            >
              {/* Cover Section */}
              <div className="h-16 bg-gradient-to-br from-primary/20 via-primary/10 to-muted" />

              {/* AI Badge */}
              {update.is_ai_summary && (
                <AIBadge 
                  size="sm" 
                  className="absolute top-2 right-2 z-10"
                />
              )}

              {/* Avatar positioned at cover/content boundary */}
              <div className="px-4 -mt-6 relative z-10">
                <Avatar className="h-12 w-12 border-2 border-background">
                  <AvatarImage src={update.author?.avatar_url || undefined} alt={update.author?.full_name || "Author"} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(update.author?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Content */}
              <CardContent className="p-4 pt-2 space-y-3">
                <div>
                  <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {update.title}
                  </h3>
                  {update.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {update.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn("text-xs", getUpdateTypeBadgeColor(update.update_type))}>
                    {update.update_type}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span className="truncate max-w-[120px]">{update.cases.case_number}</span>
                  <span>{update.created_at ? format(new Date(update.created_at), "MMM d") : "-"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Case Selector Dialog */}
      <CaseSelectorDialog
        open={showCaseSelector}
        onOpenChange={setShowCaseSelector}
        onSelectCase={(caseId) => {
          setSelectedCaseId(caseId);
          setShowUpdateForm(true);
        }}
        title="Select a Case"
        description="Choose a case to add a new update to"
      />

      {/* Update Form Dialog */}
      {selectedCaseId && organization?.id && (
        <UpdateForm
          caseId={selectedCaseId}
          open={showUpdateForm}
          onOpenChange={(open) => {
            setShowUpdateForm(open);
            if (!open) setSelectedCaseId(null);
          }}
          onSuccess={() => {
            setShowUpdateForm(false);
            setSelectedCaseId(null);
            fetchUpdates();
          }}
          organizationId={organization.id}
        />
      )}
    </div>
  );
}

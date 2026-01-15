import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { CaseTabSkeleton } from "./CaseTabSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, ShieldAlert, Download, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { toast } from "@/hooks/use-toast";
import { UpdateForm } from "./UpdateForm";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { ContextualHelp } from "@/components/help-center";
import { Checkbox } from "@/components/ui/checkbox";
import { AIBadge } from "@/components/ui/ai-badge";
import { AISummaryDialog } from "./AISummaryDialog";
import { useNavigationSource } from "@/hooks/useNavigationSource";

interface TimelineEntry {
  time: string;
  description: string;
}

interface Update {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  update_type: string;
  user_id: string;
  activity_timeline: TimelineEntry[] | null;
  is_ai_summary?: boolean;
  linked_activity_id: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "select", label: "", hideable: false },
  { key: "title", label: "Title" },
  { key: "update_type", label: "Type" },
  { key: "user_id", label: "Created By" },
  { key: "created_at", label: "Date" },
  { key: "actions", label: "Actions", hideable: false },
];

export const CaseUpdates = ({ caseId, isClosedCase = false }: { caseId: string; isClosedCase?: boolean }) => {
  const navigate = useNavigate();
  const { navigateWithSource } = useNavigationSource();
  const { organization } = useOrganization();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  
  // AI Summary selection state
  const [selectedUpdateIds, setSelectedUpdateIds] = useState<Set<string>>(new Set());
  const [showAISummaryDialog, setShowAISummaryDialog] = useState(false);

  // Sorting states
  const { sortColumn, sortDirection, handleSort } = useSortPreference("case-updates", "created_at", "desc");

  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewUpdates = hasPermission("view_updates");
  const canAddUpdates = hasPermission("add_updates");
  const canEditUpdates = hasPermission("edit_updates");
  const canDeleteUpdates = hasPermission("delete_updates");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("case-updates-columns", COLUMNS);

  useEffect(() => {
    fetchUpdates();
  }, [caseId]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("case_updates")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map data with proper type casting for activity_timeline
      const mappedUpdates: Update[] = (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        created_at: item.created_at,
        update_type: item.update_type,
        user_id: item.user_id,
        activity_timeline: item.activity_timeline as unknown as TimelineEntry[] | null,
        is_ai_summary: item.is_ai_summary || false,
        linked_activity_id: item.linked_activity_id,
      }));

      setUpdates(mappedUpdates);

      // Fetch user profiles for all unique user IDs
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((u) => u.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach((p) => {
            profileMap[p.id] = p;
          });
          setUserProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error fetching updates:", error);
      toast({
        title: "Error",
        description: "Failed to load updates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (e: React.MouseEvent, update: Update) => {
    e.stopPropagation();
    setEditingUpdate(update);
    setFormOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this update?")) return;
    
    try {
      const { error } = await supabase
        .from("case_updates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Update deleted" });
      fetchUpdates();
    } catch (error) {
      console.error("Error deleting update:", error);
      toast({
        title: "Error",
        description: "Failed to delete update",
        variant: "destructive",
      });
    }
  };

  const handleRowClick = (updateId: string) => {
    // Capture current filter state for back navigation
    const filters: Record<string, string> = {};
    if (searchQuery) filters.searchQuery = searchQuery;
    if (sortColumn) filters.sortColumn = sortColumn;
    if (sortDirection) filters.sortDirection = sortDirection;
    
    navigateWithSource(
      navigate,
      `/cases/${caseId}/updates/${updateId}`,
      'case-updates',
      filters
    );
  };

  // Selection handlers for AI Summary
  const toggleUpdateSelection = (e: React.MouseEvent, updateId: string) => {
    e.stopPropagation();
    setSelectedUpdateIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(updateId)) {
        newSet.delete(updateId);
      } else {
        newSet.add(updateId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUpdateIds.size === sortedUpdates.length) {
      setSelectedUpdateIds(new Set());
    } else {
      setSelectedUpdateIds(new Set(sortedUpdates.map(u => u.id)));
    }
  };

  const selectedUpdatesForDialog = updates.filter(u => selectedUpdateIds.has(u.id));

  const filteredUpdates = updates.filter(update => {
    return searchQuery === '' || 
      update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.update_type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort data
  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any;
    let bVal: any;
    
    switch (sortColumn) {
      case "title":
        aVal = a.title;
        bVal = b.title;
        break;
      case "update_type":
        aVal = a.update_type;
        bVal = b.update_type;
        break;
      case "user_id":
        const aProfile = userProfiles[a.user_id];
        const bProfile = userProfiles[b.user_id];
        aVal = aProfile?.full_name || aProfile?.email || "";
        bVal = bProfile?.full_name || bProfile?.email || "";
        break;
      case "created_at":
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }
    
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return sortDirection === "asc" 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  if (permissionsLoading || loading) {
    return <CaseTabSkeleton title="Case Updates" subtitle="Loading updates..." rows={5} columns={5} />;
  }

  if (!canViewUpdates) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center">
            You don't have permission to view updates. Contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-2xl font-bold">Case Updates</h2>
            <p className="text-muted-foreground">Showing {sortedUpdates.length} update{sortedUpdates.length !== 1 ? 's' : ''}</p>
          </div>
          <ContextualHelp feature="activity_timelines" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {selectedUpdateIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedUpdateIds.size} selected
              </span>
              <Button
                variant="ai"
                onClick={() => setShowAISummaryDialog(true)}
                disabled={!canAddUpdates}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate Summary
              </Button>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const exportColumns: ExportColumn[] = [
                  { key: "title", label: "Title" },
                  { key: "update_type", label: "Type" },
                  { key: "user_id", label: "Created By", format: (v) => userProfiles[v]?.full_name || userProfiles[v]?.email || "Unknown" },
                  { key: "created_at", label: "Date", format: (v) => format(new Date(v), "MMM d, yyyy") },
                  { key: "description", label: "Description", format: (v) => v || "-" },
                ];
                exportToCSV(sortedUpdates, exportColumns, "case-updates");
              }}>
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const exportColumns: ExportColumn[] = [
                  { key: "title", label: "Title" },
                  { key: "update_type", label: "Type" },
                  { key: "user_id", label: "Created By", format: (v) => userProfiles[v]?.full_name || userProfiles[v]?.email || "Unknown" },
                  { key: "created_at", label: "Date", format: (v) => format(new Date(v), "MMM d, yyyy") },
                ];
                exportToPDF(sortedUpdates, exportColumns, "Case Updates", "case-updates");
              }}>
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            onClick={() => setFormOpen(true)} 
            className="w-full sm:w-auto" 
            disabled={isClosedCase || !canAddUpdates}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Update
          </Button>
        </div>
      </div>

      <div className="relative mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <ColumnVisibility
          columns={COLUMNS}
          visibility={visibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
        />
      </div>

      {updates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No updates yet</p>
            {canAddUpdates && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Add First Update
              </Button>
            )}
          </CardContent>
        </Card>
      ) : sortedUpdates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No updates match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {isVisible("select") && (
                  <th className="w-10 p-2">
                    <Checkbox
                      checked={selectedUpdateIds.size === sortedUpdates.length && sortedUpdates.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
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
                {isVisible("update_type") && (
                  <SortableTableHead
                    column="update_type"
                    label="Type"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("user_id") && (
                  <SortableTableHead
                    column="user_id"
                    label="Created By"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("created_at") && (
                  <SortableTableHead
                    column="created_at"
                    label="Date"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("actions") && (
                  <th className="text-right p-2">Actions</th>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUpdates.map((update) => {
                const userProfile = userProfiles[update.user_id];
                const isSelected = selectedUpdateIds.has(update.id);
                
                return (
                  <TableRow 
                    key={update.id} 
                    className={`cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-muted/50" : ""}`}
                    onClick={() => handleRowClick(update.id)}
                  >
                    {isVisible("select") && (
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUpdateSelection({} as React.MouseEvent, update.id)}
                        />
                      </TableCell>
                    )}
                    {isVisible("title") && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {update.title}
                          {update.is_ai_summary && <AIBadge size="sm" />}
                        </div>
                      </TableCell>
                    )}
                    {isVisible("update_type") && (
                      <TableCell>{update.update_type}</TableCell>
                    )}
                    {isVisible("user_id") && (
                      <TableCell className="text-muted-foreground">
                        {userProfile?.full_name || userProfile?.email || "Unknown"}
                      </TableCell>
                    )}
                    {isVisible("created_at") && (
                      <TableCell>{format(new Date(update.created_at), "MMM dd, yyyy")}</TableCell>
                    )}
                    {isVisible("actions") && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/**
                           * @deprecated Since: 2026-01-15
                           * Removed: "View details" ExternalLink button
                           * Reason: Row click now handles navigation to dedicated Update Details page
                           * The entire row is clickable, so a separate "View details" button is redundant
                           */}
                          {canEditUpdates && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => handleEdit(e, update)} 
                              disabled={isClosedCase}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteUpdates && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => handleDelete(e, update.id)} 
                              disabled={isClosedCase}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UpdateForm
        caseId={caseId}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingUpdate(null); }}
        onSuccess={fetchUpdates}
        editingUpdate={editingUpdate}
        organizationId={organization?.id || ""}
      />

      <AISummaryDialog
        open={showAISummaryDialog}
        onOpenChange={setShowAISummaryDialog}
        caseId={caseId}
        selectedUpdates={selectedUpdatesForDialog}
        onSuccess={() => {
          fetchUpdates();
          setSelectedUpdateIds(new Set());
        }}
      />
    </>
  );
};

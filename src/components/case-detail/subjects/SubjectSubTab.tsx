import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Subject, SubjectCategory, SubjectStatus, SUBJECT_CATEGORY_SINGULAR } from "./types";
import { SubjectFilters, ViewMode } from "./SubjectFilters";
import { SubjectListView } from "./SubjectListView";
import { SubjectCardView } from "./SubjectCardView";
import { SubjectDrawer } from "./SubjectDrawer";
import { CaseTabSkeleton } from "../CaseTabSkeleton";
import { usePermissions } from "@/hooks/usePermissions";

interface SubjectSubTabProps {
  caseId: string;
  organizationId: string;
  category: SubjectCategory;
  isClosedCase: boolean;
}

const getStoredViewMode = (): ViewMode => {
  const stored = localStorage.getItem('subjects-view-mode');
  return (stored === 'list' || stored === 'cards') ? stored : 'cards';
};

export const SubjectSubTab = ({ caseId, organizationId, category, isClosedCase }: SubjectSubTabProps) => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubjectStatus | 'all'>('active');
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canAddSubjects = hasPermission("add_subjects");
  const canEditSubjects = hasPermission("edit_subjects");
  const canDeleteSubjects = hasPermission("delete_subjects");

  useEffect(() => {
    fetchSubjects();
  }, [caseId, category]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('subjects-view-mode', mode);
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("case_subjects")
        .select("*")
        .eq("case_id", caseId)
        .eq("subject_type", category)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map to ensure all required fields exist with proper typing
      const mappedSubjects: Subject[] = (data || []).map((s) => ({
        ...s,
        subject_type: s.subject_type as SubjectCategory,
        details: (typeof s.details === 'object' && s.details !== null ? s.details : {}) as Record<string, any>,
        status: (s.status || 'active') as SubjectStatus,
        display_name: s.display_name || s.name,
        role: s.role || null,
        archived_at: s.archived_at || null,
        archived_by: s.archived_by || null,
      }));
      
      setSubjects(mappedSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setSelectedSubject(null);
    setDrawerOpen(true);
  };

  const handleNavigateToDetail = (subject: Subject) => {
    navigate(`/cases/${caseId}/subjects/${subject.id}`);
  };

  const handleEditInDrawer = (subject: Subject) => {
    setSelectedSubject(subject);
    setDrawerOpen(true);
  };

  const handleArchive = async (subject: Subject) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("case_subjects")
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq("id", subject.id);

      if (error) throw error;

      toast({ title: "Success", description: "Subject archived" });
      fetchSubjects();
    } catch (error) {
      console.error("Error archiving subject:", error);
      toast({ title: "Error", description: "Failed to archive subject", variant: "destructive" });
    }
  };

  const handleUnarchive = async (subject: Subject) => {
    try {
      const { error } = await supabase
        .from("case_subjects")
        .update({
          status: 'active',
          archived_at: null,
          archived_by: null,
        })
        .eq("id", subject.id);

      if (error) throw error;

      toast({ title: "Success", description: "Subject unarchived" });
      fetchSubjects();
    } catch (error) {
      console.error("Error unarchiving subject:", error);
      toast({ title: "Error", description: "Failed to unarchive subject", variant: "destructive" });
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = searchQuery === "" ||
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || subject.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Determine if drawer should be read-only
  const isReadOnly = !canEditSubjects || 
    isClosedCase || 
    (selectedSubject?.status === 'archived');

  if (loading || permissionsLoading) {
    return <CaseTabSkeleton title={SUBJECT_CATEGORY_SINGULAR[category]} subtitle="Loading..." showCards rows={4} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <SubjectFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        <Button
          onClick={handleAddClick}
          disabled={!canAddSubjects || isClosedCase}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add {SUBJECT_CATEGORY_SINGULAR[category]}
        </Button>
      </div>

      {viewMode === 'list' ? (
        <SubjectListView
          subjects={filteredSubjects}
          category={category}
          caseId={caseId}
          onNavigate={handleNavigateToDetail}
          onEdit={handleEditInDrawer}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          canEdit={canEditSubjects}
          canArchive={canDeleteSubjects}
          isClosedCase={isClosedCase}
        />
      ) : (
        <SubjectCardView
          subjects={filteredSubjects}
          category={category}
          caseId={caseId}
          onNavigate={handleNavigateToDetail}
          onEdit={handleEditInDrawer}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          canEdit={canEditSubjects}
          canArchive={canDeleteSubjects}
          isClosedCase={isClosedCase}
        />
      )}

      <SubjectDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        subject={selectedSubject}
        category={category}
        caseId={caseId}
        organizationId={organizationId}
        onSuccess={fetchSubjects}
        readOnly={isReadOnly}
      />
    </div>
  );
};

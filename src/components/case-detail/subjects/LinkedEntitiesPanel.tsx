import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User, Car, MapPin, Package, ChevronRight, Link as LinkIcon, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Subject, SubjectCategory, SUBJECT_CATEGORY_SINGULAR } from "./types";
import { LinkSubjectDialog } from "./LinkSubjectDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LinkedEntitiesPanelProps {
  subjectId: string;
  caseId: string;
  organizationId: string;
  subjectType: SubjectCategory;
}

const getCategoryIcon = (category: SubjectCategory) => {
  switch (category) {
    case 'person':
      return User;
    case 'vehicle':
      return Car;
    case 'location':
      return MapPin;
    case 'item':
      return Package;
  }
};

interface LinkedSubject {
  id: string;
  name: string;
  display_name: string | null;
  subject_type: SubjectCategory;
  status: string;
  link_type: string;
  direction: 'outgoing' | 'incoming';
  linkId: string;
}

export const LinkedEntitiesPanel = ({
  subjectId,
  caseId,
  organizationId,
  subjectType,
}: LinkedEntitiesPanelProps) => {
  const navigate = useNavigate();
  const [linkedSubjects, setLinkedSubjects] = useState<LinkedSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [subjectToUnlink, setSubjectToUnlink] = useState<LinkedSubject | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    fetchLinkedSubjects();
  }, [subjectId]);

  const fetchLinkedSubjects = async () => {
    try {
      // Fetch outgoing links (this subject -> other subjects)
      const { data: outgoingLinks, error: outError } = await supabase
        .from("subject_links")
        .select("id, target_subject_id, link_type")
        .eq("source_subject_id", subjectId);

      if (outError) throw outError;

      // Fetch incoming links (other subjects -> this subject)
      const { data: incomingLinks, error: inError } = await supabase
        .from("subject_links")
        .select("id, source_subject_id, link_type")
        .eq("target_subject_id", subjectId);

      if (inError) throw inError;

      // Get all unique subject IDs
      const outgoingIds = (outgoingLinks || []).map(l => l.target_subject_id);
      const incomingIds = (incomingLinks || []).map(l => l.source_subject_id);
      const allIds = [...new Set([...outgoingIds, ...incomingIds])];

      if (allIds.length === 0) {
        setLinkedSubjects([]);
        setLoading(false);
        return;
      }

      // Fetch subject details for all linked subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from("case_subjects")
        .select("id, name, display_name, subject_type, status")
        .in("id", allIds);

      if (subjectsError) throw subjectsError;

      // Map subjects with their link info
      const linked: LinkedSubject[] = [];

      (outgoingLinks || []).forEach(link => {
        const subject = subjects?.find(s => s.id === link.target_subject_id);
        if (subject) {
          linked.push({
            ...subject,
            subject_type: subject.subject_type as SubjectCategory,
            link_type: link.link_type,
            direction: 'outgoing',
            linkId: link.id,
          });
        }
      });

      (incomingLinks || []).forEach(link => {
        const subject = subjects?.find(s => s.id === link.source_subject_id);
        if (subject && !linked.some(l => l.id === subject.id)) {
          linked.push({
            ...subject,
            subject_type: subject.subject_type as SubjectCategory,
            link_type: link.link_type,
            direction: 'incoming',
            linkId: link.id,
          });
        }
      });

      setLinkedSubjects(linked);
    } catch (error) {
      console.error("Error fetching linked subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkClick = (e: React.MouseEvent, subject: LinkedSubject) => {
    e.stopPropagation();
    setSubjectToUnlink(subject);
    setUnlinkDialogOpen(true);
  };

  const handleUnlink = async () => {
    if (!subjectToUnlink) return;

    setUnlinking(true);
    try {
      const { error } = await supabase
        .from("subject_links")
        .delete()
        .eq("id", subjectToUnlink.linkId);

      if (error) throw error;

      toast.success(`Unlinked ${subjectToUnlink.display_name || subjectToUnlink.name}`);
      fetchLinkedSubjects();
    } catch (error) {
      console.error("Error unlinking subject:", error);
      toast.error("Failed to unlink subject");
    } finally {
      setUnlinking(false);
      setUnlinkDialogOpen(false);
      setSubjectToUnlink(null);
    }
  };

  // Group by category
  const groupedByCategory = linkedSubjects.reduce((acc, subject) => {
    if (!acc[subject.subject_type]) {
      acc[subject.subject_type] = [];
    }
    acc[subject.subject_type].push(subject);
    return acc;
  }, {} as Record<SubjectCategory, LinkedSubject[]>);

  // Determine which categories to show based on subject type
  const getRelevantCategories = (): SubjectCategory[] => {
    switch (subjectType) {
      case 'person':
        return ['vehicle', 'location', 'item'];
      case 'vehicle':
        return ['person', 'location'];
      case 'location':
        return ['person', 'vehicle'];
      case 'item':
        return ['person', 'vehicle', 'location'];
      default:
        return ['person', 'vehicle', 'location', 'item'];
    }
  };

  const relevantCategories = getRelevantCategories();
  const existingLinkedIds = linkedSubjects.map(s => s.id);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Linked Entities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Linked Entities</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Link
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {relevantCategories.map(category => {
            const subjects = groupedByCategory[category] || [];
            const Icon = getCategoryIcon(category);
            const categoryLabel = category === 'person' ? 'People' : 
              category === 'vehicle' ? 'Vehicles' : 
              category === 'location' ? 'Locations' : 'Items';

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {categoryLabel}
                  </span>
                </div>
                
                {subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 italic pl-6">
                    No linked {categoryLabel.toLowerCase()}
                  </p>
                ) : (
                  <div className="space-y-1 pl-6">
                    {subjects.map(subject => (
                      <div
                        key={subject.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg",
                          "border border-border bg-card group"
                        )}
                      >
                        <button
                          onClick={() => navigate(`/cases/${caseId}/subjects/${subject.id}`)}
                          className="flex-1 flex items-center justify-between gap-2 hover:bg-accent/50 rounded transition-colors text-left min-w-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">
                              {subject.display_name || subject.name}
                            </span>
                            {subject.link_type && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {subject.link_type}
                              </Badge>
                            )}
                            {subject.status === 'archived' && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                Archived
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleUnlinkClick(e, subject)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {linkedSubjects.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No linked entities</p>
              <p className="text-xs mt-1">Click "Link" to connect subjects</p>
            </div>
          )}
        </CardContent>
      </Card>

      <LinkSubjectDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        caseId={caseId}
        organizationId={organizationId}
        sourceSubjectId={subjectId}
        sourceSubjectType={subjectType}
        existingLinkedIds={existingLinkedIds}
        onSuccess={fetchLinkedSubjects}
      />

      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink "{subjectToUnlink?.display_name || subjectToUnlink?.name}"? 
              This will remove the relationship between these subjects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={unlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unlinking ? "Unlinking..." : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

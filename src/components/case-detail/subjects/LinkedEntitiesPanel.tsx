import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Car, MapPin, Package, ChevronRight, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Subject, SubjectCategory, SUBJECT_CATEGORY_SINGULAR } from "./types";
import { cn } from "@/lib/utils";

interface LinkedEntitiesPanelProps {
  subjectId: string;
  caseId: string;
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
}

export const LinkedEntitiesPanel = ({
  subjectId,
  caseId,
  subjectType,
}: LinkedEntitiesPanelProps) => {
  const navigate = useNavigate();
  const [linkedSubjects, setLinkedSubjects] = useState<LinkedSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinkedSubjects();
  }, [subjectId]);

  const fetchLinkedSubjects = async () => {
    try {
      // Fetch outgoing links (this subject -> other subjects)
      const { data: outgoingLinks, error: outError } = await supabase
        .from("subject_links")
        .select("target_subject_id, link_type")
        .eq("source_subject_id", subjectId);

      if (outError) throw outError;

      // Fetch incoming links (other subjects -> this subject)
      const { data: incomingLinks, error: inError } = await supabase
        .from("subject_links")
        .select("source_subject_id, link_type")
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Linked Entities</CardTitle>
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
                    <button
                      key={subject.id}
                      onClick={() => navigate(`/cases/${caseId}/subjects/${subject.id}`)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 p-2 rounded-lg",
                        "border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {subject.display_name || subject.name}
                        </span>
                        {subject.status === 'archived' && (
                          <Badge variant="secondary" className="text-xs">
                            Archived
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

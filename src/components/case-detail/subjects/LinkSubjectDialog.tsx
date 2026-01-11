import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Car, MapPin, Package, Search, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SubjectCategory, SUBJECT_CATEGORY_SINGULAR } from "./types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LinkSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  organizationId: string;
  sourceSubjectId: string;
  sourceSubjectType: SubjectCategory;
  existingLinkedIds: string[];
  onSuccess: () => void;
}

interface AvailableSubject {
  id: string;
  name: string;
  display_name: string | null;
  subject_type: SubjectCategory;
  status: string;
}

// Link types based on source and target categories
const getLinkTypes = (source: SubjectCategory, target: SubjectCategory): string[] => {
  const linkTypesMap: Record<string, string[]> = {
    'person-vehicle': ['Owner', 'Driver', 'Passenger', 'Associated'],
    'person-location': ['Resident', 'Employer', 'Visitor', 'Associated'],
    'person-item': ['Owner', 'Possesses', 'Associated'],
    'person-person': ['Spouse', 'Family', 'Associate', 'Employer', 'Employee', 'Associated'],
    'vehicle-person': ['Registered To', 'Associated'],
    'vehicle-location': ['Registered At', 'Parked At', 'Associated'],
    'vehicle-vehicle': ['Associated'],
    'location-person': ['Owned By', 'Occupied By', 'Associated'],
    'location-vehicle': ['Associated'],
    'location-location': ['Associated'],
    'item-person': ['Owned By', 'Found On', 'Associated'],
    'item-vehicle': ['Found In', 'Associated'],
    'item-location': ['Found At', 'Associated'],
    'item-item': ['Associated'],
  };
  
  return linkTypesMap[`${source}-${target}`] || ['Associated'];
};

const getCategoryIcon = (category: SubjectCategory) => {
  switch (category) {
    case 'person': return User;
    case 'vehicle': return Car;
    case 'location': return MapPin;
    case 'item': return Package;
  }
};

export const LinkSubjectDialog = ({
  open,
  onOpenChange,
  caseId,
  organizationId,
  sourceSubjectId,
  sourceSubjectType,
  existingLinkedIds,
  onSuccess,
}: LinkSubjectDialogProps) => {
  const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<AvailableSubject | null>(null);
  const [linkType, setLinkType] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<SubjectCategory | 'all'>('all');

  useEffect(() => {
    if (open) {
      fetchAvailableSubjects();
      setSelectedSubject(null);
      setLinkType("");
      setSearchQuery("");
      setCategoryFilter('all');
    }
  }, [open, caseId]);

  const fetchAvailableSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("case_subjects")
        .select("id, name, display_name, subject_type, status")
        .eq("case_id", caseId)
        .neq("id", sourceSubjectId)
        .eq("status", "active");

      if (error) throw error;

      // Filter out already linked subjects
      const filtered = (data || []).filter(
        (s) => !existingLinkedIds.includes(s.id)
      ) as AvailableSubject[];

      setAvailableSubjects(filtered);
    } catch (error) {
      console.error("Error fetching available subjects:", error);
      toast.error("Failed to load available subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubject = (subject: AvailableSubject) => {
    setSelectedSubject(subject);
    // Set default link type
    const types = getLinkTypes(sourceSubjectType, subject.subject_type);
    setLinkType(types[0] || 'Associated');
  };

  const handleSubmit = async () => {
    if (!selectedSubject || !linkType) return;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("subject_links").insert({
        case_id: caseId,
        organization_id: organizationId,
        source_subject_id: sourceSubjectId,
        target_subject_id: selectedSubject.id,
        link_type: linkType,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      toast.success(`Linked to ${selectedSubject.display_name || selectedSubject.name}`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating link:", error);
      toast.error("Failed to create link");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter subjects by search query and category
  const filteredSubjects = availableSubjects.filter((subject) => {
    const matchesSearch =
      (subject.display_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      subject.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || subject.subject_type === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get relevant categories to show in filter
  const getRelevantCategories = (): SubjectCategory[] => {
    const uniqueTypes = [...new Set(availableSubjects.map((s) => s.subject_type))];
    return uniqueTypes;
  };

  const relevantCategories = getRelevantCategories();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link Subject
          </DialogTitle>
          <DialogDescription>
            Select a subject to link to this {SUBJECT_CATEGORY_SINGULAR[sourceSubjectType].toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {relevantCategories.length > 1 && (
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as SubjectCategory | 'all')}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {relevantCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {SUBJECT_CATEGORY_SINGULAR[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Subject List */}
          <ScrollArea className="h-[250px] border rounded-md">
            {loading ? (
              <div className="p-4 space-y-2">
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-12 bg-muted rounded animate-pulse" />
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">No available subjects to link</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredSubjects.map((subject) => {
                  const Icon = getCategoryIcon(subject.subject_type);
                  const isSelected = selectedSubject?.id === subject.id;

                  return (
                    <button
                      key={subject.id}
                      onClick={() => handleSelectSubject(subject)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        isSelected
                          ? "bg-primary/10 border-2 border-primary"
                          : "hover:bg-accent border-2 border-transparent"
                      )}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {subject.display_name || subject.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {SUBJECT_CATEGORY_SINGULAR[subject.subject_type]}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="shrink-0">
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Link Type Selection */}
          {selectedSubject && (
            <div className="space-y-2">
              <Label>Link Type</Label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  {getLinkTypes(sourceSubjectType, selectedSubject.subject_type).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSubject || !linkType || submitting}
          >
            {submitting ? "Linking..." : "Link Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

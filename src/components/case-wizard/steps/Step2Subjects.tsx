import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Car, MapPin, Package, Plus, AlertCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SubjectDrawer } from "@/components/case-detail/subjects/SubjectDrawer";
import { SubjectCategory } from "@/components/case-detail/subjects/types";
import { WizardNavigation } from "../WizardNavigation";
import { toast } from "sonner";

interface Step2Props {
  caseId: string;
  organizationId: string;
  onBack: () => void;
  onContinue: (count: number) => void;
}

interface SubjectCounts {
  person: number;
  vehicle: number;
  location: number;
  item: number;
}

interface SubjectInfo {
  id: string;
  name: string;
  subject_type: string;
  is_primary: boolean;
}

const CATEGORY_INFO: Array<{ key: SubjectCategory; label: string; icon: React.ReactNode }> = [
  { key: "person", label: "People", icon: <Users className="h-5 w-5" /> },
  { key: "vehicle", label: "Vehicles", icon: <Car className="h-5 w-5" /> },
  { key: "location", label: "Locations", icon: <MapPin className="h-5 w-5" /> },
  { key: "item", label: "Items", icon: <Package className="h-5 w-5" /> },
];

export function Step2Subjects({ caseId, organizationId, onBack, onContinue }: Step2Props) {
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategory>("person");
  const [counts, setCounts] = useState<SubjectCounts>({ person: 0, vehicle: 0, location: 0, item: 0 });
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, [caseId]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("case_subjects")
        .select("id, name, subject_type, is_primary")
        .eq("case_id", caseId)
        .is("archived_at", null);

      if (error) throw error;

      setSubjects(data || []);
      
      const newCounts: SubjectCounts = { person: 0, vehicle: 0, location: 0, item: 0 };
      data?.forEach(subject => {
        const type = subject.subject_type as SubjectCategory;
        if (type in newCounts) {
          newCounts[type]++;
        }
      });
      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const hasPrimarySubject = subjects.some(s => s.is_primary);
  const primarySubject = subjects.find(s => s.is_primary);

  const handleAddSubject = (category: SubjectCategory) => {
    setSelectedCategory(category);
    setShowSubjectForm(true);
    setHasStarted(true);
  };

  const handleSubjectSuccess = async () => {
    setShowSubjectForm(false);
    await fetchSubjects();
    
    // Check if this was the first subject - auto-set as primary
    const { data: updatedSubjects } = await supabase
      .from("case_subjects")
      .select("id, is_primary")
      .eq("case_id", caseId)
      .is("archived_at", null);
    
    if (updatedSubjects && updatedSubjects.length === 1 && !updatedSubjects[0].is_primary) {
      // This is the first and only subject - make it primary
      const { error } = await supabase
        .from("case_subjects")
        .update({ is_primary: true })
        .eq("id", updatedSubjects[0].id);
      
      if (!error) {
        toast.success("First subject automatically set as Primary Subject");
        await fetchSubjects();
      }
    }
  };

  const handleSetPrimary = async (subjectId: string) => {
    try {
      // The trigger will handle unsetting other primaries
      const { error } = await supabase
        .from("case_subjects")
        .update({ is_primary: true })
        .eq("id", subjectId);

      if (error) throw error;

      toast.success("Primary subject updated - case title will be set from this subject");
      await fetchSubjects();
    } catch (error) {
      console.error("Error setting primary:", error);
      toast.error("Failed to set primary subject");
    }
  };

  const handleContinue = () => {
    if (!hasPrimarySubject) {
      toast.error("Please designate a Primary Subject before continuing. The case title will be set from the primary subject's name.");
      return;
    }
    onContinue(totalCount);
  };

  if (!hasStarted && totalCount === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Add Subjects to This Case</h3>
          <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
            Subjects can include people, vehicles, locations, or items relevant to your investigation.
          </p>
          <Alert className="max-w-md mx-auto mb-6 bg-primary/5 border-primary/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Required:</strong> You must add at least one subject and designate it as the <strong>Primary Subject</strong>.
              The case title will be set to the primary subject's name.
            </AlertDescription>
          </Alert>
          
          <Button onClick={() => setHasStarted(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Subjects
          </Button>
        </div>

        <WizardNavigation
          currentStep={3}
          onBack={onBack}
          onContinue={handleContinue}
          canContinue={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Add Subjects</h3>
        <p className="text-sm text-muted-foreground">
          Add people, vehicles, locations, or items to your case.
        </p>
      </div>

      {/* Primary Subject Requirement Alert */}
      {!hasPrimarySubject && totalCount > 0 && (
        <Alert variant="destructive" className="bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Required:</strong> Please designate one subject as the <strong>Primary Subject</strong>. 
            The case title will be set to this subject's name.
          </AlertDescription>
        </Alert>
      )}

      {/* Primary Subject Success */}
      {hasPrimarySubject && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
          <Star className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Primary Subject:</strong> {primarySubject?.name}
            <span className="text-green-600 dark:text-green-400"> — Case title will be set to this name</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Category cards */}
      <div className="grid grid-cols-2 gap-4">
        {CATEGORY_INFO.map(category => (
          <Card
            key={category.key}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleAddSubject(category.key)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">{category.icon}</div>
                <div>
                  <p className="font-medium">{category.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Click to add
                  </p>
                </div>
              </div>
              {counts[category.key] > 0 && (
                <Badge variant="secondary">{counts[category.key]}</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subject List with Primary Toggle */}
      {subjects.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Added Subjects</h4>
          <div className="space-y-2">
            {subjects.map(subject => (
              <div
                key={subject.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  subject.is_primary 
                    ? "bg-primary/5 border-primary/30" 
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {subject.is_primary && (
                    <Star className="h-4 w-4 text-primary fill-primary" />
                  )}
                  <div>
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {subject.subject_type}
                      {subject.is_primary && " • Primary Subject"}
                    </p>
                  </div>
                </div>
                {!subject.is_primary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPrimary(subject.id)}
                    className="text-xs"
                  >
                    Set as Primary
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {totalCount > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm font-medium">
            {totalCount} subject{totalCount !== 1 ? "s" : ""} added
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {CATEGORY_INFO.filter(c => counts[c.key] > 0).map(category => (
              <Badge key={category.key} variant="outline" className="gap-1">
                {category.icon}
                {counts[category.key]} {category.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <WizardNavigation
        currentStep={3}
        onBack={onBack}
        onContinue={handleContinue}
        canContinue={hasPrimarySubject}
      />

      {/* Subject Drawer */}
      <SubjectDrawer
        open={showSubjectForm}
        onOpenChange={setShowSubjectForm}
        subject={null}
        caseId={caseId}
        organizationId={organizationId}
        category={selectedCategory}
        onSuccess={handleSubjectSuccess}
      />
    </div>
  );
}
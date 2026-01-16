import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Car, MapPin, Package, Plus, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SubjectDrawer } from "@/components/case-detail/subjects/SubjectDrawer";
import { SubjectCategory } from "@/components/case-detail/subjects/types";
import { WizardNavigation } from "../WizardNavigation";

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
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    fetchCounts();
  }, [caseId]);

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("case_subjects")
        .select("subject_type")
        .eq("case_id", caseId)
        .is("archived_at", null);

      if (error) throw error;

      const newCounts: SubjectCounts = { person: 0, vehicle: 0, location: 0, item: 0 };
      data?.forEach(subject => {
        const type = subject.subject_type as SubjectCategory;
        if (type in newCounts) {
          newCounts[type]++;
        }
      });
      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching subject counts:", error);
    }
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const handleAddSubject = (category: SubjectCategory) => {
    setSelectedCategory(category);
    setShowSubjectForm(true);
    setHasStarted(true);
  };

  const handleSubjectSuccess = () => {
    setShowSubjectForm(false);
    fetchCounts();
  };

  const handleContinue = () => {
    onContinue(totalCount);
  };

  if (!hasStarted) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Would you like to add subjects to this case?</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Subjects can include people, vehicles, locations, or items relevant to your investigation.
            The first subject you add will automatically become the primary subject and set the case name.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setHasStarted(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Subjects
            </Button>
            <Button variant="outline" onClick={handleContinue} className="gap-2">
              <SkipForward className="h-4 w-4" />
              Skip for Now
            </Button>
          </div>
        </div>

        <WizardNavigation
          currentStep={2}
          onBack={onBack}
          onContinue={handleContinue}
          canContinue={true}
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
          {totalCount === 0 && " The first subject will automatically become the primary and set the case name."}
        </p>
      </div>

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
        currentStep={2}
        onBack={onBack}
        onContinue={handleContinue}
        canContinue={true}
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

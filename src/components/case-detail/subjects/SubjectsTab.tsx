import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Car, MapPin, Package, Building2, ShieldAlert, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SubjectCategory, SUBJECT_CATEGORY_LABELS } from "./types";
import { SubjectSubTab } from "./SubjectSubTab";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { CaseTabSkeleton } from "../CaseTabSkeleton";
import { useCaseTypeConfig, filterSubjectTypesByAllowed } from "@/hooks/useCaseTypeConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubjectsTabProps {
  caseId: string;
  caseTypeId?: string | null; // Added to filter subject types
  isClosedCase?: boolean;
}

interface SubjectCounts {
  person: number;
  vehicle: number;
  location: number;
  item: number;
  business: number;
}

const CATEGORY_ICONS: Record<SubjectCategory, React.ComponentType<{ className?: string }>> = {
  person: User,
  vehicle: Car,
  location: MapPin,
  item: Package,
  business: Building2,
};

const ALL_CATEGORIES: SubjectCategory[] = ['person', 'vehicle', 'location', 'item', 'business'];

export const SubjectsTab = ({ caseId, caseTypeId, isClosedCase = false }: SubjectsTabProps) => {
  const { organization } = useOrganization();
  const [activeCategory, setActiveCategory] = useState<SubjectCategory>('person');
  const [counts, setCounts] = useState<SubjectCounts>({ person: 0, vehicle: 0, location: 0, item: 0, business: 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);
  
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewSubjects = hasPermission("view_subjects");
  
  // Get Case Type configuration for filtering subject types
  const { config: caseTypeConfig, isLoading: caseTypeLoading } = useCaseTypeConfig(caseTypeId);
  
  // Filter categories based on Case Type allowed_subject_types
  const categories = useMemo(() => {
    const allowed = filterSubjectTypesByAllowed(
      ALL_CATEGORIES as string[],
      caseTypeConfig?.allowedSubjectTypes
    ) as SubjectCategory[];
    return allowed.length > 0 ? allowed : ALL_CATEGORIES;
  }, [caseTypeConfig?.allowedSubjectTypes]);
  
  // Update active category if current one is no longer allowed
  useEffect(() => {
    if (!categories.includes(activeCategory) && categories.length > 0) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    fetchCounts();
  }, [caseId]);

  const fetchCounts = async () => {
    try {
      // Fetch counts for all categories
      const { data, error } = await supabase
        .from("case_subjects")
        .select("subject_type, status")
        .eq("case_id", caseId);

      if (error) throw error;

      const newCounts: SubjectCounts = { person: 0, vehicle: 0, location: 0, item: 0, business: 0 };
      (data || []).forEach((subject) => {
        const type = subject.subject_type as SubjectCategory;
        if (type in newCounts) {
          // Only count active subjects for the badge
          if (subject.status === 'active' || !subject.status) {
            newCounts[type]++;
          }
        }
      });
      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching subject counts:", error);
    } finally {
      setLoadingCounts(false);
    }
  };

  if (permissionsLoading) {
    return <CaseTabSkeleton title="Subjects" subtitle="Loading..." showCards rows={4} />;
  }

  if (!canViewSubjects) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center">
            You don't have permission to view subjects. Contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subjects</h2>
        <p className="text-muted-foreground">Manage people, vehicles, locations, and items related to this case</p>
      </div>

      {/* Show info if subject types are filtered by Case Type */}
      {caseTypeConfig?.hasSubjectTypeRestrictions && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Only {categories.length} subject type{categories.length !== 1 ? 's' : ''} allowed for this case type: {categories.map(c => SUBJECT_CATEGORY_LABELS[c]).join(', ')}.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as SubjectCategory)}>
        <TabsList className={`grid w-full grid-cols-${Math.min(categories.length, 5)}`}>
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            const count = counts[category];
            return (
              <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{SUBJECT_CATEGORY_LABELS[category]}</span>
                {!loadingCounts && count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            {organization?.id && (
              <SubjectSubTab
                caseId={caseId}
                organizationId={organization.id}
                category={category}
                isClosedCase={isClosedCase}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

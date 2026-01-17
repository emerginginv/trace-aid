import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectData, createEmptySubject } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible } from "@/types/case-request-form-config";
import { Loader2, ArrowLeft, User, Edit2, Trash2, Car, MapPin, Package, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useSubjectTypesForPublicForm, useCaseTypesForPublicForm } from "@/hooks/queries/useCaseRequestFormBySlug";
import { SubjectCategory } from "@/components/case-detail/subjects/types";

// Import category-specific form components
import { PersonFormFields } from "./subject-forms/PersonFormFields";
import { VehicleFormFields } from "./subject-forms/VehicleFormFields";
import { LocationFormFields } from "./subject-forms/LocationFormFields";
import { ItemFormFields } from "./subject-forms/ItemFormFields";
import { BusinessFormFields } from "./subject-forms/BusinessFormFields";

interface SubjectInformationStepProps {
  fieldConfig: CaseRequestFormConfig;
  organizationId: string;
  caseTypeId: string;
  subject: SubjectData | null;
  subjectTypeId?: string | null;
  onSubmit: (data: SubjectData) => void;
  onBack: () => void;
  isEditing?: boolean;
  existingSubjects?: SubjectData[];
  onEditSubject?: (subjectId: string) => void;
  onRemoveSubject?: (subjectId: string) => void;
}

// Category icon mapping
const CATEGORY_ICONS: Record<SubjectCategory, React.ComponentType<{ className?: string }>> = {
  person: User,
  vehicle: Car,
  location: MapPin,
  item: Package,
  business: Building2,
};

const CATEGORY_LABELS: Record<SubjectCategory, string> = {
  person: 'Person Information',
  vehicle: 'Vehicle Information',
  location: 'Location Information',
  item: 'Item Information',
  business: 'Business Information',
};

export function SubjectInformationStep({
  fieldConfig,
  organizationId,
  caseTypeId,
  subject,
  subjectTypeId,
  onSubmit,
  onBack,
  isEditing = false,
  existingSubjects = [],
  onEditSubject,
  onRemoveSubject,
}: SubjectInformationStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SubjectData>(subject || createEmptySubject(true, subjectTypeId || undefined));

  // Fetch subject types and case types
  const { data: subjectTypes } = useSubjectTypesForPublicForm(organizationId);
  const { data: caseTypes } = useCaseTypesForPublicForm(organizationId);

  // Get allowed subject types for selected case type
  const selectedCaseType = caseTypes?.find(ct => ct.id === caseTypeId);
  const allowedSubjectTypes = subjectTypes?.filter(st => 
    !selectedCaseType?.allowed_subject_types?.length || 
    selectedCaseType.allowed_subject_types.includes(st.id)
  );

  // Determine category from selected subject type
  const selectedSubjectType = allowedSubjectTypes?.find(st => st.id === (formData.subject_type_id || subjectTypeId));
  const category: SubjectCategory = (selectedSubjectType?.category as SubjectCategory) || 'person';

  const showSubjectFields = isFieldVisible(fieldConfig, 'subjectInformation', 'primarySubject');

  if (!showSubjectFields) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Subject information is not required for this form.</p>
          </CardContent>
        </Card>
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => onSubmit(createEmptySubject(true))}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Helper to get subject type name
  const getSubjectTypeName = (subjectTypeId: string | null) => {
    if (!subjectTypeId || !subjectTypes) return 'Subject';
    const type = subjectTypes.find(t => t.id === subjectTypeId);
    return type?.name || 'Subject';
  };

  // Helper to get display name for a subject based on category
  const getSubjectDisplayName = (s: SubjectData) => {
    const subjectType = subjectTypes?.find(st => st.id === s.subject_type_id);
    const cat = (subjectType?.category as SubjectCategory) || 'person';
    
    switch (cat) {
      case 'person':
        const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : 'Unnamed Person';
      case 'vehicle':
        const vehicleDetails = s.custom_fields || {};
        const vehicleParts = [vehicleDetails.year, vehicleDetails.make, vehicleDetails.model].filter(Boolean);
        return vehicleParts.length > 0 ? vehicleParts.join(' ') : 'Unnamed Vehicle';
      case 'location':
        return s.custom_fields?.name || 'Unnamed Location';
      case 'item':
        return s.custom_fields?.name || 'Unnamed Item';
      case 'business':
        return s.custom_fields?.name || 'Unnamed Business';
      default:
        return 'Unnamed Subject';
    }
  };

  // Get category icon for a subject
  const getSubjectIcon = (s: SubjectData) => {
    const subjectType = subjectTypes?.find(st => st.id === s.subject_type_id);
    const cat = (subjectType?.category as SubjectCategory) || 'person';
    return CATEGORY_ICONS[cat] || User;
  };

  const handleFormSubmit = async (data: SubjectData) => {
    setIsSubmitting(true);
    try {
      onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const CategoryIcon = CATEGORY_ICONS[category] || User;
  const categoryLabel = CATEGORY_LABELS[category] || 'Subject Information';
  const subjectTypeName = selectedSubjectType?.name;

  return (
    <div className="space-y-6">
      {/* Existing Subjects List */}
      {existingSubjects.length > 0 && !isEditing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Added Subjects ({existingSubjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {existingSubjects.map((s) => {
                const SubjectIcon = getSubjectIcon(s);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {s.photo_url ? (
                        <img
                          src={s.photo_url}
                          alt={getSubjectDisplayName(s)}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          <SubjectIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{getSubjectDisplayName(s)}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {getSubjectTypeName(s.subject_type_id)}
                          </Badge>
                          {s.is_primary && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">Primary</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onEditSubject && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditSubject(s.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {onRemoveSubject && !s.is_primary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onRemoveSubject(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5" />
            {subjectTypeName ? `${subjectTypeName} Information` : categoryLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Render category-specific form */}
          {category === 'person' && (
            <PersonFormFields
              subject={formData}
              subjectTypes={allowedSubjectTypes}
              fieldConfig={fieldConfig}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          )}
          {category === 'vehicle' && (
            <VehicleFormFields
              subject={formData}
              subjectTypes={allowedSubjectTypes}
              fieldConfig={fieldConfig}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          )}
          {category === 'location' && (
            <LocationFormFields
              subject={formData}
              subjectTypes={allowedSubjectTypes}
              fieldConfig={fieldConfig}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          )}
          {category === 'item' && (
            <ItemFormFields
              subject={formData}
              subjectTypes={allowedSubjectTypes}
              fieldConfig={fieldConfig}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          )}
          {category === 'business' && (
            <BusinessFormFields
              subject={formData}
              subjectTypes={allowedSubjectTypes}
              fieldConfig={fieldConfig}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

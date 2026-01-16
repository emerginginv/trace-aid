import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectData } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible } from "@/types/case-request-form-config";
import { ArrowLeft, ArrowRight, Edit2, Trash2, UserPlus, User, Users, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSubjectTypesForPublicForm, useCaseTypesForPublicForm } from "@/hooks/queries/useCaseRequestFormBySlug";

interface SubjectSummaryStepProps {
  fieldConfig: CaseRequestFormConfig;
  organizationId: string;
  caseTypeId: string;
  subjects: SubjectData[];
  onEditSubject: (id: string) => void;
  onRemoveSubject: (id: string) => void;
  onAddSubject: () => void;
  onAddSubjectOfType: (typeId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function SubjectSummaryStep({
  fieldConfig,
  organizationId,
  caseTypeId,
  subjects,
  onEditSubject,
  onRemoveSubject,
  onAddSubject,
  onAddSubjectOfType,
  onContinue,
  onBack,
}: SubjectSummaryStepProps) {
  // Fetch subject types and case types
  const { data: subjectTypes } = useSubjectTypesForPublicForm(organizationId);
  const { data: caseTypes } = useCaseTypesForPublicForm(organizationId);

  // Get allowed subject types for selected case type
  const selectedCaseType = caseTypes?.find(ct => ct.id === caseTypeId);
  const allowedSubjectTypes = subjectTypes?.filter(st => 
    !selectedCaseType?.allowed_subject_types?.length || 
    selectedCaseType.allowed_subject_types.includes(st.id)
  );

  const getSubjectTypeName = (typeId: string | null): string => {
    if (!typeId || !subjectTypes) return 'Subject';
    const type = subjectTypes.find(t => t.id === typeId);
    return type?.name || 'Subject';
  };

  const getSubjectDisplayName = (subject: SubjectData): string => {
    const name = [subject.first_name, subject.middle_name, subject.last_name]
      .filter(Boolean)
      .join(' ');
    return name || 'Unnamed Subject';
  };

  const getSubjectAddress = (subject: SubjectData): string => {
    const parts = [
      subject.address1,
      subject.city,
      subject.state,
      subject.zip,
    ].filter(Boolean);
    return parts.join(', ') || 'No address provided';
  };

  const showAdditionalSubjects = isFieldVisible(fieldConfig, 'subjectInformation', 'additionalSubjects');
  const canRemovePrimary = subjects.length > 1;

  return (
    <div className="space-y-6">
      {/* Subjects Already Added */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subjects Already Added
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No subjects have been added yet.</p>
              <p className="text-sm">Click "Add Subject" below to add one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    {subject.photo_url ? (
                      <img
                        src={subject.photo_url}
                        alt={getSubjectDisplayName(subject)}
                        className="h-16 w-16 object-cover rounded"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">
                        {getSubjectDisplayName(subject)}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {getSubjectTypeName(subject.subject_type_id)}
                      </Badge>
                      {subject.is_primary && (
                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getSubjectAddress(subject)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {subject.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {subject.email}
                        </span>
                      )}
                      {subject.cell_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {subject.cell_phone}
                        </span>
                      )}
                    </div>
                    {subject.date_of_birth && (
                      <p className="text-xs text-muted-foreground mt-1">
                        DOB: {subject.date_of_birth} {subject.age !== null && `(${subject.age} years old)`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditSubject(subject.id)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    {/* Only show delete for non-primary OR if there are multiple subjects */}
                    {(!subject.is_primary || canRemovePrimary) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Subject</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{getSubjectDisplayName(subject)}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onRemoveSubject(subject.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Additional Subjects */}
      {showAdditionalSubjects && (
        <Card>
          <CardHeader>
            <CardTitle>Add Additional Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allowedSubjectTypes && allowedSubjectTypes.length > 0 ? (
                allowedSubjectTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant="outline"
                    onClick={() => onAddSubjectOfType(type.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add {type.name}
                  </Button>
                ))
              ) : (
                <Button
                  variant="outline"
                  onClick={onAddSubject}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue} size="lg">
          I'm done adding subjects. Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

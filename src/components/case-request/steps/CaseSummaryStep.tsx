import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Step1Data, Step2Data, SubjectData, FileData } from "@/hooks/useCaseRequestForm";
import { useCaseTypesForPublicForm, useCaseServicesForPublicForm } from "@/hooks/queries/useCaseRequestFormBySlug";
import { ArrowLeft, Loader2, CheckCircle, Building2, User, FileText, Users, Paperclip, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CaseSummaryStepProps {
  organizationId: string;
  step1Data: Step1Data;
  step2Data: Step2Data;
  subjects: SubjectData[];
  files: FileData[];
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export function CaseSummaryStep({
  organizationId,
  step1Data,
  step2Data,
  subjects,
  files,
  isSubmitting,
  onSubmit,
  onBack,
}: CaseSummaryStepProps) {
  const { data: caseTypes } = useCaseTypesForPublicForm(organizationId);
  const selectedCaseType = caseTypes?.find(ct => ct.id === step1Data.case_type_id);
  
  const { data: caseServices } = useCaseServicesForPublicForm(
    organizationId,
    selectedCaseType?.allowed_service_ids
  );

  const selectedServices = caseServices?.filter(s => step2Data.case_services?.includes(s.id)) || [];

  const contactName = [
    step1Data.submitted_contact_first_name,
    step1Data.submitted_contact_middle_name,
    step1Data.submitted_contact_last_name,
  ].filter(Boolean).join(' ');

  const clientAddress = [
    step1Data.submitted_client_address1,
    step1Data.submitted_client_address2,
    step1Data.submitted_client_address3,
    [step1Data.submitted_client_city, step1Data.submitted_client_state, step1Data.submitted_client_zip].filter(Boolean).join(', '),
    step1Data.submitted_client_country !== 'United States' ? step1Data.submitted_client_country : null,
  ].filter(Boolean);

  const getSubjectName = (subject: SubjectData): string => {
    return [subject.first_name, subject.middle_name, subject.last_name]
      .filter(Boolean)
      .join(' ') || 'Unnamed Subject';
  };

  const uploadedFiles = files.filter(f => f.status === 'uploaded');

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-medium">Review Your Case Request</h3>
              <p className="text-sm text-muted-foreground">
                Please review all information before submitting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Request Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Case Type</label>
              <p className="font-medium">{selectedCaseType?.name || 'Not selected'}</p>
            </div>

            {selectedServices.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Services Requested</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedServices.map(service => (
                    <Badge key={service.id} variant="secondary">
                      {service.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {step2Data.claim_number && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Claim Number</label>
                <p>{step2Data.claim_number}</p>
              </div>
            )}

            {(step2Data.budget_dollars || step2Data.budget_hours) && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Budget</label>
                <p>
                  {step2Data.budget_dollars && `$${step2Data.budget_dollars.toLocaleString()}`}
                  {step2Data.budget_dollars && step2Data.budget_hours && ' / '}
                  {step2Data.budget_hours && `${step2Data.budget_hours} Hours`}
                </p>
              </div>
            )}

            {step2Data.notes_instructions && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes & Instructions</label>
                <p className="text-sm whitespace-pre-wrap">{step2Data.notes_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Requested By */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Requested By
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step1Data.submitted_client_name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <p className="font-medium">{step1Data.submitted_client_name}</p>
              </div>
            )}

            {clientAddress.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                {clientAddress.map((line, i) => (
                  <p key={i} className="text-sm">{line}</p>
                ))}
              </div>
            )}

            <Separator />

            {contactName && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {contactName}
                </p>
              </div>
            )}

            {step1Data.submitted_contact_email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p>{step1Data.submitted_contact_email}</p>
              </div>
            )}

            <div className="space-y-1">
              {step1Data.submitted_contact_office_phone && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Office:</span> {step1Data.submitted_contact_office_phone}
                </p>
              )}
              {step1Data.submitted_contact_mobile_phone && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Mobile:</span> {step1Data.submitted_contact_mobile_phone}
                  {step1Data.submitted_contact_mobile_carrier && ` (${step1Data.submitted_contact_mobile_carrier})`}
                </p>
              )}
              {step1Data.submitted_contact_home_phone && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Home:</span> {step1Data.submitted_contact_home_phone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subjects Section */}
      {subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Subjects ({subjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  {subject.photo_url ? (
                    <img
                      src={subject.photo_url}
                      alt={getSubjectName(subject)}
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{getSubjectName(subject)}</p>
                      {subject.is_primary && (
                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    {subject.email && (
                      <p className="text-sm text-muted-foreground truncate">{subject.email}</p>
                    )}
                    {subject.cell_phone && (
                      <p className="text-sm text-muted-foreground">{subject.cell_phone}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Section */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Paperclip className="h-5 w-5" />
              Supporting Files ({uploadedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-2 border rounded"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={onSubmit}
          size="lg"
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Save Case Request and Finish!
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Utility function
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  User, 
  Building2, 
  Paperclip, 
  ArrowLeft, 
  Send,
  Loader2,
  Pencil,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Clock,
  FileCheck,
  Users,
  Shield
} from "lucide-react";
import { useCaseTypesForPublicForm, useCaseServicesForPublicForm, useSubjectTypesForPublicForm } from "@/hooks/queries/useCaseRequestFormBySlug";
import { Step1Data, Step2Data, SubjectData, FileData } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig } from "@/types/case-request-form-config";

interface CaseSummaryStepProps {
  fieldConfig: CaseRequestFormConfig;
  organizationId: string;
  step1Data: Step1Data;
  step2Data: Step2Data;
  subjects: SubjectData[];
  files: FileData[];
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: (step: number) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function CaseSummaryStep({
  fieldConfig,
  organizationId,
  step1Data,
  step2Data,
  subjects,
  files,
  isSubmitting,
  onSubmit,
  onBack,
  onEditStep,
}: CaseSummaryStepProps) {
  const { data: caseTypes } = useCaseTypesForPublicForm(organizationId);
  const selectedCaseType = caseTypes?.find((ct) => ct.id === step1Data.case_type_id);
  
  const { data: caseServices } = useCaseServicesForPublicForm(
    organizationId,
    selectedCaseType?.allowed_service_ids
  );
  const { data: subjectTypes } = useSubjectTypesForPublicForm(organizationId);

  const selectedServices = caseServices?.filter((s) => 
    step2Data?.case_services?.includes(s.id)
  );

  const getSubjectTypeName = (typeId: string | null): string => {
    if (!typeId || !subjectTypes) return "Subject";
    return subjectTypes.find((t) => t.id === typeId)?.name || "Subject";
  };

  // Contact info
  const contactName = [
    step1Data?.submitted_contact_first_name,
    step1Data?.submitted_contact_middle_name,
    step1Data?.submitted_contact_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const uploadedFiles = files.filter((f) => f.status === "uploaded");

  // Build address string for client
  const buildClientAddress = () => {
    const parts = [];
    if (step1Data?.submitted_client_address1) parts.push(step1Data.submitted_client_address1);
    if (step1Data?.submitted_client_address2) parts.push(step1Data.submitted_client_address2);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const buildClientCityStateZip = () => {
    const city = step1Data?.submitted_client_city || "";
    const state = step1Data?.submitted_client_state || "";
    const zip = step1Data?.submitted_client_zip || "";
    const parts = [city, state].filter(Boolean).join(", ");
    return parts || zip ? `${parts} ${zip}`.trim() : null;
  };

  // Build address for subject
  const buildSubjectAddress = (subject: SubjectData) => {
    const parts = [];
    if (subject.address1) parts.push(subject.address1);
    if (subject.address2) parts.push(subject.address2);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const buildSubjectCityStateZip = (subject: SubjectData) => {
    const city = subject.city || "";
    const state = subject.state || "";
    const zip = subject.zip || "";
    const parts = [city, state].filter(Boolean).join(", ");
    return parts || zip ? `${parts} ${zip}`.trim() : null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <FileCheck className="h-6 w-6" />
          Review Your Request
        </h2>
        <p className="text-muted-foreground mt-1">
          Please review all information before submitting. Click "Edit" on any section to make changes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Column - 70% */}
        <div className="lg:col-span-7 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Request Details
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEditStep(2)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Case Type */}
                {selectedCaseType && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Case Type</p>
                    <p className="mt-1">{selectedCaseType.name}</p>
                  </div>
                )}

                {/* Claim Number */}
                {step2Data?.claim_number && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Claim Number</p>
                    <p className="mt-1 font-mono">{step2Data.claim_number}</p>
                  </div>
                )}

                {/* Budget */}
                {(step2Data?.budget_dollars || step2Data?.budget_hours) && (
                  <>
                    {step2Data.budget_dollars && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Budget (Dollars)
                        </p>
                        <p className="mt-1">${step2Data.budget_dollars.toLocaleString()}</p>
                      </div>
                    )}
                    {step2Data.budget_hours && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Budget (Hours)
                        </p>
                        <p className="mt-1">{step2Data.budget_hours} hours</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Services */}
              {selectedServices && selectedServices.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Requested Services</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedServices.map((service) => (
                      <Badge key={service.id} variant="secondary">
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {step2Data?.notes_instructions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes & Instructions</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{step2Data.notes_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subjects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Subjects ({subjects.length})
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEditStep(4)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-muted-foreground text-sm">No subjects added</p>
              ) : (
                <div className="space-y-4">
                  {subjects.map((subject, index) => (
                    <div key={subject.id}>
                      {index > 0 && <Separator className="mb-4" />}
                      <div className="flex items-start gap-4">
                        {/* Photo or Avatar */}
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {subject.photo_url ? (
                            <img 
                              src={subject.photo_url} 
                              alt={`${subject.first_name} ${subject.last_name}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">
                              {[subject.first_name, subject.middle_name, subject.last_name]
                                .filter(Boolean)
                                .join(" ") || "Unnamed Subject"}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {getSubjectTypeName(subject.subject_type_id)}
                            </Badge>
                            {subject.is_primary && (
                              <Badge variant="default" className="text-xs">Primary</Badge>
                            )}
                          </div>
                          
                          <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                            {subject.alias && <p>Alias: {subject.alias}</p>}
                            {subject.date_of_birth && (
                              <p>DOB: {subject.date_of_birth} {subject.age ? `(Age ${subject.age})` : ""}</p>
                            )}
                            {(subject.address1 || subject.city) && (
                              <p className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {buildSubjectAddress(subject)} {buildSubjectCityStateZip(subject)}
                              </p>
                            )}
                            {subject.cell_phone && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {subject.cell_phone}
                              </p>
                            )}
                            {subject.email && (
                              <p className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {subject.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supporting Files */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Paperclip className="h-5 w-5" />
                Supporting Files ({uploadedFiles.length})
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEditStep(5)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <p className="text-muted-foreground text-sm">No files uploaded</p>
              ) : (
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 30% */}
        <div className="lg:col-span-3">
          <div className="sticky top-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Requested By
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onEditStep(1)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Name */}
                {contactName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact</p>
                    <p className="mt-1 font-medium">{contactName}</p>
                  </div>
                )}

                {/* Company */}
                {step1Data?.submitted_client_name && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company</p>
                    <p className="mt-1">{step1Data.submitted_client_name}</p>
                  </div>
                )}

                {/* Email */}
                {step1Data?.submitted_contact_email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </p>
                    <p className="mt-1 text-sm break-all">{step1Data.submitted_contact_email}</p>
                  </div>
                )}

                {/* Phone */}
                {(step1Data?.submitted_contact_office_phone || step1Data?.submitted_contact_mobile_phone) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone
                    </p>
                    <p className="mt-1 text-sm">
                      {step1Data.submitted_contact_office_phone || step1Data.submitted_contact_mobile_phone}
                    </p>
                  </div>
                )}

                {/* Address */}
                {buildClientAddress() && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Address
                    </p>
                    <p className="mt-1 text-sm">
                      {buildClientAddress()}
                      <br />
                      {buildClientCityStateZip()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <Alert className="bg-muted/50">
        <Shield className="h-4 w-4" />
        <AlertDescription className="text-sm">
          By submitting this request, you confirm that you are authorized to provide this information 
          and that it is accurate to the best of your knowledge. Your submission is encrypted and 
          only accessible by authorized staff.
        </AlertDescription>
      </Alert>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button
          type="button"
          size="lg"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Request
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

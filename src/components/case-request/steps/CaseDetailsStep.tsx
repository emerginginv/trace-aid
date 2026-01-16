import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Step1Data, Step2Data } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible } from "@/types/case-request-form-config";
import { useCaseServicesForPublicForm, useCaseTypesForPublicForm } from "@/hooks/queries/useCaseRequestFormBySlug";
import { Loader2, ArrowLeft, Building2, User } from "lucide-react";

interface CaseDetailsStepProps {
  fieldConfig: CaseRequestFormConfig;
  organizationId: string;
  step1Data: Step1Data;
  initialData: Step2Data;
  onSubmit: (data: Step2Data) => void;
  onBack: () => void;
}

export function CaseDetailsStep({
  fieldConfig,
  organizationId,
  step1Data,
  initialData,
  onSubmit,
  onBack,
}: CaseDetailsStepProps) {
  const { data: caseTypes } = useCaseTypesForPublicForm(organizationId);
  
  const selectedCaseType = caseTypes?.find(ct => ct.id === step1Data.case_type_id);
  
  const { data: caseServices, isLoading: loadingServices } = useCaseServicesForPublicForm(
    organizationId,
    selectedCaseType?.allowed_service_ids
  );

  const schema = z.object({
    case_services: z.array(z.string()),
    claim_number: z.string(),
    budget_dollars: z.number().nullable(),
    budget_hours: z.number().nullable(),
    notes_instructions: z.string(),
    custom_fields: z.record(z.any()),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<Step2Data>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  });

  const selectedServices = watch("case_services");

  const toggleService = (serviceId: string) => {
    const current = selectedServices || [];
    if (current.includes(serviceId)) {
      setValue("case_services", current.filter(id => id !== serviceId));
    } else {
      setValue("case_services", [...current, serviceId]);
    }
  };

  const contactName = [
    step1Data.submitted_contact_first_name,
    step1Data.submitted_contact_middle_name,
    step1Data.submitted_contact_last_name,
  ].filter(Boolean).join(' ');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Info */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Client:</span>
              <span className="font-medium">{step1Data.submitted_client_name || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Contact:</span>
              <span className="font-medium">{contactName || 'Not specified'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Type Display */}
      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Case Type</Label>
            <div className="p-3 bg-muted rounded-md">
              <span className="font-medium">{selectedCaseType?.name || 'Not selected'}</span>
              {selectedCaseType?.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedCaseType.description}</p>
              )}
            </div>
          </div>

          {/* Case Services */}
          {isFieldVisible(fieldConfig, 'caseDetails', 'caseServices') && caseServices && caseServices.length > 0 && (
            <div className="space-y-2">
              <Label>Case Services</Label>
              {loadingServices ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading services...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {caseServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={selectedServices?.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <label
                        htmlFor={`service-${service.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {service.name}
                        {service.code && (
                          <span className="text-muted-foreground ml-1">({service.code})</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Claim Number */}
          {isFieldVisible(fieldConfig, 'caseDetails', 'claimNumber') && (
            <div className="space-y-2">
              <Label htmlFor="claim_number">Claim Number</Label>
              <Input
                id="claim_number"
                {...register("claim_number")}
                placeholder="Enter claim or reference number"
              />
            </div>
          )}

          {/* Budget */}
          {(isFieldVisible(fieldConfig, 'caseDetails', 'budgetDollars') || 
            isFieldVisible(fieldConfig, 'caseDetails', 'budgetHours')) && (
            <div className="space-y-2">
              <Label>Budget</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isFieldVisible(fieldConfig, 'caseDetails', 'budgetDollars') && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="pl-7"
                      {...register("budget_dollars", { valueAsNumber: true })}
                    />
                  </div>
                )}
                {isFieldVisible(fieldConfig, 'caseDetails', 'budgetHours') && (
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      className="pr-12"
                      {...register("budget_hours", { valueAsNumber: true })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">Hrs.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes & Instructions */}
          {isFieldVisible(fieldConfig, 'caseDetails', 'notesInstructions') && (
            <div className="space-y-2">
              <Label htmlFor="notes_instructions">Notes & Instructions</Label>
              <Textarea
                id="notes_instructions"
                {...register("notes_instructions")}
                placeholder="Enter any special instructions or notes for this case..."
                rows={5}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save & Continue"
          )}
        </Button>
      </div>
    </form>
  );
}

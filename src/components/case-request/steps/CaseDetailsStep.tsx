import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Step1Data, Step2Data } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible, isFieldRequired } from "@/types/case-request-form-config";
import { useCaseServicesForPublicForm, useCaseTypesForPublicForm } from "@/hooks/queries/useCaseRequestFormBySlug";
import { useCaseTypeConfig } from "@/hooks/useCaseTypeConfig";
import { Loader2, ArrowLeft, Building2, User } from "lucide-react";
import { HelpTooltip } from "@/components/ui/tooltip";

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
  
  // Use case type config for budget and reference field settings
  const { config: caseTypeConfig, isLoading: loadingConfig } = useCaseTypeConfig(step1Data.case_type_id);
  
  const { data: caseServices, isLoading: loadingServices } = useCaseServicesForPublicForm(
    organizationId,
    selectedCaseType?.allowed_service_ids
  );

  // Build schema dynamically based on case type config
  const schema = useMemo(() => {
    const budgetDollarsRequired = caseTypeConfig?.budgetRequired && caseTypeConfig?.showBudgetDollars;
    const budgetHoursRequired = caseTypeConfig?.budgetRequired && caseTypeConfig?.showBudgetHours;
    const claimNumberRequired = isFieldRequired(fieldConfig, 'caseDetails', 'claimNumber');

    return z.object({
      case_services: z.array(z.string()),
      claim_number: claimNumberRequired 
        ? z.string().min(1, "Claim number is required")
        : z.string(),
      budget_dollars: budgetDollarsRequired
        ? z.number({ required_error: "Budget amount is required" }).positive("Budget must be greater than 0")
        : z.number().nullable(),
      budget_hours: budgetHoursRequired
        ? z.number({ required_error: "Budget hours is required" }).positive("Hours must be greater than 0")
        : z.number().nullable(),
      notes_instructions: z.string(),
      custom_fields: z.record(z.any()),
    });
  }, [caseTypeConfig, fieldConfig]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Step2Data>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  });

  const selectedServices = watch("case_services");
  const customFields = watch("custom_fields") || {};

  const toggleService = (serviceId: string) => {
    const current = selectedServices || [];
    if (current.includes(serviceId)) {
      setValue("case_services", current.filter(id => id !== serviceId));
    } else {
      setValue("case_services", [...current, serviceId]);
    }
  };

  const updateCustomField = (key: string, value: any) => {
    setValue("custom_fields", { ...customFields, [key]: value });
  };

  const contactName = [
    step1Data.submitted_contact_first_name,
    step1Data.submitted_contact_middle_name,
    step1Data.submitted_contact_last_name,
  ].filter(Boolean).join(' ');

  // Determine budget visibility from case type config
  const showBudgetDollars = caseTypeConfig?.showBudgetDollars ?? isFieldVisible(fieldConfig, 'caseDetails', 'budgetDollars');
  const showBudgetHours = caseTypeConfig?.showBudgetHours ?? isFieldVisible(fieldConfig, 'caseDetails', 'budgetHours');
  const budgetRequired = caseTypeConfig?.budgetRequired ?? false;
  const budgetDisabled = caseTypeConfig?.budgetDisabled ?? false;

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
          <CardDescription>
            Provide the specific details for your case request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              <div className="flex items-center gap-2">
                <Label>Case Services</Label>
                <HelpTooltip content="Select the specific services you need performed" />
              </div>
              <p className="text-xs text-muted-foreground">
                Select all services that apply. Staff may adjust based on case requirements.
              </p>
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
                      className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 transition-colors"
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

          {/* Claim Number / Reference */}
          {isFieldVisible(fieldConfig, 'caseDetails', 'claimNumber') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="claim_number">
                  Claim Number
                  {isFieldRequired(fieldConfig, 'caseDetails', 'claimNumber') && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                <HelpTooltip content="Your internal tracking identifier" />
              </div>
              <Input
                id="claim_number"
                {...register("claim_number")}
                placeholder="Enter claim or reference number"
                className={errors.claim_number ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Enter the claim number exactly as it appears on your documents. This links the case to your records.
              </p>
              {errors.claim_number && (
                <p className="text-sm text-destructive">{errors.claim_number.message}</p>
              )}
            </div>
          )}

          {/* Dynamic Reference Fields from Case Type */}
          {caseTypeConfig?.referenceLabel1 && (
            <div className="space-y-2">
              <Label htmlFor="reference1">{caseTypeConfig.referenceLabel1}</Label>
              <Input
                id="reference1"
                value={customFields.reference1 || ''}
                onChange={(e) => updateCustomField('reference1', e.target.value)}
                placeholder={`Enter ${caseTypeConfig.referenceLabel1}`}
              />
            </div>
          )}

          {caseTypeConfig?.referenceLabel2 && (
            <div className="space-y-2">
              <Label htmlFor="reference2">{caseTypeConfig.referenceLabel2}</Label>
              <Input
                id="reference2"
                value={customFields.reference2 || ''}
                onChange={(e) => updateCustomField('reference2', e.target.value)}
                placeholder={`Enter ${caseTypeConfig.referenceLabel2}`}
              />
            </div>
          )}

          {caseTypeConfig?.referenceLabel3 && (
            <div className="space-y-2">
              <Label htmlFor="reference3">{caseTypeConfig.referenceLabel3}</Label>
              <Input
                id="reference3"
                value={customFields.reference3 || ''}
                onChange={(e) => updateCustomField('reference3', e.target.value)}
                placeholder={`Enter ${caseTypeConfig.referenceLabel3}`}
              />
            </div>
          )}

          {/* Budget - based on case type configuration */}
          {!budgetDisabled && (showBudgetDollars || showBudgetHours) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>
                  Budget
                  {budgetRequired && <span className="text-destructive"> *</span>}
                </Label>
                <HelpTooltip content="Maximum authorized spend and/or hours for this case" />
              </div>
              <p className="text-xs text-muted-foreground">
                Staff will notify you before exceeding these limits.
              </p>
              <div className="flex items-center gap-4">
                {showBudgetDollars && (
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className={`pl-7 ${errors.budget_dollars ? "border-destructive" : ""}`}
                        {...register("budget_dollars", { valueAsNumber: true })}
                      />
                    </div>
                    {errors.budget_dollars && (
                      <p className="text-sm text-destructive mt-1">{errors.budget_dollars.message}</p>
                    )}
                  </div>
                )}
                {showBudgetDollars && showBudgetHours && (
                  <span className="text-muted-foreground font-medium">/</span>
                )}
                {showBudgetHours && (
                  <div className="flex-1">
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0"
                        className={`pr-12 ${errors.budget_hours ? "border-destructive" : ""}`}
                        {...register("budget_hours", { valueAsNumber: true })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">Hrs.</span>
                    </div>
                    {errors.budget_hours && (
                      <p className="text-sm text-destructive mt-1">{errors.budget_hours.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes & Instructions */}
          {isFieldVisible(fieldConfig, 'caseDetails', 'notesInstructions') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="notes_instructions">Notes & Instructions</Label>
                <HelpTooltip content="Special requirements or context for investigators" />
              </div>
              <Textarea
                id="notes_instructions"
                {...register("notes_instructions")}
                placeholder="Enter any special instructions or notes for this case..."
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Include any timeline requirements or background context that will help staff work your case effectively.
              </p>
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
        <Button type="submit" size="lg" disabled={isSubmitting || loadingConfig}>
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

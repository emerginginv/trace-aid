import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { US_STATES } from "@/components/case-detail/subjects/types";
import { Step1Data } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible, isFieldRequired, getFieldLabel } from "@/types/case-request-form-config";
import { useCaseTypesForPublicForm } from "@/hooks/queries/useCaseRequestFormBySlug";
import { Loader2 } from "lucide-react";
import { PhoneInput } from "../PhoneInput";
import { useMemo } from "react";
import { HelpTooltip } from "@/components/ui/tooltip";

const COUNTRIES = [
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Australia", label: "Australia" },
  { value: "Mexico", label: "Mexico" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Spain", label: "Spain" },
  { value: "Italy", label: "Italy" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Brazil", label: "Brazil" },
  { value: "Japan", label: "Japan" },
  { value: "India", label: "India" },
  { value: "China", label: "China" },
  { value: "Other", label: "Other" },
];

const MOBILE_CARRIERS = [
  { value: "AT&T", label: "AT&T" },
  { value: "Verizon", label: "Verizon" },
  { value: "T-Mobile", label: "T-Mobile" },
  { value: "Sprint", label: "Sprint" },
  { value: "US Cellular", label: "US Cellular" },
  { value: "Cricket", label: "Cricket" },
  { value: "Metro PCS", label: "Metro PCS" },
  { value: "Boost Mobile", label: "Boost Mobile" },
  { value: "Other", label: "Other" },
];

interface ClientInformationStepProps {
  fieldConfig: CaseRequestFormConfig;
  organizationId: string;
  initialData: Step1Data;
  onSubmit: (data: Step1Data) => void;
}

export function ClientInformationStep({
  fieldConfig,
  organizationId,
  initialData,
  onSubmit,
}: ClientInformationStepProps) {
  const { data: caseTypes, isLoading: loadingCaseTypes } = useCaseTypesForPublicForm(organizationId);

  // Build schema dynamically based on field config
  const schema = useMemo(() => {
    const contactNameRequired = isFieldRequired(fieldConfig, 'contactInformation', 'contactName');
    
    return z.object({
      case_type_id: z.string().min(1, "Please select a case type"),
      submitted_client_name: isFieldRequired(fieldConfig, 'clientInformation', 'companyName')
        ? z.string().min(1, "Company name is required")
        : z.string(),
      submitted_client_country: z.string(),
      submitted_client_address1: z.string(),
      submitted_client_address2: z.string(),
      submitted_client_address3: z.string(),
      submitted_client_city: z.string(),
      submitted_client_state: z.string(),
      submitted_client_zip: z.string(),
      submitted_contact_first_name: contactNameRequired
        ? z.string().min(1, "First name is required")
        : z.string(),
      submitted_contact_middle_name: z.string(),
      submitted_contact_last_name: contactNameRequired
        ? z.string().min(1, "Last name is required")
        : z.string(),
      submitted_contact_email: isFieldRequired(fieldConfig, 'contactInformation', 'email')
        ? z.string().email("Valid email is required")
        : z.string().email().or(z.literal('')),
      submitted_contact_office_phone: z.string(),
      submitted_contact_mobile_phone: z.string(),
      submitted_contact_mobile_carrier: z.string(),
      submitted_contact_home_phone: z.string(),
    });
  }, [fieldConfig]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Step1Data>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  });

  const selectedCountry = watch("submitted_client_country");
  const contactNameRequired = isFieldRequired(fieldConfig, 'contactInformation', 'contactName');

  const showClientInfo = isFieldVisible(fieldConfig, 'clientInformation', 'companyName') ||
    isFieldVisible(fieldConfig, 'clientInformation', 'country') ||
    isFieldVisible(fieldConfig, 'clientInformation', 'address');

  const showContactInfo = isFieldVisible(fieldConfig, 'contactInformation', 'contactName') ||
    isFieldVisible(fieldConfig, 'contactInformation', 'email') ||
    isFieldVisible(fieldConfig, 'contactInformation', 'officePhone') ||
    isFieldVisible(fieldConfig, 'contactInformation', 'mobilePhone') ||
    isFieldVisible(fieldConfig, 'contactInformation', 'homePhone');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Case Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>What type of case are you requesting?</CardTitle>
          <CardDescription>
            Select the category that best describes your investigation need.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCaseTypes ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading case types...
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="case_type_id">
                  Case Type <span className="text-destructive">*</span>
                </Label>
                <HelpTooltip content="Determines the workflow and available services for your request" />
              </div>
              <Select
                value={watch("case_type_id")}
                onValueChange={(value) => setValue("case_type_id", value)}
              >
                <SelectTrigger className={errors.case_type_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a case type" />
                </SelectTrigger>
                <SelectContent>
                  {caseTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This cannot be changed after submission.
              </p>
              {errors.case_type_id && (
                <p className="text-sm text-destructive">{errors.case_type_id.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Information */}
      {showClientInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Enter your company information:</CardTitle>
            <CardDescription>
              This information identifies your organization for case correspondence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFieldVisible(fieldConfig, 'clientInformation', 'companyName') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="submitted_client_name">
                    {getFieldLabel(fieldConfig, 'clientInformation', 'companyName')}
                    {isFieldRequired(fieldConfig, 'clientInformation', 'companyName') && (
                      <span className="text-destructive"> *</span>
                    )}
                  </Label>
                  <HelpTooltip content="The organization submitting this request" />
                </div>
                <Input
                  id="submitted_client_name"
                  {...register("submitted_client_name")}
                  className={errors.submitted_client_name ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your company's legal name as it should appear on case documentation.
                </p>
                {errors.submitted_client_name && (
                  <p className="text-sm text-destructive">{errors.submitted_client_name.message}</p>
                )}
              </div>
            )}

            {isFieldVisible(fieldConfig, 'clientInformation', 'country') && (
              <div className="space-y-2">
                <Label htmlFor="submitted_client_country">Country</Label>
                <Select
                  value={selectedCountry}
                  onValueChange={(value) => setValue("submitted_client_country", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isFieldVisible(fieldConfig, 'clientInformation', 'address') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="submitted_client_address1">Address 1</Label>
                  <Input id="submitted_client_address1" {...register("submitted_client_address1")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitted_client_address2">Address 2</Label>
                  <Input id="submitted_client_address2" {...register("submitted_client_address2")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitted_client_address3">Address 3</Label>
                  <Input id="submitted_client_address3" {...register("submitted_client_address3")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="submitted_client_city">City</Label>
                    <Input id="submitted_client_city" {...register("submitted_client_city")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submitted_client_state">State/Province</Label>
                    {selectedCountry === "United States" ? (
                      <Select
                        value={watch("submitted_client_state")}
                        onValueChange={(value) => setValue("submitted_client_state", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input id="submitted_client_state" {...register("submitted_client_state")} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submitted_client_zip">Zip/Postal Code</Label>
                    <Input id="submitted_client_zip" {...register("submitted_client_zip")} />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      {showContactInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Enter your contact information:</CardTitle>
            <CardDescription>
              We'll use this information to send you updates about your case request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFieldVisible(fieldConfig, 'contactInformation', 'contactName') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="submitted_contact_first_name">
                      First Name
                      {contactNameRequired && <span className="text-destructive"> *</span>}
                    </Label>
                    <Input 
                      id="submitted_contact_first_name" 
                      {...register("submitted_contact_first_name")} 
                      className={errors.submitted_contact_first_name ? "border-destructive" : ""}
                    />
                    {errors.submitted_contact_first_name && (
                      <p className="text-sm text-destructive">{errors.submitted_contact_first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submitted_contact_middle_name">Middle Name</Label>
                    <Input id="submitted_contact_middle_name" {...register("submitted_contact_middle_name")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submitted_contact_last_name">
                      Last Name
                      {contactNameRequired && <span className="text-destructive"> *</span>}
                    </Label>
                    <Input 
                      id="submitted_contact_last_name" 
                      {...register("submitted_contact_last_name")} 
                      className={errors.submitted_contact_last_name ? "border-destructive" : ""}
                    />
                    {errors.submitted_contact_last_name && (
                      <p className="text-sm text-destructive">{errors.submitted_contact_last_name.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {isFieldVisible(fieldConfig, 'contactInformation', 'email') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="submitted_contact_email">
                    Email
                    {isFieldRequired(fieldConfig, 'contactInformation', 'email') && (
                      <span className="text-destructive"> *</span>
                    )}
                  </Label>
                  <HelpTooltip content="Used for confirmation and case updates" />
                </div>
                <Input
                  id="submitted_contact_email"
                  type="email"
                  {...register("submitted_contact_email")}
                  className={errors.submitted_contact_email ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email where you want to receive status notifications.
                </p>
                {errors.submitted_contact_email && (
                  <p className="text-sm text-destructive">{errors.submitted_contact_email.message}</p>
                )}
              </div>
            )}

            {isFieldVisible(fieldConfig, 'contactInformation', 'officePhone') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="submitted_contact_office_phone">Office Phone</Label>
                  <HelpTooltip content="Primary business contact number" />
                </div>
                <Controller
                  name="submitted_contact_office_phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      id="submitted_contact_office_phone"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
            )}

            {isFieldVisible(fieldConfig, 'contactInformation', 'mobilePhone') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="submitted_contact_mobile_phone">Mobile Phone</Label>
                    <HelpTooltip content="For time-sensitive communications" />
                  </div>
                  <Controller
                    name="submitted_contact_mobile_phone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        id="submitted_contact_mobile_phone"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="submitted_contact_mobile_carrier">Mobile Carrier</Label>
                    <HelpTooltip content="Helps with text message delivery" />
                  </div>
                  <Select
                    value={watch("submitted_contact_mobile_carrier")}
                    onValueChange={(value) => setValue("submitted_contact_mobile_carrier", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOBILE_CARRIERS.map((carrier) => (
                        <SelectItem key={carrier.value} value={carrier.value}>
                          {carrier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {isFieldVisible(fieldConfig, 'contactInformation', 'homePhone') && (
              <div className="space-y-2">
                <Label htmlFor="submitted_contact_home_phone">Home Phone</Label>
                <Controller
                  name="submitted_contact_home_phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      id="submitted_contact_home_phone"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-end">
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

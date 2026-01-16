import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { WizardNavigation } from "../WizardNavigation";
import { CaseFormData } from "../hooks/useCaseWizard";
import { useCaseTypesQuery } from "@/hooks/queries/useCaseTypesQuery";
import { User } from "lucide-react";

const formSchema = z.object({
  case_type_id: z.string().min(1, "Case type is required"),
  reference_number: z.string().max(100).optional().nullable(),
  reference_number_2: z.string().max(100).optional().nullable(),
  reference_number_3: z.string().max(100).optional().nullable(),
  subject_name: z.string().min(1, "Primary subject name is required"),
  subject_role: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Step1Props {
  organizationId: string;
  onComplete: (caseId: string, caseNumber: string, caseData: CaseFormData) => void;
  existingData?: CaseFormData | null;
}

export function Step1NewCase({ organizationId, onComplete, existingData }: Step1Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [generatedCaseNumber, setGeneratedCaseNumber] = useState<string>("");
  const [seriesNumber, setSeriesNumber] = useState<number | null>(null);
  const [seriesInstance, setSeriesInstance] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch case types from database
  const { data: caseTypes = [], isLoading: caseTypesLoading } = useCaseTypesQuery({ 
    activeOnly: true, 
    enabled: !!organizationId 
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      case_type_id: existingData?.case_type_id || "",
      reference_number: existingData?.reference_number || "",
      reference_number_2: existingData?.reference_number_2 || "",
      reference_number_3: existingData?.reference_number_3 || "",
      subject_name: "",
      subject_role: "subject",
    },
  });

  const selectedCaseTypeId = form.watch("case_type_id");
  
  // Get selected case type details for dynamic reference labels
  const selectedCaseType = useMemo(() => {
    return caseTypes.find(ct => ct.id === selectedCaseTypeId);
  }, [caseTypes, selectedCaseTypeId]);

  useEffect(() => {
    fetchInitialData();
  }, [organizationId]);

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Generate case number
      await generateCaseNumber();
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const generateCaseNumber = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session available");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-case-number`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            organization_id: organizationId,
          }),
        }
      );

      if (!response.ok) {
        console.warn("Edge function failed, using fallback method");
        await generateCaseNumberFallback();
        return;
      }

      const result = await response.json();
      setGeneratedCaseNumber(result.case_number);
      setSeriesNumber(result.series_number);
      setSeriesInstance(result.series_instance);
    } catch (error) {
      console.error("Error generating case number:", error);
      await generateCaseNumberFallback();
    }
  };

  const generateCaseNumberFallback = async () => {
    try {
      const { data: existingCases } = await supabase
        .from("cases")
        .select("case_number, instance_number")
        .eq("organization_id", organizationId);

      let nextNumber = 1;
      if (existingCases && existingCases.length > 0) {
        const numbers = existingCases
          .filter(c => c.instance_number === 1)
          .map(c => {
            const match = c.case_number.match(/CASE-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(n => n > 0);

        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1;
        }
      }

      const caseNumber = `CASE-${String(nextNumber).padStart(5, "0")}`;
      setGeneratedCaseNumber(caseNumber);
    } catch (error) {
      console.error("Error in fallback case number generation:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!currentUserId || !generatedCaseNumber) {
      toast.error("Unable to create case. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare case data
      const caseData: any = {
        title: data.subject_name, // Set title from primary subject name
        case_number: generatedCaseNumber,
        status: "Draft",
        case_type_id: data.case_type_id,
        user_id: currentUserId,
        organization_id: organizationId,
        instance_number: 1,
        is_draft: true,
        draft_created_by: currentUserId,
        reference_number: data.reference_number || null,
        reference_number_2: data.reference_number_2 || null,
        reference_number_3: data.reference_number_3 || null,
        series_number: seriesNumber || undefined,
        series_instance: seriesInstance || 1,
      };

      const { data: newCase, error: caseError } = await supabase
        .from("cases")
        .insert(caseData)
        .select()
        .single();

      if (caseError) throw caseError;

      // Create primary subject
      const { error: subjectError } = await supabase
        .from("case_subjects")
        .insert({
          case_id: newCase.id,
          organization_id: organizationId,
          user_id: currentUserId,
          subject_type: "person",
          name: data.subject_name,
          display_name: data.subject_name,
          role: data.subject_role || "subject",
          is_primary: true,
          status: "active",
        });

      if (subjectError) {
        console.error("Error creating primary subject:", subjectError);
        // Don't fail the whole operation, the case was created
        toast.warning("Case created but there was an issue with the primary subject");
      }

      // Prepare form data for wizard state
      const formData: CaseFormData = {
        case_type_id: data.case_type_id,
        title: data.subject_name,
        case_number: generatedCaseNumber,
        reference_number: data.reference_number || null,
        reference_number_2: data.reference_number_2 || null,
        reference_number_3: data.reference_number_3 || null,
        // These will be set in later steps
        account_id: "",
        contact_id: "",
        status: "Draft",
        description: "",
        due_date: null,
        case_manager_id: null,
        case_manager_2_id: null,
        investigator_ids: [],
      };

      toast.success("Draft case created");
      onComplete(newCase.id, generatedCaseNumber, formData);
    } catch (error) {
      console.error("Error creating draft case:", error);
      toast.error("Failed to create draft case");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Case Information</h3>
        <p className="text-sm text-muted-foreground">
          Select the case type and enter the primary subject. A draft will be created when you continue.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 1. Case Type (FIRST - Required) */}
          <FormField
            control={form.control}
            name="case_type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Case Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={caseTypesLoading ? "Loading..." : "Select case type"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {caseTypes.map(caseType => (
                      <SelectItem key={caseType.id} value={caseType.id}>
                        {caseType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the type of investigation or case
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 2. Reference Numbers (Conditional - shown after Case Type selected) */}
          {selectedCaseType && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
              <h4 className="text-sm font-medium text-muted-foreground">Reference Numbers</h4>
              
              {selectedCaseType.reference_label_1 && (
                <FormField
                  control={form.control}
                  name="reference_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedCaseType.reference_label_1}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={`Enter ${selectedCaseType.reference_label_1.toLowerCase()}`} 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedCaseType.reference_label_2 && (
                <FormField
                  control={form.control}
                  name="reference_number_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedCaseType.reference_label_2}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={`Enter ${selectedCaseType.reference_label_2.toLowerCase()}`} 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedCaseType.reference_label_3 && (
                <FormField
                  control={form.control}
                  name="reference_number_3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedCaseType.reference_label_3}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={`Enter ${selectedCaseType.reference_label_3.toLowerCase()}`} 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!selectedCaseType.reference_label_1 && !selectedCaseType.reference_label_2 && !selectedCaseType.reference_label_3 && (
                <p className="text-sm text-muted-foreground italic">
                  No reference fields configured for this case type
                </p>
              )}
            </div>
          )}

          {/* 3. Primary Subject (Required) */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h4 className="font-medium">Primary Subject *</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              The case name will be set to this person's name.
            </p>
            
            <FormField
              control={form.control}
              name="subject_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., John Doe" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "subject"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="subject">Subject</SelectItem>
                      <SelectItem value="claimant">Claimant</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                      <SelectItem value="complainant">Complainant</SelectItem>
                      <SelectItem value="respondent">Respondent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 4. Case Number (Auto-generated, shown last) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Case Number</label>
            <Input
              value={generatedCaseNumber || "Generating..."}
              disabled
              className="bg-muted font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated. Cannot be changed.
            </p>
          </div>

          <WizardNavigation
            currentStep={1}
            onBack={() => {}}
            onContinue={form.handleSubmit(onSubmit)}
            canContinue={form.formState.isValid && !!generatedCaseNumber}
            isSubmitting={isSubmitting}
            continueLabel="Create Draft & Continue"
          />
        </form>
      </Form>
    </div>
  );
}

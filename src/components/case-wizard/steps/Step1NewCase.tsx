import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { WizardNavigation } from "../WizardNavigation";
import { CaseFormData } from "../hooks/useCaseWizard";
import { useCaseTypesQuery } from "@/hooks/queries/useCaseTypesQuery";
import { useAccountsQuery } from "@/hooks/queries/useAccountsQuery";
import { useContactsQuery } from "@/hooks/queries/useContactsQuery";
import { usePermissions } from "@/hooks/usePermissions";
import { Calendar, Info, Building2, Plus, X } from "lucide-react";
import { addDays, format } from "date-fns";
import { logCaseTypeAudit } from "@/lib/caseTypeAuditLogger";
import { cn } from "@/lib/utils";
import { ClientAccountCard } from "@/components/case-detail/ClientAccountCard";
import { AccountForm } from "@/components/AccountForm";

const formSchema = z.object({
  case_type_id: z.string().min(1, "Case type is required"),
  account_id: z.string().optional().nullable(),
  contact_id: z.string().optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
  reference_number_2: z.string().max(100).optional().nullable(),
  reference_number_3: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  due_date: z.date().optional().nullable(),
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
  const [editingAccount, setEditingAccount] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  // Permission check for creating accounts
  const { hasPermission } = usePermissions();
  const canCreateAccount = hasPermission('add_accounts');

  // Fetch case types from database
  const { data: caseTypes = [], isLoading: caseTypesLoading } = useCaseTypesQuery({ 
    activeOnly: true, 
    enabled: !!organizationId 
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      case_type_id: existingData?.case_type_id || "",
      account_id: existingData?.account_id || "",
      contact_id: existingData?.contact_id || "",
      reference_number: existingData?.reference_number || "",
      reference_number_2: existingData?.reference_number_2 || "",
      reference_number_3: existingData?.reference_number_3 || "",
      description: existingData?.description || "",
      due_date: existingData?.due_date || null,
    },
  });

  const selectedCaseTypeId = form.watch("case_type_id");
  const selectedAccountId = form.watch("account_id");

  // Fetch accounts for Client dropdown
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsQuery({
    enabled: !!organizationId
  });

  // Fetch contacts filtered by selected account
  const { data: contacts = [], isLoading: contactsLoading } = useContactsQuery({
    accountId: selectedAccountId || undefined,
    enabled: !!organizationId
  });
  
  // Get selected case type details for dynamic reference labels and due date
  const selectedCaseType = useMemo(() => {
    return caseTypes.find(ct => ct.id === selectedCaseTypeId);
  }, [caseTypes, selectedCaseTypeId]);

  // Get the selected account object for card display
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find(acc => acc.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Handlers for account selection
  const handleAccountChange = (accountId: string) => {
    form.setValue("account_id", accountId === "none" ? "" : accountId);
    form.setValue("contact_id", ""); // Clear contact when account changes
    setEditingAccount(false);
  };

  const handleRemoveAccount = () => {
    form.setValue("account_id", "");
    form.setValue("contact_id", "");
  };

  const handleAccountCreated = (newAccountId?: string) => {
    setShowCreateAccount(false);
    if (newAccountId) {
      form.setValue("account_id", newAccountId);
      setEditingAccount(false);
    }
  };

  // Calculate due date when case type changes (auto-populate, but user can override)
  useEffect(() => {
    if (selectedCaseType?.default_due_days && selectedCaseType.default_due_days > 0) {
      const dueDate = addDays(new Date(), selectedCaseType.default_due_days);
      // Only set if user hasn't manually set a due date
      const currentDueDate = form.getValues("due_date");
      if (!currentDueDate) {
        form.setValue("due_date", dueDate);
      }
    }
  }, [selectedCaseType, form]);

  // Clear contact selection when account changes
  useEffect(() => {
    const currentContact = form.getValues("contact_id");
    
    // If account changed and there was a contact selected, validate it still belongs
    if (currentContact && selectedAccountId) {
      const contactBelongsToAccount = contacts.some(
        c => c.id === currentContact && c.account_id === selectedAccountId
      );
      if (!contactBelongsToAccount && contacts.length > 0) {
        form.setValue("contact_id", "");
      }
    } else if (!selectedAccountId && currentContact) {
      // If account was cleared, clear contact too
      form.setValue("contact_id", "");
    }
  }, [selectedAccountId, contacts, form]);

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
      // Use the due date from form (user may have overridden it)
      const dueDateValue = data.due_date 
        ? data.due_date.toISOString().split('T')[0] 
        : null;

      // Prepare case data - title will be NULL until primary subject is set in Step 3
      const caseData: any = {
        title: null, // Will be set via trigger when primary subject is added in Step 3
        case_number: generatedCaseNumber,
        status: "Draft",
        case_type_id: data.case_type_id,
        account_id: data.account_id || null,
        contact_id: data.contact_id || null,
        user_id: currentUserId,
        organization_id: organizationId,
        instance_number: 1,
        is_draft: true,
        draft_created_by: currentUserId,
        description: data.description || null,
        reference_number: data.reference_number || null,
        reference_number_2: data.reference_number_2 || null,
        reference_number_3: data.reference_number_3 || null,
        series_number: seriesNumber || undefined,
        series_instance: seriesInstance || 1,
        due_date: dueDateValue,
        // Store applied budget strategy from case type at creation time
        applied_budget_strategy: selectedCaseType?.budget_strategy || 'both',
        // Enable the trigger to sync title from primary subject
        use_primary_subject_as_title: true,
        // active_service_ids will be synced by trigger when service instances are created
        active_service_ids: [],
      };

      const { data: newCase, error: caseError } = await supabase
        .from("cases")
        .insert(caseData)
        .select()
        .single();

      if (caseError) throw caseError;

      // DO NOT create primary subject here - it will be created in Step 3 (Subjects)

      // Log audit event for Case Type assignment
      await logCaseTypeAudit({
        action: 'case_type_assigned',
        organizationId: organizationId,
        metadata: {
          caseId: newCase.id,
          caseNumber: generatedCaseNumber,
          newCaseTypeId: data.case_type_id,
          newCaseTypeName: selectedCaseType?.name || null,
          newBudgetStrategy: selectedCaseType?.budget_strategy || 'both',
          severity: 'LOW',
        },
      });

      // Prepare form data for wizard state
      const formData: CaseFormData = {
        case_type_id: data.case_type_id,
        title: null, // Title will be set in Step 3
        case_number: generatedCaseNumber,
        description: data.description || "",
        reference_number: data.reference_number || null,
        reference_number_2: data.reference_number_2 || null,
        reference_number_3: data.reference_number_3 || null,
        account_id: data.account_id || "",
        contact_id: data.contact_id || "",
        status: "Draft",
        due_date: data.due_date || null,
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

  const dueDateValue = form.watch("due_date");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Case Information</h3>
        <p className="text-sm text-muted-foreground">
          Select the case type and enter basic case details. A draft will be created when you continue.
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

          {/* 3. Case Number (Auto-generated) */}
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

          {/* 4. Client Information (Optional) */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Client Account
            </h4>
            
            {/* Account Selection/Display */}
            <div>
              {editingAccount ? (
                // Selection Mode
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select 
                      value={selectedAccountId || "none"}
                      onValueChange={handleAccountChange}
                      disabled={accountsLoading}
                    >
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue placeholder={accountsLoading ? "Loading..." : "Select account..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      type="button"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setEditingAccount(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Create New Account Button (if permitted) */}
                  {canCreateAccount && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => setShowCreateAccount(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Account
                    </Button>
                  )}
                </div>
              ) : selectedAccount ? (
                // Display Mode - Show Card
                <ClientAccountCard
                  account={{
                    id: selectedAccount.id,
                    name: selectedAccount.name,
                    phone: selectedAccount.phone,
                    email: selectedAccount.email,
                  }}
                  onChangeClick={() => setEditingAccount(true)}
                  onRemove={handleRemoveAccount}
                  canEdit={true}
                />
              ) : (
                // Empty State
                <Button 
                  variant="outline" 
                  size="sm"
                  type="button"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setEditingAccount(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              )}
            </div>

            {/* Primary Contact - Only show if account is selected */}
            {selectedAccount && (
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={contactsLoading ? "Loading..." : "Select contact (optional)"} 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {contacts.map(contact => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optional. Select the primary contact from this account.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Account Creation Dialog */}
          <AccountForm
            open={showCreateAccount}
            onOpenChange={setShowCreateAccount}
            onSuccess={handleAccountCreated}
            organizationId={organizationId}
            navigateAfterCreate={false}
          />

          {/* 5. Description (Optional) */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter a brief description of the case..."
                    className="min-h-[100px] resize-y"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Optional. Provide context or notes about this case.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 6. Due Date (Auto-calculated from Case Type, but editable) */}
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <Calendar className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {selectedCaseType?.default_due_days && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span>
                      Auto-calculated from Case Type default: {selectedCaseType.default_due_days} days
                    </span>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <WizardNavigation
            currentStep={1}
            onBack={() => {}}
            onContinue={form.handleSubmit(onSubmit)}
            isSubmitting={isSubmitting}
            canContinue={!!generatedCaseNumber}
          />
        </form>
      </Form>
    </div>
  );
}
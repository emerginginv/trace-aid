import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WizardNavigation } from "../WizardNavigation";
import { CaseFormData } from "../hooks/useCaseWizard";

const formSchema = z.object({
  account_id: z.string().min(1, "Client is required"),
  contact_id: z.string().min(1, "Primary contact is required"),
  status: z.string().min(1, "Case type is required"),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  due_date: z.date().optional(),
  assign_myself_as: z.enum(["none", "case_manager", "investigator"]).default("none"),
  reference_number: z.string().max(100).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface Account {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  account_id: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface Step1Props {
  organizationId: string;
  onComplete: (caseId: string, caseNumber: string, caseData: CaseFormData) => void;
  existingData?: CaseFormData | null;
}

export function Step1NewCase({ organizationId, onComplete, existingData }: Step1Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<Array<{ id: string; value: string }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [generatedCaseNumber, setGeneratedCaseNumber] = useState<string>("");
  const [seriesNumber, setSeriesNumber] = useState<number | null>(null);
  const [seriesInstance, setSeriesInstance] = useState<number | null>(null);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_id: existingData?.account_id || "",
      contact_id: existingData?.contact_id || "",
      status: existingData?.status || "",
      title: existingData?.title || "",
      description: existingData?.description || "",
      due_date: existingData?.due_date || undefined,
      assign_myself_as: "none",
      reference_number: existingData?.reference_number || "",
    },
  });

  const selectedAccountId = form.watch("account_id");

  // Filter contacts by selected account
  const filteredContacts = useMemo(() => {
    if (!selectedAccountId) return [];
    return contacts.filter(c => c.account_id === selectedAccountId);
  }, [contacts, selectedAccountId]);

  // Clear contact when account changes
  useEffect(() => {
    const currentContactId = form.getValues("contact_id");
    if (currentContactId && !filteredContacts.some(c => c.id === currentContactId)) {
      form.setValue("contact_id", "");
    }
  }, [selectedAccountId, filteredContacts, form]);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [accountsRes, contactsRes, statusesRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name")
          .eq("organization_id", organizationId)
          .order("name"),
        supabase
          .from("contacts")
          .select("id, first_name, last_name, account_id")
          .eq("organization_id", organizationId)
          .order("first_name"),
        supabase
          .from("picklists")
          .select("id, value")
          .eq("type", "case_status")
          .eq("is_active", true)
          .eq("organization_id", organizationId)
          .order("display_order"),
      ]);

      if (accountsRes.data) setAccounts(accountsRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
      if (statusesRes.data) {
        setCaseStatuses(statusesRes.data);
        // Set default status if not already set
        if (!existingData?.status && statusesRes.data.length > 0) {
          const newStatus = statusesRes.data.find(
            s => s.value.toLowerCase() === "new" || s.value.toLowerCase() === "new assignment"
          );
          if (newStatus) {
            form.setValue("status", newStatus.value);
          }
        }
      }

      // Generate case number
      await generateCaseNumber();
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const generateCaseNumber = async () => {
    try {
      // Get the session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session available");
        return;
      }

      // Call edge function to get atomic case number
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
        // Fallback to legacy method if edge function fails
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
      // Fallback to legacy method
      await generateCaseNumberFallback();
    }
  };

  // Fallback method for existing installations
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
        title: data.title || generatedCaseNumber,
        case_number: generatedCaseNumber,
        description: data.description || null,
        status: "Draft",
        account_id: data.account_id,
        contact_id: data.contact_id,
        due_date: data.due_date ? data.due_date.toISOString().split("T")[0] : null,
        user_id: currentUserId,
        organization_id: organizationId,
        instance_number: 1,
        is_draft: true,
        draft_created_by: currentUserId,
        reference_number: data.reference_number || null,
        // New series tracking fields
        series_number: seriesNumber || undefined,
        series_instance: seriesInstance || 1,
      };

      // Set assignment based on selection
      if (data.assign_myself_as === "case_manager") {
        caseData.case_manager_id = currentUserId;
      } else if (data.assign_myself_as === "investigator") {
        caseData.investigator_ids = [currentUserId];
      }

      const { data: newCase, error } = await supabase
        .from("cases")
        .insert(caseData)
        .select()
        .single();

      if (error) throw error;

      // Prepare form data for wizard state
      const formData: CaseFormData = {
        account_id: data.account_id,
        contact_id: data.contact_id,
        status: data.status,
        title: data.title || "",
        case_number: generatedCaseNumber,
        description: data.description || "",
        due_date: data.due_date || null,
        case_manager_id: data.assign_myself_as === "case_manager" ? currentUserId : null,
        case_manager_2_id: null,
        investigator_ids: data.assign_myself_as === "investigator" ? [currentUserId] : [],
        reference_number: data.reference_number || null,
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
          Enter the core details for this case. A draft will be created when you continue.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Case Number (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Case Number</label>
            <Input
              value={generatedCaseNumber}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Auto-generated</p>
          </div>

          {/* Client */}
          <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Primary Contact */}
          <FormField
            control={form.control}
            name="contact_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Contact *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!selectedAccountId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedAccountId ? "Select contact" : "Select client first"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredContacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Case Type */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Case Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select case type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {caseStatuses.map(status => (
                      <SelectItem key={status.id} value={status.value}>
                        {status.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  This will be the initial case type after approval
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Assign Myself As */}
          <FormField
            control={form.control}
            name="assign_myself_as"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign Myself As</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Do not assign</SelectItem>
                    <SelectItem value="case_manager">Case Manager</SelectItem>
                    <SelectItem value="investigator">Investigator</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Case Name / Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Case Name / Internal Reference</FormLabel>
                <FormControl>
                  <Input placeholder="Optional case name" {...field} />
                </FormControl>
                <FormDescription>
                  Leave blank to use the case number as the title
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Reference Number */}
          <FormField
            control={form.control}
            name="reference_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Reference Number</FormLabel>
                <FormControl>
                  <Input placeholder="Client's internal reference" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Due Date */}
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date</FormLabel>
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : "Select date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setDueDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief case description"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <WizardNavigation
            currentStep={1}
            onBack={() => {}}
            onContinue={form.handleSubmit(onSubmit)}
            canContinue={form.formState.isValid}
            isSubmitting={isSubmitting}
            continueLabel="Create Draft & Continue"
          />
        </form>
      </Form>
    </div>
  );
}

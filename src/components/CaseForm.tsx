import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationHelpers } from "@/lib/notificationHelpers";
import { useOrganization } from "@/contexts/OrganizationContext";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

const caseSchema = z.object({
  title: z.string().max(200).optional(),
  case_number: z.string().min(1, "Case number is required").max(50),
  description: z.string().max(1000).optional(),
  status: z.string().min(1, "Status is required"),
  account_id: z.string().optional(),
  contact_id: z.string().optional(),
  due_date: z.date().optional(),
  use_primary_subject_as_title: z.boolean().default(false),
  budget_hours: z.coerce.number().min(0).optional().nullable(),
  budget_dollars: z.coerce.number().min(0).optional().nullable(),
  budget_notes: z.string().max(500).optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
});

type CaseFormData = z.infer<typeof caseSchema>;

interface CaseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingCase?: {
    id: string;
    title: string;
    case_number: string;
    description: string | null;
    status: string;
    account_id: string | null;
    contact_id: string | null;
    due_date: string | null;
    use_primary_subject_as_title?: boolean;
    budget_hours?: number | null;
    budget_dollars?: number | null;
    budget_notes?: string | null;
    reference_number?: string | null;
  };
}

interface Account {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

export function CaseForm({ open, onOpenChange, onSuccess, editingCase }: CaseFormProps) {
  const { organization } = useOrganization();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<Array<{id: string, value: string}>>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [caseManagerId, setCaseManagerId] = useState<string>("");
  const [investigators, setInvestigators] = useState<string[]>([]);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [primarySubjectName, setPrimarySubjectName] = useState<string | null>(null);

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      title: "",
      case_number: "",
      description: "",
      status: "",
      account_id: "",
      contact_id: "",
      use_primary_subject_as_title: false,
      budget_hours: null,
      budget_dollars: null,
      budget_notes: null,
      reference_number: null,
    },
  });

  const usePrimarySubjectAsTitle = form.watch("use_primary_subject_as_title");

  useEffect(() => {
    if (open && organization?.id) {
      fetchAccountsAndContacts();
      fetchCaseStatuses();
      fetchProfiles();
      if (editingCase) {
        fetchPrimarySubject(editingCase.id);
        form.reset({
          title: editingCase.title,
          case_number: editingCase.case_number,
          description: editingCase.description || "",
          status: editingCase.status,
          account_id: editingCase.account_id || "",
          contact_id: editingCase.contact_id || "",
          due_date: editingCase.due_date ? new Date(editingCase.due_date) : undefined,
          use_primary_subject_as_title: editingCase.use_primary_subject_as_title || false,
          budget_hours: editingCase.budget_hours ?? null,
          budget_dollars: editingCase.budget_dollars ?? null,
          budget_notes: editingCase.budget_notes ?? null,
          reference_number: editingCase.reference_number ?? null,
        });
        // @ts-ignore - case_manager_id and investigator_ids exist on editingCase
        setCaseManagerId(editingCase.case_manager_id || "");
        // @ts-ignore
        setInvestigators(editingCase.investigator_ids || []);
      } else {
        setPrimarySubjectName(null);
        generateCaseNumber();
        form.reset({
          title: "",
          case_number: "",
          description: "",
          status: "",
          account_id: "",
          contact_id: "",
          use_primary_subject_as_title: false,
          budget_hours: null,
          budget_dollars: null,
          budget_notes: null,
          reference_number: null,
        });
        setCaseManagerId("");
        setInvestigators([]);
      }
    }
  }, [open, editingCase, organization?.id]);

  // Set default status when statuses are loaded
  useEffect(() => {
    if (caseStatuses.length > 0) {
      if (editingCase) {
        // For editing, find matching status (case-insensitive)
        const currentStatus = editingCase.status;
        const matchingStatus = caseStatuses.find(
          s => s.value.toLowerCase() === currentStatus.toLowerCase()
        );
        if (matchingStatus) {
          form.setValue("status", matchingStatus.value);
        }
      } else {
        // For new cases, default to "New" status
        const newStatus = caseStatuses.find(
          s => s.value.toLowerCase() === 'new' || 
               s.value.toLowerCase() === 'new assignment'
        );
        if (newStatus) {
          form.setValue("status", newStatus.value);
        } else if (caseStatuses[0]) {
          // Fallback to first available status
          form.setValue("status", caseStatuses[0].value);
        }
      }
    }
  }, [caseStatuses, editingCase]);

  const fetchPrimarySubject = async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from("case_subjects")
        .select("name")
        .eq("case_id", caseId)
        .eq("is_primary", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching primary subject:", error);
        setPrimarySubjectName(null);
        return;
      }

      setPrimarySubjectName(data?.name || null);
    } catch (error) {
      console.error("Error fetching primary subject:", error);
      setPrimarySubjectName(null);
    }
  };

  const fetchCaseStatuses = async () => {
    try {
      if (!organization?.id) {
        console.log("No organization ID available for fetching case statuses");
        return;
      }

      console.log("Fetching case statuses for organization:", organization.id);

      const { data, error } = await supabase
        .from("picklists")
        .select("id, value")
        .eq("type", "case_status")
        .eq("is_active", true)
        .eq("organization_id", organization.id)
        .order("display_order");

      if (error) {
        console.error("Error fetching case statuses:", error);
        return;
      }

      console.log("Case statuses fetched:", data);

      if (data) {
        setCaseStatuses(data);
      }
    } catch (error) {
      console.error("Error fetching case statuses:", error);
    }
  };

  const fetchProfiles = async () => {
    try {
      if (!organization?.id) return;

      // Get all organization member user_ids
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization.id);

      if (!orgMembers) return;

      const userIds = orgMembers.map(m => m.user_id);

      // Fetch profiles only for users in the same organization
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
        .order("full_name");

      if (data) {
        setProfiles(data);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const fetchAccountsAndContacts = async () => {
    try {
      if (!organization?.id) {
        console.log("No organization selected");
        return;
      }

      console.log("Fetching accounts and contacts for org:", organization.id);

      const [accountsData, contactsData] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name")
          .eq("organization_id", organization.id)
          .order("name"),
        supabase
          .from("contacts")
          .select("id, first_name, last_name")
          .eq("organization_id", organization.id)
          .order("first_name"),
      ]);

      if (accountsData.error) {
        console.error("Error fetching accounts:", accountsData.error);
      } else {
        console.log("Accounts fetched:", accountsData.data?.length || 0);
        setAccounts(accountsData.data || []);
      }

      if (contactsData.error) {
        console.error("Error fetching contacts:", contactsData.error);
      } else {
        console.log("Contacts fetched:", contactsData.data?.length || 0);
        setContacts(contactsData.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const generateCaseNumber = async () => {
    try {
      if (!organization?.id) return;

      // Get all case numbers in THIS organization to find the highest base case number
      // Exclude instance numbers (e.g., CASE-00001-02) and only count base numbers
      const { data: existingCases, error } = await supabase
        .from("cases")
        .select("case_number, instance_number")
        .eq("organization_id", organization.id);

      if (error) {
        console.error("Error fetching existing cases:", error);
        return;
      }

      let nextNumber = 1;
      if (existingCases && existingCases.length > 0) {
        // Extract base case numbers (only cases with instance_number = 1)
        const numbers = existingCases
          .filter(c => c.instance_number === 1) // Only count original cases
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
      console.log(`Generated case number ${caseNumber} for organization ${organization.id}`);
      form.setValue("case_number", caseNumber);
    } catch (error) {
      console.error("Error generating case number:", error);
    }
  };

  const onSubmit = async (data: CaseFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!organization?.id) throw new Error("No organization selected");

      // Determine the title to use
      let titleToUse = data.title || "";
      if (data.use_primary_subject_as_title) {
        if (editingCase && primarySubjectName) {
          // Use primary subject name if editing and it exists
          titleToUse = primarySubjectName;
        } else {
          // For new cases, use case number as placeholder until primary subject is set
          titleToUse = data.case_number;
        }
      }

      // Validate that we have a title (either manual or from primary subject)
      if (!titleToUse && !data.use_primary_subject_as_title) {
        toast.error("Case title is required");
        return;
      }

      const caseData = {
        title: titleToUse,
        case_number: data.case_number,
        description: data.description,
        status: data.status,
        account_id: data.account_id || null,
        contact_id: data.contact_id || null,
        due_date: data.due_date ? data.due_date.toISOString().split('T')[0] : null,
        case_manager_id: caseManagerId || null,
        investigator_ids: investigators,
        use_primary_subject_as_title: data.use_primary_subject_as_title,
        budget_hours: data.budget_hours || null,
        budget_dollars: data.budget_dollars || null,
        budget_notes: data.budget_notes || null,
        reference_number: data.reference_number || null,
      };

      if (editingCase) {
        const { error } = await supabase
          .from("cases")
          .update(caseData)
          .eq("id", editingCase.id)
          .eq("user_id", user.id);

        if (error) throw error;
        
        // Send notification if status changed
        if (data.status !== editingCase.status) {
          await NotificationHelpers.caseStatusChanged(
            {
              id: editingCase.id,
              title: titleToUse,
              case_number: data.case_number,
              status: data.status,
            },
            user.id,
            organization.id
          );
        }
        
        toast.success("Case updated successfully");
      } else {
        const { data: newCase, error } = await supabase.from("cases").insert([{
          ...caseData,
          user_id: user.id,
          organization_id: organization.id,
          instance_number: 1, // New cases always start at instance 1
        }]).select().single();

        if (error) throw error;
        
        // Send notification to all org members
        await NotificationHelpers.caseCreated(
          {
            id: newCase.id,
            title: titleToUse,
            case_number: data.case_number,
          },
          user.id,
          organization.id
        );
        
        toast.success("Case created successfully");
      }

      form.reset();
      setCaseManagerId("");
      setInvestigators([]);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(editingCase ? "Failed to update case" : "Failed to create case");
      console.error(error);
    }
  };

  const handleAddInvestigator = (investigatorId: string) => {
    if (investigatorId && !investigators.includes(investigatorId)) {
      setInvestigators([...investigators, investigatorId]);
    }
  };

  const handleRemoveInvestigator = (investigatorId: string) => {
    setInvestigators(investigators.filter(id => id !== investigatorId));
  };

  return (
    <>
      <LoadingOverlay 
        show={form.formState.isSubmitting} 
        message={editingCase ? "Updating case..." : "Creating case..."} 
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCase ? "Edit Case" : "Create New Case"}</DialogTitle>
            <DialogDescription>
              {editingCase ? "Update case details" : "Start a new investigation case"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="case_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Number *</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {caseStatuses.map((status) => (
                          <SelectItem key={status.id} value={status.value}>
                            {status.value.charAt(0).toUpperCase() + status.value.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Use Primary Subject as Title Checkbox */}
            <FormField
              control={form.control}
              name="use_primary_subject_as_title"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Use Primary Subject as Case Title
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      {field.value 
                        ? "The case title will automatically update when you set a primary subject"
                        : "Check this to automatically use the primary subject's name as the case title"}
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Primary Subject Display (when editing and has primary subject) */}
            {editingCase && primarySubjectName && usePrimarySubjectAsTitle ? (
              <FormItem>
                <FormLabel>Case Title (from Primary Subject)</FormLabel>
                <FormControl>
                  <Input 
                    value={primarySubjectName} 
                    readOnly 
                    className="bg-muted font-medium"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Title is synced with the primary subject</p>
              </FormItem>
            ) : !usePrimarySubjectAsTitle ? (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Investigation title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Case Title</FormLabel>
                <FormControl>
                  <Input 
                    value="Will be set from primary subject" 
                    readOnly 
                    className="bg-muted text-muted-foreground italic"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Add a primary subject to this case to set the title</p>
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objective</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the case..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
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

              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Contact</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.map((contact) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">

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
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reference Number */}
            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference No. (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="External reference number" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Case Manager and Investigators */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold">Team Assignment</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Case Manager</label>
                  <Select value={caseManagerId} onValueChange={setCaseManagerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select case manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Add Investigator</label>
                  <Select value="" onValueChange={handleAddInvestigator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select investigator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter(p => p.id !== caseManagerId && !investigators.includes(p.id))
                        .map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {investigators.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Assigned Investigators</label>
                  <div className="flex flex-wrap gap-2">
                    {investigators.map(invId => {
                      const inv = profiles.find(p => p.id === invId);
                      if (!inv) return null;
                      return (
                        <div
                          key={invId}
                          className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-sm"
                        >
                          <span>{inv.full_name || inv.email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInvestigator(invId)}
                            className="hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Budget Authorization */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold">Budget Authorization</h3>
              <p className="text-xs text-muted-foreground">
                Set authorization limits for this case. This is NOT a retainer or payment.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="budget_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget_dollars"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Dollars</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            step="1"
                            placeholder="0"
                            className="pl-6"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="budget_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notes about the budget authorization..."
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting 
                  ? (editingCase ? "Updating..." : "Creating...") 
                  : (editingCase ? "Update Case" : "Create Case")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}

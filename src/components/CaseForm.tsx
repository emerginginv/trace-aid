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
import { CalendarIcon, X, Lock } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationHelpers } from "@/lib/notificationHelpers";
import { useOrganization } from "@/contexts/OrganizationContext";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useCaseTypesQuery, CaseType } from "@/hooks/queries/useCaseTypesQuery";
import { DueDateRecalculateDialog } from "@/components/case-detail/DueDateRecalculateDialog";
import { ServiceConflictDialog } from "@/components/case-detail/ServiceConflictDialog";
import { BudgetConflictDialog } from "@/components/case-detail/BudgetConflictDialog";
import { useCaseBillingStatus } from "@/hooks/useCaseBillingStatus";
import { logCaseTypeAudit, determineCaseTypeAuditAction } from "@/lib/caseTypeAuditLogger";

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
  reference_number_2: z.string().max(100).optional().nullable(),
  reference_number_3: z.string().max(100).optional().nullable(),
  case_type_id: z.string().optional().nullable(),
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
    reference_number_2?: string | null;
    reference_number_3?: string | null;
    case_type_id?: string | null;
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
  account_id: string | null;
}

export function CaseForm({ open, onOpenChange, onSuccess, editingCase }: CaseFormProps) {
  const { organization } = useOrganization();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<Array<{id: string, value: string}>>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [caseManagerId, setCaseManagerId] = useState<string>("");
  const [caseManager2Id, setCaseManager2Id] = useState<string>("");
  const [investigators, setInvestigators] = useState<string[]>([]);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [primarySubjectName, setPrimarySubjectName] = useState<string | null>(null);
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState<string | null>(null);
  
  // Due date recalculation dialog state
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
  const [pendingDueDateChange, setPendingDueDateChange] = useState<{
    newCaseTypeId: string;
    newDueDate: Date;
    currentDueDate: Date | null;
    defaultDays: number;
    caseTypeName: string;
  } | null>(null);

  // Service conflict dialog state
  const [serviceConflictDialogOpen, setServiceConflictDialogOpen] = useState(false);
  const [pendingServiceConflict, setPendingServiceConflict] = useState<{
    newCaseTypeId: string;
    newCaseTypeName: string;
    conflictingServices: Array<{ id: string; name: string; code?: string | null }>;
  } | null>(null);

  // Budget conflict dialog state
  const [budgetConflictDialogOpen, setBudgetConflictDialogOpen] = useState(false);
  const [pendingBudgetConflict, setPendingBudgetConflict] = useState<{
    newCaseTypeId: string;
    newCaseTypeName: string;
    newStrategy: string;
    currentBudget: {
      budget_type: string;
      total_budget_hours: number | null;
      total_budget_amount: number | null;
    };
  } | null>(null);

  // Track audit context for Case Type changes
  const auditContextRef = useRef<{
    hadBudgetConflict: boolean;
    hadServiceConflict: boolean;
    servicesRemoved: string[];
    hadDueDateChange: boolean;
    previousCaseTypeId: string | null;
    previousCaseTypeName: string | null;
    previousBudgetStrategy: string | null;
  }>({
    hadBudgetConflict: false,
    hadServiceConflict: false,
    servicesRemoved: [],
    hadDueDateChange: false,
    previousCaseTypeId: null,
    previousCaseTypeName: null,
    previousBudgetStrategy: null,
  });

  // Fetch case types using React Query
  const { data: caseTypes = [] } = useCaseTypesQuery();
  
  // Check if billing has started for this case (locks Case Type changes)
  const { data: billingStatus } = useCaseBillingStatus(editingCase?.id);
  const isCaseTypeLocked = editingCase && billingStatus?.hasBilling;

  // Get the selected case type object
  const selectedCaseType = useMemo(() => {
    return caseTypes.find(ct => ct.id === selectedCaseTypeId) || null;
  }, [caseTypes, selectedCaseTypeId]);

  // Determine budget visibility based on case type
  const budgetConfig = useMemo(() => {
    if (!selectedCaseType) {
      return { showHours: true, showDollars: true, required: false };
    }
    const strategy = selectedCaseType.budget_strategy || 'both';
    return {
      showHours: strategy === 'hours_only' || strategy === 'both',
      showDollars: strategy === 'money_only' || strategy === 'both',
      required: selectedCaseType.budget_required || false,
      disabled: strategy === 'disabled',
    };
  }, [selectedCaseType]);

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
      reference_number_2: null,
      reference_number_3: null,
      case_type_id: null,
    },
  });

  const usePrimarySubjectAsTitle = form.watch("use_primary_subject_as_title");
  const selectedAccountId = form.watch("account_id");

  // Filter contacts based on selected account
  const filteredContacts = useMemo(() => {
    if (!selectedAccountId) {
      return [];
    }
    return contacts.filter(contact => contact.account_id === selectedAccountId);
  }, [contacts, selectedAccountId]);

  // Clear contact selection when account changes and contact is no longer valid
  useEffect(() => {
    const currentContactId = form.getValues("contact_id");
    if (currentContactId) {
      const contactStillValid = filteredContacts.some(c => c.id === currentContactId);
      if (!contactStillValid) {
        form.setValue("contact_id", "");
      }
    }
  }, [selectedAccountId, filteredContacts, form]);

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
          reference_number_2: editingCase.reference_number_2 ?? null,
          reference_number_3: editingCase.reference_number_3 ?? null,
          case_type_id: editingCase.case_type_id ?? null,
        });
        setSelectedCaseTypeId(editingCase.case_type_id || null);
        // @ts-ignore - case_manager_id, case_manager_2_id and investigator_ids exist on editingCase
        setCaseManagerId(editingCase.case_manager_id || "");
        // @ts-ignore
        setCaseManager2Id(editingCase.case_manager_2_id || "");
        // @ts-ignore
        setInvestigators(editingCase.investigator_ids || []);
      } else {
        setPrimarySubjectName(null);
        setSelectedCaseTypeId(null);
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
          reference_number_2: null,
          reference_number_3: null,
          case_type_id: null,
        });
        setCaseManagerId("");
        setCaseManager2Id("");
        setInvestigators([]);
      }
    }
  }, [open, editingCase, organization?.id]);

  // Helper to check if budget conflict exists
  const checkBudgetConflict = (
    currentBudget: { budget_type: string; total_budget_hours: number | null; total_budget_amount: number | null },
    newStrategy: string
  ): boolean => {
    // Switching to disabled always conflicts if budget exists
    if (newStrategy === 'disabled') return true;
    
    // Switching to hours_only conflicts if there's dollar data
    if (newStrategy === 'hours_only' && currentBudget.total_budget_amount) return true;
    
    // Switching to money_only conflicts if there's hours data
    if (newStrategy === 'money_only' && currentBudget.total_budget_hours) return true;
    
    return false;
  };

  // Continue checking for service conflicts after budget is resolved
  const continueWithServiceConflictCheck = async (caseTypeId: string) => {
    const caseType = caseTypes.find(ct => ct.id === caseTypeId);
    if (!caseType || !editingCase) {
      continueWithDueDateCheck(caseTypeId);
      return;
    }

    // Check for service conflicts
    if (caseType.allowed_service_ids && caseType.allowed_service_ids.length > 0) {
      const { data: currentInstances } = await supabase
        .from("case_service_instances")
        .select(`
          id, 
          case_service_id,
          case_services!inner(name, code)
        `)
        .eq("case_id", editingCase.id);

      const conflicting = currentInstances?.filter(
        instance => !caseType.allowed_service_ids!.includes(instance.case_service_id)
      ).map(instance => ({
        id: instance.id,
        name: (instance.case_services as any)?.name || 'Unknown',
        code: (instance.case_services as any)?.code || null,
      }));

      if (conflicting && conflicting.length > 0) {
        setPendingServiceConflict({
          newCaseTypeId: caseTypeId,
          newCaseTypeName: caseType.name,
          conflictingServices: conflicting,
        });
        setServiceConflictDialogOpen(true);
        return;
      }
    }

    // No service conflicts, continue to due date check
    continueWithDueDateCheck(caseTypeId);
  };

  // Continue checking for due date after services are resolved
  const continueWithDueDateCheck = (caseTypeId: string) => {
    const caseType = caseTypes.find(ct => ct.id === caseTypeId);
    
    if (editingCase && caseType?.default_due_days && caseType.default_due_days > 0) {
      const currentDueDate = form.getValues("due_date") || null;
      const newDueDate = addDays(new Date(), caseType.default_due_days);
      
      setPendingDueDateChange({
        newCaseTypeId: caseTypeId,
        newDueDate,
        currentDueDate,
        defaultDays: caseType.default_due_days,
        caseTypeName: caseType.name,
      });
      setDueDateDialogOpen(true);
      return;
    }

    // No due date dialog needed, apply the change
    applyCaseTypeChange(caseTypeId);
  };

  // Apply the final case type change and log audit
  const applyCaseTypeChange = async (caseTypeId: string | null, newDueDate?: Date) => {
    const caseType = caseTypeId ? caseTypes.find(ct => ct.id === caseTypeId) : null;
    
    setSelectedCaseTypeId(caseTypeId);
    form.setValue("case_type_id", caseTypeId);
    
    if (newDueDate) {
      form.setValue("due_date", newDueDate);
      auditContextRef.current.hadDueDateChange = true;
    }
    
    // Clear budget fields if strategy is disabled (for form display only - actual budget deletion is handled in dialog confirm)
    if (caseType?.budget_strategy === 'disabled') {
      form.setValue("budget_hours", null);
      form.setValue("budget_dollars", null);
    }

    // Log the case type change for existing cases
    if (editingCase && organization) {
      const auditAction = determineCaseTypeAuditAction(
        auditContextRef.current.previousCaseTypeId,
        caseTypeId
      );
      
      if (auditAction && auditAction !== 'case_type_removed') {
        await logCaseTypeAudit({
          action: auditAction,
          organizationId: organization.id,
          metadata: {
            caseId: editingCase.id,
            caseNumber: editingCase.case_number,
            previousCaseTypeId: auditContextRef.current.previousCaseTypeId,
            previousCaseTypeName: auditContextRef.current.previousCaseTypeName,
            previousBudgetStrategy: auditContextRef.current.previousBudgetStrategy,
            newCaseTypeId: caseTypeId,
            newCaseTypeName: caseType?.name || null,
            newBudgetStrategy: caseType?.budget_strategy || 'both',
            budgetConflictResolved: auditContextRef.current.hadBudgetConflict,
            serviceConflictResolved: auditContextRef.current.hadServiceConflict,
            servicesRemoved: auditContextRef.current.servicesRemoved,
            dueDateRecalculated: auditContextRef.current.hadDueDateChange,
            severity: 'MEDIUM',
          },
        });
      }
    }
  };

  // Handle case type change - set defaults based on case type
  const handleCaseTypeChange = async (caseTypeId: string | null) => {
    // Check if locked due to billing
    if (editingCase && billingStatus?.hasBilling) {
      // Log blocked attempt
      if (organization) {
        await logCaseTypeAudit({
          action: 'case_type_change_blocked',
          organizationId: organization.id,
          metadata: {
            caseId: editingCase.id,
            caseNumber: editingCase.case_number,
            previousCaseTypeId: editingCase.case_type_id,
            previousCaseTypeName: caseTypes.find(ct => ct.id === editingCase.case_type_id)?.name || null,
            newCaseTypeId: caseTypeId,
            newCaseTypeName: caseTypeId ? caseTypes.find(ct => ct.id === caseTypeId)?.name || null : null,
            reason: 'Billing has already started for this case',
            severity: 'MEDIUM',
          },
        });
      }
      toast.error("Cannot change case type after billing has started");
      return;
    }
    
    // Track previous state for audit logging
    if (editingCase) {
      const previousCaseType = caseTypes.find(ct => ct.id === editingCase.case_type_id);
      auditContextRef.current = {
        ...auditContextRef.current,
        previousCaseTypeId: editingCase.case_type_id || null,
        previousCaseTypeName: previousCaseType?.name || null,
        previousBudgetStrategy: previousCaseType?.budget_strategy || null,
        hadBudgetConflict: false,
        hadServiceConflict: false,
        servicesRemoved: [],
        hadDueDateChange: false,
      };
    }
    
    if (!caseTypeId) {
      // Clearing case type - log if there was one before
      if (editingCase?.case_type_id && organization) {
        await logCaseTypeAudit({
          action: 'case_type_removed',
          organizationId: organization.id,
          metadata: {
            caseId: editingCase.id,
            caseNumber: editingCase.case_number,
            previousCaseTypeId: editingCase.case_type_id,
            previousCaseTypeName: caseTypes.find(ct => ct.id === editingCase.case_type_id)?.name || null,
            severity: 'MEDIUM',
          },
        });
      }
      applyCaseTypeChange(null);
      return;
    }

    const caseType = caseTypes.find(ct => ct.id === caseTypeId);
    if (!caseType) {
      applyCaseTypeChange(caseTypeId);
      return;
    }

    // For new cases, just apply with auto-set due date
    if (!editingCase) {
      if (caseType.default_due_days && caseType.default_due_days > 0) {
        const newDueDate = addDays(new Date(), caseType.default_due_days);
        form.setValue("due_date", newDueDate);
      }
      applyCaseTypeChange(caseTypeId);
      return;
    }

    // For editing existing cases, check conflicts in order: Budget → Services → Due Date
    const newStrategy = caseType.budget_strategy || 'both';

    // STEP 1: Check for budget conflicts
    const { data: currentBudget } = await supabase
      .from("case_budgets")
      .select("budget_type, total_budget_hours, total_budget_amount")
      .eq("case_id", editingCase.id)
      .maybeSingle();

    if (currentBudget && checkBudgetConflict(currentBudget, newStrategy)) {
      setPendingBudgetConflict({
        newCaseTypeId: caseTypeId,
        newCaseTypeName: caseType.name,
        newStrategy,
        currentBudget,
      });
      setBudgetConflictDialogOpen(true);
      return;
    }

    // No budget conflict, continue to service conflict check
    await continueWithServiceConflictCheck(caseTypeId);
  };

  // Handle cancelling budget conflict change
  const handleCancelBudgetConflict = () => {
    setPendingBudgetConflict(null);
  };

  // Handle confirming budget conflict (update/delete budget and continue chain)
  const handleConfirmBudgetConflict = async () => {
    if (!pendingBudgetConflict || !editingCase) return;

    const { newCaseTypeId, newStrategy } = pendingBudgetConflict;
    
    // Track for audit
    auditContextRef.current.hadBudgetConflict = true;

    try {
      // Update applied_budget_strategy on the case
      await supabase
        .from("cases")
        .update({ applied_budget_strategy: newStrategy })
        .eq("id", editingCase.id);

      if (newStrategy === 'disabled') {
        // Remove the case_budgets record entirely
        await supabase
          .from("case_budgets")
          .delete()
          .eq("case_id", editingCase.id);
        
        toast.success("Budget configuration removed");
      } else if (newStrategy === 'hours_only') {
        // Clear dollar amount, update budget_type
        await supabase
          .from("case_budgets")
          .update({ 
            total_budget_amount: null,
            budget_type: 'hours'
          })
          .eq("case_id", editingCase.id);
        
        toast.success("Dollar budget cleared");
      } else if (newStrategy === 'money_only') {
        // Clear hours amount, update budget_type
        await supabase
          .from("case_budgets")
          .update({ 
            total_budget_hours: null,
            budget_type: 'money'
          })
          .eq("case_id", editingCase.id);
        
        toast.success("Hours budget cleared");
      }

      // Continue to service conflict check
      await continueWithServiceConflictCheck(newCaseTypeId);
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget configuration");
    }

    setPendingBudgetConflict(null);
  };

  // Handle cancelling service conflict change
  const handleCancelServiceConflict = () => {
    setPendingServiceConflict(null);
  };

  // Handle confirming service conflict (remove conflicting services and continue chain)
  const handleConfirmServiceConflict = async () => {
    if (!pendingServiceConflict || !editingCase) return;

    const { newCaseTypeId, conflictingServices } = pendingServiceConflict;
    
    // Track for audit
    auditContextRef.current.hadServiceConflict = true;
    auditContextRef.current.servicesRemoved = conflictingServices.map(s => s.name);

    try {
      // Remove conflicting service instances
      const conflictingIds = conflictingServices.map(s => s.id);
      if (conflictingIds.length > 0) {
        const { error } = await supabase
          .from("case_service_instances")
          .delete()
          .in("id", conflictingIds);

        if (error) {
          console.error("Error removing conflicting services:", error);
          toast.error("Failed to remove conflicting services");
          return;
        }
        
        toast.success(`Removed ${conflictingServices.length} incompatible service${conflictingServices.length !== 1 ? 's' : ''}`);
      }

      // Continue to due date check
      continueWithDueDateCheck(newCaseTypeId);
    } catch (error) {
      console.error("Error handling service conflict:", error);
      toast.error("Failed to update Case Type");
    }

    setPendingServiceConflict(null);
  };

  // Handle keeping current due date (from dialog)
  const handleKeepCurrentDueDate = () => {
    if (pendingDueDateChange) {
      const { newCaseTypeId } = pendingDueDateChange;
      applyCaseTypeChange(newCaseTypeId);
    }
    setDueDateDialogOpen(false);
    setPendingDueDateChange(null);
  };

  // Handle updating to new due date (from dialog)
  const handleUpdateToNewDueDate = () => {
    if (pendingDueDateChange) {
      const { newCaseTypeId, newDueDate } = pendingDueDateChange;
      applyCaseTypeChange(newCaseTypeId, newDueDate);
    }
    setDueDateDialogOpen(false);
    setPendingDueDateChange(null);
  };

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

      const { data, error } = await (supabase
        .from("picklists") as any)
        .select("id, value")
        .eq("category", "case_status")
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
          .select("id, first_name, last_name, account_id")
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
          // For new cases, leave empty - title will be set when first subject is added (auto becomes primary)
          titleToUse = "";
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
        case_manager_2_id: caseManager2Id || null,
        investigator_ids: investigators,
        use_primary_subject_as_title: data.use_primary_subject_as_title,
        budget_hours: data.budget_hours || null,
        budget_dollars: data.budget_dollars || null,
        budget_notes: data.budget_notes || null,
        reference_number: data.reference_number || null,
        reference_number_2: data.reference_number_2 || null,
        reference_number_3: data.reference_number_3 || null,
        case_type_id: data.case_type_id || null,
        // Store applied budget strategy from case type
        applied_budget_strategy: selectedCaseType?.budget_strategy || 'both',
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
      setCaseManager2Id("");
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
      
      {/* Due Date Recalculation Dialog */}
      <DueDateRecalculateDialog
        open={dueDateDialogOpen}
        onOpenChange={setDueDateDialogOpen}
        onKeepCurrent={handleKeepCurrentDueDate}
        onUpdateToNew={handleUpdateToNewDueDate}
        currentDueDate={pendingDueDateChange?.currentDueDate || null}
        newDueDate={pendingDueDateChange?.newDueDate || new Date()}
        defaultDays={pendingDueDateChange?.defaultDays || 0}
        caseTypeName={pendingDueDateChange?.caseTypeName}
      />

      {/* Budget Conflict Dialog */}
      <BudgetConflictDialog
        open={budgetConflictDialogOpen}
        onOpenChange={setBudgetConflictDialogOpen}
        onConfirm={handleConfirmBudgetConflict}
        onCancel={handleCancelBudgetConflict}
        currentBudget={pendingBudgetConflict?.currentBudget || null}
        newStrategy={pendingBudgetConflict?.newStrategy || 'both'}
        newCaseTypeName={pendingBudgetConflict?.newCaseTypeName || ''}
      />

      {/* Service Conflict Dialog */}
      <ServiceConflictDialog
        open={serviceConflictDialogOpen}
        onOpenChange={setServiceConflictDialogOpen}
        onConfirm={handleConfirmServiceConflict}
        onCancel={handleCancelServiceConflict}
        conflictingServices={pendingServiceConflict?.conflictingServices || []}
        newCaseTypeName={pendingServiceConflict?.newCaseTypeName || ""}
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

            {/* Case Type Selector */}
            <FormField
              control={form.control}
              name="case_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Case Type
                    {isCaseTypeLocked && (
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => handleCaseTypeChange(value === "__none__" ? null : value)} 
                    value={field.value || "__none__"}
                    disabled={isCaseTypeLocked}
                  >
                    <FormControl>
                      <SelectTrigger className={isCaseTypeLocked ? "opacity-70" : ""}>
                        <SelectValue placeholder="Select case type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">No case type</span>
                      </SelectItem>
                      {caseTypes.map((caseType) => (
                        <SelectItem key={caseType.id} value={caseType.id}>
                          <span className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: caseType.color || '#9ca3af' }}
                            />
                            {caseType.name}
                            <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">
                              {caseType.tag}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isCaseTypeLocked && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs mt-1">
                      <Lock className="h-3 w-3" />
                      <span>Case type locked after billing started ({billingStatus?.invoiceCount || 0} invoice{billingStatus?.invoiceCount !== 1 ? 's' : ''})</span>
                    </div>
                  )}
                  {selectedCaseType && !isCaseTypeLocked && (
                    <p className="text-xs text-muted-foreground">
                      {selectedCaseType.description || `Budget: ${selectedCaseType.budget_strategy || 'both'}`}
                      {selectedCaseType.due_date_required && ' • Due date required'}
                      {selectedCaseType.default_due_days && ` • Default due: ${selectedCaseType.default_due_days} days`}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedAccountId}
                    >
                      <FormControl>
                        <SelectTrigger className={!selectedAccountId ? "opacity-50" : ""}>
                          <SelectValue placeholder={
                            !selectedAccountId 
                              ? "Select an account first" 
                              : filteredContacts.length === 0 
                                ? "No contacts for this account" 
                                : "Select contact (optional)"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedAccountId && (
                      <p className="text-xs text-muted-foreground">
                        Select an account to see available contacts
                      </p>
                    )}
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
                    <FormLabel>Due Date{selectedCaseType?.due_date_required && ' *'}</FormLabel>
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

            {/* Reference Numbers - Dynamic based on Case Type */}
            {(selectedCaseType?.reference_label_1 || !selectedCaseType) && (
              <FormField
                control={form.control}
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedCaseType?.reference_label_1 || "Reference No."} (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={`Enter ${selectedCaseType?.reference_label_1 || 'reference number'}...`}
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCaseType?.reference_label_2 && (
              <FormField
                control={form.control}
                name="reference_number_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedCaseType.reference_label_2} (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={`Enter ${selectedCaseType.reference_label_2}...`}
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCaseType?.reference_label_3 && (
              <FormField
                control={form.control}
                name="reference_number_3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedCaseType.reference_label_3} (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={`Enter ${selectedCaseType.reference_label_3}...`}
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Case Manager and Investigators */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold">Team Assignment</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Case Manager 1 (Primary)</label>
                  <Select 
                    value={caseManagerId} 
                    onValueChange={(value) => {
                      // Clear secondary if same user selected
                      if (value === caseManager2Id) {
                        setCaseManager2Id("");
                      }
                      setCaseManagerId(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary case manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter(p => p.id !== caseManager2Id)
                        .map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Case Manager 2 (Secondary)</label>
                  <Select 
                    value={caseManager2Id} 
                    onValueChange={(value) => {
                      // Clear primary if same user selected
                      if (value === caseManagerId) {
                        setCaseManagerId("");
                      }
                      setCaseManager2Id(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select secondary (optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter(p => p.id !== caseManagerId)
                        .map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Add Investigator</label>
                <Select value="" onValueChange={handleAddInvestigator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select investigator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles
                      .filter(p => p.id !== caseManagerId && p.id !== caseManager2Id && !investigators.includes(p.id))
                      .map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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

            {/* Budget Authorization - conditionally shown based on case type */}
            {!budgetConfig.disabled && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold">Budget Authorization</h3>
              <p className="text-xs text-muted-foreground">
                Set authorization limits for this case. This is an internal budget authorization, not a client payment.
                {budgetConfig.required && <span className="text-destructive ml-1">*Required</span>}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {budgetConfig.showHours && (
                <FormField
                  control={form.control}
                  name="budget_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Hours{budgetConfig.required && ' *'}</FormLabel>
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
                )}

                {budgetConfig.showDollars && (
                <FormField
                  control={form.control}
                  name="budget_dollars"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Dollars{budgetConfig.required && ' *'}</FormLabel>
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
                )}
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
            )}

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

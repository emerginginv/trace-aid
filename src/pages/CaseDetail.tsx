import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { FirstTimeGuidance } from "@/components/shared/FirstTimeGuidance";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CaseDetailNav } from "@/components/case-detail/CaseDetailNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Edit, Trash2, Info, MoreVertical, Mail, FileText, Briefcase, Calendar, Users, Paperclip, ClipboardList, DollarSign, Clock, FilePenLine, History } from "lucide-react";
import { CaseStatusHistoryModal } from "@/components/case-detail/CaseStatusHistoryModal";
import { CaseLifecycleBanner } from "@/components/case-detail/CaseLifecycleBanner";
import { LifecycleProgressIndicator } from "@/components/case-detail/LifecycleProgressIndicator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CaseDetailSkeleton } from "@/components/ui/detail-page-skeleton";
import { toast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { CaseForm } from "@/components/CaseForm";
import { SubjectsTab } from "@/components/case-detail/subjects";
import { CaseUpdates } from "@/components/case-detail/CaseUpdates";
import { CaseActivities } from "@/components/case-detail/CaseActivities";
import { CaseFinances } from "@/components/case-detail/CaseFinances";
import { CaseAttachments } from "@/components/case-detail/CaseAttachments";
import { RetainerFundsWidget } from "@/components/case-detail/RetainerFundsWidget";
import { CaseCalendar } from "@/components/case-detail/CaseCalendar";
import { NotificationHelpers } from "@/lib/notifications";
import { CaseTeamManager } from "@/components/case-detail/CaseTeamManager";
import { EmailComposer } from "@/components/EmailComposer";
import { RelatedCases } from "@/components/case-detail/RelatedCases";
import { SourceRequestCard } from "@/components/case-detail/SourceRequestCard";
import { BudgetSummary } from "@/components/case-detail/BudgetSummary";
import { BudgetAdjustmentForm } from "@/components/case-detail/BudgetAdjustmentForm";
import { BudgetAdjustmentsHistory } from "@/components/case-detail/BudgetAdjustmentsHistory";
import { BudgetConsumptionSnapshot } from "@/components/case-detail/BudgetConsumptionSnapshot";
import { CaseBudgetWidget } from "@/components/case-detail/CaseBudgetWidget";
import { BudgetStatusCard } from "@/components/case-detail/BudgetStatusCard";
import { GenerateReportDialog } from "@/components/templates/GenerateReportDialog";
import { CaseSummaryPdfDialog } from "@/components/case-detail/CaseSummaryPdfDialog";
import { CaseReports } from "@/components/case-detail/CaseReports";
import { CaseTimeline } from "@/components/case-detail/CaseTimeline";
import { ClientInfoSection } from "@/components/case-detail/ClientInfoSection";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useStatusDisplay } from "@/hooks/use-status-display";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DelayedTooltip } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useCaseTypeQuery } from "@/hooks/queries/useCaseTypesQuery";
import { useCaseServiceInstances } from "@/hooks/useCaseServiceInstances";
import { useCaseLifecycleStatuses, STATUS_KEYS } from "@/hooks/use-case-lifecycle-statuses";
import { useCaseStatuses } from "@/hooks/use-case-statuses";
import { useCaseStatusTransition } from "@/hooks/use-case-status-transition";

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  status_key: string | null; // Legacy - kept for backward compatibility
  current_status_id: string | null; // New canonical status reference
  current_category_id: string | null; // New category reference
  status_entered_at: string | null;
  category_entered_at: string | null;
  workflow: string | null; // Workflow for filtering available statuses
  account_id: string | null;
  contact_id: string | null;
  due_date: string | null;
  created_at: string;
  case_manager_id: string | null;
  case_manager_2_id: string | null;
  investigator_ids: string[];
  closed_by_user_id: string | null;
  closed_at: string | null;
  parent_case_id: string | null;
  instance_number: number;
  reference_number?: string | null;
  reference_number_2?: string | null;
  reference_number_3?: string | null;
  case_type_id?: string | null;
  source_request_id?: string | null;
}
interface Account {
  id: string;
  name: string;
  status?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
}
interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  status?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
}
const CaseDetail = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const {
    isVendor,
    isAdmin,
    isManager
  } = useUserRole();
  const {
    hasPermission
  } = usePermissions();
  const {
    canViewExactStatus,
    getDisplayName: getStatusDisplayNameByPermission,
    getDisplayStyle: getStatusDisplayStyleByPermission,
  } = useStatusDisplay();
  const {
    organization
  } = useOrganization();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Use BOTH status systems during transition
  // Legacy system (for backward compat with status_key based code)
  const { 
    executionStatuses, 
    getStatusByKey, 
    getDisplayName: getLegacyDisplayName, 
    getStatusColor: getLifecycleStatusColor,
    isClosedStatus: isClosedLifecycleStatus,
    isLoading: legacyStatusesLoading 
  } = useCaseLifecycleStatuses();
  
  // New canonical status system (using current_status_id)
  const {
    statuses: newStatuses,
    activeStatuses,
    categories,
    getStatusById,
    getStatusDisplayName,
    getStatusColor: getNewStatusColor,
    isClosedCategory,
    getNextStatus,
    getPrevStatus,
    getCategoryByName,
    getStatusesByCategoryId,
    isLoading: newStatusesLoading,
  } = useCaseStatuses();
  
  // Status transition engine with validation and workflow filtering
  const {
    getStatusesForWorkflow,
    getStatusesGroupedByCategory,
    canTransitionTo,
    canModifyStatus,
    isStatusLocked,
    getDefaultNextStatus,
    getDefaultPrevStatus,
    checkCanReopen,
    canPotentiallyReopen,
    getFirstOpenStatus,
  } = useCaseStatusTransition();
  
  const statusesLoading = legacyStatusesLoading || newStatusesLoading;
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const validTabs = ['info', 'budget', 'subjects', 'updates', 'activities', 'calendar', 'finances', 'time-expense', 'attachments', 'timeline', 'reports'];
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return isVendor ? 'updates' : 'info';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync tab state with URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSearchParams({
      tab: newTab
    }, {
      replace: true
    });
  };
  const [highlightHistory, setHighlightHistory] = useState(false);
  const budgetTabRef = useRef<HTMLDivElement>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [summaryPdfDialogOpen, setSummaryPdfDialogOpen] = useState(false);
  const [statusHistoryModalOpen, setStatusHistoryModalOpen] = useState(false);
  const [updates, setUpdates] = useState<Array<{
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    update_type: string;
    user_id: string;
  }>>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, {
    id: string;
    full_name: string;
    email: string;
  }>>({});

  // Fetch case type data using React Query
  const {
    data: caseType
  } = useCaseTypeQuery(caseData?.case_type_id);

  // Fetch case service instances
  const {
    data: serviceInstances = []
  } = useCaseServiceInstances(id);

  // Set breadcrumbs based on case data
  useSetBreadcrumbs(caseData ? [{
    label: "Cases",
    href: "/cases"
  }, {
    label: caseData.title || caseData.case_number || "Case"
  }] : [{
    label: "Cases",
    href: "/cases"
  }]);
  const handleViewBudgetHistory = () => {
    setActiveTab("budget");
    setHighlightHistory(true);
    setTimeout(() => {
      budgetTabRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      setTimeout(() => setHighlightHistory(false), 2000);
    }, 100);
  };
  const fetchUpdatesForReport = async () => {
    const {
      data
    } = await supabase.from("case_updates").select("*").eq("case_id", id).order("created_at", {
      ascending: false
    });
    setUpdates(data || []);
  };
  const fetchUserProfilesForReport = async () => {
    const {
      data
    } = await supabase.from("profiles").select("id, full_name, email");
    const profiles: Record<string, {
      id: string;
      full_name: string;
      email: string;
    }> = {};
    (data || []).forEach(p => {
      profiles[p.id] = p;
    });
    setUserProfiles(profiles);
  };
  useEffect(() => {
    fetchCaseData();
    fetchUpdatesForReport();
    fetchUserProfilesForReport();
  }, [id]);
  const fetchCaseData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: userOrgs
      } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id);
      const userOrgIds = userOrgs?.map(o => o.organization_id) || [];
      const {
        data,
        error
      } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({
          title: "Not Found",
          description: "The case you're looking for doesn't exist or you don't have access to it.",
          variant: "destructive"
        });
        navigate("/cases");
        return;
      }
      const hasAccess = data.user_id === user.id || data.investigator_ids?.includes(user.id) || data.organization_id && userOrgIds.includes(data.organization_id);
      if (!hasAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this case.",
          variant: "destructive"
        });
        navigate("/cases");
        return;
      }
      setCaseData(data);
      if (data.account_id) {
        const {
          data: accountData
        } = await supabase.from("accounts").select("id, name, status, industry, phone, email").eq("id", data.account_id).maybeSingle();
        if (accountData) setAccount(accountData);
      }
      if (data.contact_id) {
        const {
          data: contactData
        } = await supabase.from("contacts").select("id, first_name, last_name, status, role, phone, email").eq("id", data.contact_id).maybeSingle();
        if (contactData) setContact(contactData);
      }
    } catch (error) {
      console.error("Error fetching case:", error);
      toast({
        title: "Error",
        description: "Failed to load case details. Please try again.",
        variant: "destructive"
      });
      navigate("/cases");
    } finally {
      setLoading(false);
    }
  };
  // Helper to get status style for display (using lifecycle statuses)
  const getStatusStyle = (statusKey: string) => {
    const color = getLifecycleStatusColor(statusKey);
    if (color) {
      return {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
      };
    }
    return {};
  };
  
  const getStatusColor = (statusKey: string) => {
    return getLifecycleStatusColor(statusKey) ? 'border' : 'bg-muted';
  };
  
  const isClosedCase = () => {
    // Use new status system if current_status_id is set
    if (caseData?.current_status_id) {
      return isClosedCategory(caseData.current_status_id);
    }
    // Fall back to legacy system
    if (!caseData?.status_key) return false;
    return isClosedLifecycleStatus(caseData.status_key);
  };
  
  // === NEW STATUS SYSTEM HELPERS ===
  
  /** Get current status display style using the new system (respects view_exact_status permission) */
  const getCurrentStatusStyle = () => {
    if (caseData?.current_status_id) {
      // Use permission-aware style
      return getStatusDisplayStyleByPermission(caseData.current_status_id);
    }
    // Fall back to legacy
    return getStatusStyle(caseData?.status_key || '');
  };
  
  /** Get current status display name using the new system (respects view_exact_status permission) */
  const getCurrentStatusDisplayName = () => {
    if (caseData?.current_status_id) {
      // Use permission-aware display name
      return getStatusDisplayNameByPermission(caseData.current_status_id);
    }
    // Fall back to legacy
    return getLegacyDisplayName(caseData?.status_key || '') || caseData?.status || 'Unknown';
  };
  
  /** Handle status change using the NEW canonical status system (current_status_id) */
  const handleNewStatusChange = async (newStatusId: string): Promise<boolean> => {
    if (!caseData) return false;
    
    const oldStatusId = caseData.current_status_id;
    if (oldStatusId === newStatusId) return true;
    
    const previousCaseData = { ...caseData };
    const newStatus = getStatusById(newStatusId);
    if (!newStatus) {
      toast({ title: "Error", description: "Status not found", variant: "destructive" });
      return false;
    }
    
    // Validate transition using the transition engine
    const caseWorkflow = caseData.workflow || "standard";
    const validation = canTransitionTo(oldStatusId, newStatusId, caseWorkflow);
    
    if (!validation.valid) {
      toast({ 
        title: "Transition Blocked", 
        description: validation.reason || "Status change not allowed", 
        variant: "destructive" 
      });
      return false;
    }
    
    const wasClosedCategory = oldStatusId ? isClosedCategory(oldStatusId) : false;
    const isNowClosedCategory = isClosedCategory(newStatusId);
    const isClosing = !wasClosedCategory && isNowClosedCategory;
    
    // Optimistic update
    setCaseData({
      ...caseData,
      current_status_id: newStatusId,
      current_category_id: newStatus.category_id,
      status: newStatus.name, // Keep display status in sync for backward compat
      status_entered_at: new Date().toISOString(),
      ...(isClosing ? {
        closed_by_user_id: "pending",
        closed_at: new Date().toISOString()
      } : {})
    });
    
    toast({
      title: "Status updated",
      description: isClosing ? "Case closed" : `Status changed to ${newStatus.name}`
    });
    
    setUpdatingStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      const userName = profile?.full_name || user.email || "Unknown User";
      
      // Build update data - trigger will handle history tracking
      const updateData: Record<string, unknown> = {
        current_status_id: newStatusId,
        status: newStatus.name, // Keep display status in sync
      };
      
      if (isClosing) {
        updateData.closed_by_user_id = user.id;
        updateData.closed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("cases")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
      
      // Log activity
      const oldStatus = oldStatusId ? getStatusById(oldStatusId) : null;
      const activityDescription = isClosing 
        ? `Case closed by ${userName}`
        : `Status changed from "${oldStatus?.name || 'Unknown'}" to "${newStatus.name}" by ${userName}`;
      
      await supabase.from("case_activities").insert({
        case_id: id,
        user_id: user.id,
        activity_type: "Status Change",
        title: isClosing ? "Case Closed" : "Status Changed",
        description: activityDescription,
        status: "completed"
      });
      
      await NotificationHelpers.caseStatusChanged(caseData.case_number, newStatus.name, id!);
      
      // Confirm the update
      setCaseData(prev => prev ? {
        ...prev,
        current_status_id: newStatusId,
        current_category_id: newStatus.category_id,
        status: newStatus.name,
        status_entered_at: new Date().toISOString(),
        ...(isClosing ? {
          closed_by_user_id: user.id,
          closed_at: new Date().toISOString()
        } : {})
      } : null);
      
      return true;
    } catch (error) {
      console.error("Error updating status:", error);
      setCaseData(previousCaseData);
      toast({
        title: "Error",
        description: "Failed to update case status. Change reverted.",
        variant: "destructive"
      });
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  const handleStatusChange = async (newStatusKey: string): Promise<boolean> => {
    if (!caseData) return false;
    const oldStatusKey = caseData.status_key;
    if (oldStatusKey === newStatusKey) return true;
    const previousCaseData = { ...caseData };
    
    const newStatusItem = getStatusByKey(newStatusKey);
    const isClosing = newStatusItem?.status_type === 'closed';
    const oldStatusItem = oldStatusKey ? getStatusByKey(oldStatusKey) : null;
    const wasOpen = oldStatusItem?.status_type === 'open';
    
    // Get display name for the new status
    const displayName = newStatusItem?.display_name || newStatusKey;
    
    setCaseData({
      ...caseData,
      status: displayName, // Update display status for backward compat
      status_key: newStatusKey,
      ...(isClosing && wasOpen ? {
        closed_by_user_id: "pending",
        closed_at: new Date().toISOString()
      } : {})
    });
    toast({
      title: "Status updated",
      description: isClosing && wasOpen ? "Case closed" : `Status changed to ${displayName}`
    });
    setUpdatingStatus(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const {
        data: profile
      } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const userName = profile?.full_name || user.email || "Unknown User";
      const updateData: any = {
        status: displayName, // Keep display name in status for backward compat
        status_key: newStatusKey
      };
      if (isClosing && wasOpen) {
        updateData.closed_by_user_id = user.id;
        updateData.closed_at = new Date().toISOString();
      }
      const {
        error
      } = await supabase.from("cases").update(updateData).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      let activityDescription = `Status changed from "${oldStatusItem?.display_name || oldStatusKey}" to "${displayName}" by ${userName}`;
      if (isClosing && wasOpen) {
        activityDescription = `Case closed by ${userName}`;
      }
      const {
        error: activityError
      } = await supabase.from("case_activities").insert({
        case_id: id,
        user_id: user.id,
        activity_type: "Status Change",
        title: isClosing && wasOpen ? "Case Closed" : "Status Changed",
        description: activityDescription,
        status: "completed"
      });
      if (activityError) {
        console.error("Error creating activity log:", activityError);
      }
      await NotificationHelpers.caseStatusChanged(caseData.case_number, displayName, id!);
      setCaseData(prev => prev ? {
        ...prev,
        status: displayName,
        status_key: newStatusKey,
        ...(isClosing && wasOpen ? {
          closed_by_user_id: user.id,
          closed_at: new Date().toISOString()
        } : {})
      } : null);
      return true;
    } catch (error) {
      console.error("Error updating status:", error);
      setCaseData(previousCaseData);
      toast({
        title: "Error",
        description: "Failed to update case status. Change reverted.",
        variant: "destructive"
      });
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  };
  const handleReopenCase = async () => {
    if (!caseData) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Check if reopen is allowed using the transition engine
      const reopenCheck = await checkCanReopen(caseData.id);
      if (!reopenCheck.valid) {
        toast({
          title: "Cannot Reopen",
          description: reopenCheck.reason || "This case cannot be reopened.",
          variant: "destructive"
        });
        setReopenDialogOpen(false);
        return;
      }
      
      const {
        data: profile
      } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const userName = profile?.full_name || user.email || "Unknown User";
      
      // Get the case workflow and find the first "Open" category status
      const caseWorkflow = caseData.workflow || "standard";
      const firstOpenStatus = getFirstOpenStatus(caseWorkflow);
      
      // Fall back to legacy if new system doesn't have an open status
      let openStatusName: string;
      let openStatusKey: string | null = null;
      let openStatusId: string | null = null;
      let openCategoryId: string | null = null;
      
      if (firstOpenStatus) {
        openStatusName = firstOpenStatus.name;
        openStatusId = firstOpenStatus.id;
        openCategoryId = firstOpenStatus.category_id;
      } else {
        // Legacy fallback
        const legacyOpenStatus = executionStatuses.find(s => s.status_type === "open");
        if (!legacyOpenStatus) {
          toast({
            title: "Error",
            description: "No open status available. Please configure an open status first.",
            variant: "destructive"
          });
          return;
        }
        openStatusName = legacyOpenStatus.display_name;
        openStatusKey = legacyOpenStatus.status_key;
      }
      
      const rootCaseId = caseData.parent_case_id || caseData.id;
      const {
        data: relatedCases
      } = await supabase.rpc("get_related_cases", {
        case_id: caseData.id
      });
      const maxInstance = relatedCases ? Math.max(...relatedCases.map((c: any) => c.instance_number)) : caseData.instance_number;
      const newInstanceNumber = maxInstance + 1;
      let baseCaseNumber = caseData.case_number;
      if (caseData.parent_case_id) {
        const {
          data: rootCase
        } = await supabase.from("cases").select("case_number").eq("id", rootCaseId).single();
        if (rootCase) {
          baseCaseNumber = rootCase.case_number;
        }
      }
      const instanceSuffix = String(newInstanceNumber - 1).padStart(2, "0");
      const newCaseNumber = `${baseCaseNumber}-${instanceSuffix}`;
      const {
        data: subjects
      } = await supabase.from("case_subjects").select("*").eq("case_id", caseData.id);
      
      // Create new case with proper status system fields
      const newCaseData: Record<string, unknown> = {
        case_number: newCaseNumber,
        title: caseData.title,
        description: caseData.description,
        status: openStatusName,
        account_id: caseData.account_id,
        contact_id: caseData.contact_id,
        case_manager_id: caseData.case_manager_id,
        investigator_ids: caseData.investigator_ids,
        parent_case_id: rootCaseId, // Links as case_series_id
        instance_number: newInstanceNumber,
        user_id: user.id,
        workflow: caseWorkflow, // Preserve workflow
      };
      
      // Set new status system fields if available
      if (openStatusId) {
        newCaseData.current_status_id = openStatusId;
        newCaseData.current_category_id = openCategoryId;
      }
      if (openStatusKey) {
        newCaseData.status_key = openStatusKey;
      }
      
      const {
        data: newCase,
        error: caseError
      } = await supabase.from("cases").insert(newCaseData as any).select().single();
      if (caseError) throw caseError;
      if (subjects && subjects.length > 0) {
        const subjectsToInsert = subjects.map(subject => ({
          case_id: newCase.id,
          subject_type: subject.subject_type,
          name: subject.name,
          details: subject.details,
          notes: subject.notes,
          profile_image_url: subject.profile_image_url,
          user_id: user.id,
          organization_id: subject.organization_id
        }));
        const {
          error: subjectsError
        } = await supabase.from("case_subjects").insert(subjectsToInsert);
        if (subjectsError) {
          console.error("Error copying subjects:", subjectsError);
        }
      }
      await supabase.from("case_activities").insert({
        case_id: caseData.id,
        user_id: user.id,
        activity_type: "Status Change",
        title: "Case Reopened",
        description: `Case reopened as new instance ${newCaseNumber} by ${userName}`,
        status: "completed"
      });
      await supabase.from("case_activities").insert({
        case_id: newCase.id,
        user_id: user.id,
        activity_type: "Status Change",
        title: "Case Instance Created",
        description: `New case instance created from ${caseData.case_number} by ${userName}`,
        status: "completed"
      });
      await NotificationHelpers.caseStatusChanged(newCaseNumber, openStatusName, newCase.id);
      toast({
        title: "Success",
        description: `Case reopened as ${newCaseNumber}`
      });
      navigate(`/cases/${newCase.id}`);
    } catch (error) {
      console.error("Error reopening case:", error);
      toast({
        title: "Error",
        description: "Failed to reopen case",
        variant: "destructive"
      });
    }
  };
  const handleDelete = async () => {
    if (!caseData) return;
    if (!confirm(`Are you sure you want to delete case "${caseData.title}"? This action cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const {
        error
      } = await supabase.from("cases").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Case deleted successfully"
      });
      navigate("/cases");
    } catch (error) {
      console.error("Error deleting case:", error);
      toast({
        title: "Error",
        description: "Failed to delete case",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };
  if (loading) {
    return <CaseDetailSkeleton />;
  }
  if (!caseData) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground">Case not found</p>
        <Button asChild className="mt-4">
          <Link to="/cases">Back to Cases</Link>
        </Button>
      </div>;
  }
  const isClosed = isClosedCase();

  // Info item helper component - always shows the field, with placeholder when empty
  const InfoItem = ({
    label,
    value,
    className = ""
  }: {
    label: string;
    value: string | undefined | null;
    className?: string;
  }) => {
    return <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${value ? className : 'text-muted-foreground/60'}`}>
          {value || "—"}
        </p>
      </div>;
  };
  return <div className="space-y-4 sm:space-y-6">
      <FirstTimeGuidance
        guidanceKey="case-detail-welcome"
        title="Case Detail"
        welcome="You're inside a case. The tabs above organize everything - subjects, updates, finances, and more."
        whatToDoFirst="Add a subject or create your first update to start documenting."
        whatNotToWorryAbout="Budget warnings and invoicing matter later. Focus on the investigation first."
      />
      {isVendor && <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <span className="font-medium">Vendor Access</span>
              <span className="text-muted-foreground"> — You're viewing this case as an external contractor.</span>
              <div className="mt-2 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>✓ View case details</span>
                  <span>✓ Submit updates</span>
                  <span>✓ Upload attachments</span>
                </div>
                <div className="mt-1 text-xs">
                  Client contact and billing details are restricted to protect confidentiality.
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>}

      {isClosed && <Alert className="bg-muted/50 border-muted">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">This case is closed.</span>
                {caseData.closed_by_user_id && caseData.closed_at && <span className="text-sm text-muted-foreground">
                    Closed on {new Date(caseData.closed_at).toLocaleDateString()} at {new Date(caseData.closed_at).toLocaleTimeString()}
                  </span>}
              </div>
              {(isAdmin || isManager) && <Button variant="outline" size="sm" onClick={() => setReopenDialogOpen(true)} className="self-start sm:self-auto">
                  Reopen Case
                </Button>}
            </div>
          </AlertDescription>
        </Alert>}
      
      {/* Lifecycle Banner */}
      <CaseLifecycleBanner 
        statusKey={caseData.status_key || caseData.status?.toLowerCase().replace(/\s+/g, '_') || null}
        phase="execution"
      />

      {/* Header */}
      <div className="flex items-start gap-3 md:gap-4 min-w-0">
        {/* Back button + Title row */}
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
            <Link to="/cases">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 title={caseData.title} className="">
              {caseData.title}
            </h1>
            <p className="">
              {caseData.case_number}
            </p>
          </div>
        </div>
        
        {/* Status + Actions - break under title until lg, then sit to the right */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Status Navigation - Prev/Next buttons + Status Dropdown (only if user can view exact status) */}
          {!isVendor && canViewExactStatus && (
            <div className="flex items-center gap-1">
              {/* Prev Status Button */}
              <DelayedTooltip
                content={
                  !caseData.current_status_id || !getPrevStatus(caseData.current_status_id)
                    ? "Already at first status in this phase"
                    : "Move to previous status in workflow"
                }
                side="bottom"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2"
                  disabled={updatingStatus || statusesLoading || !caseData.current_status_id || !getPrevStatus(caseData.current_status_id)}
                  onClick={() => {
                    if (caseData.current_status_id) {
                      const prev = getPrevStatus(caseData.current_status_id);
                      if (prev) handleNewStatusChange(prev.id);
                    }
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </DelayedTooltip>

              {/* Status Dropdown - Using new canonical status system */}
              <DelayedTooltip
                content="Current case status - affects workflow, reporting, and visibility"
                side="bottom"
              >
                <div>
                  <Select 
                    value={caseData.current_status_id || ''} 
                    onValueChange={handleNewStatusChange} 
                    disabled={updatingStatus || statusesLoading}
                  >
                    <SelectTrigger 
                      className="w-[140px] h-9 text-sm border" 
                      style={getCurrentStatusStyle()}
                    >
                      <SelectValue placeholder="Select status">
                        {getCurrentStatusDisplayName()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <div key={category.id}>
                          <DelayedTooltip
                            content={
                              category.name.toLowerCase().includes('intake') 
                                ? "Initial assessment and setup statuses"
                                : category.name.toLowerCase().includes('execution') || category.name.toLowerCase().includes('active')
                                ? "Active investigation and work statuses"
                                : category.name.toLowerCase().includes('closed') || category.name.toLowerCase().includes('complete')
                                ? "Completed or cancelled case statuses"
                                : `${category.name} workflow statuses`
                            }
                            side="left"
                          >
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                              {category.name}
                            </div>
                          </DelayedTooltip>
                          {activeStatuses
                            .filter(s => s.category_id === category.id)
                            .sort((a, b) => a.rank_order - b.rank_order)
                            .map(status => (
                              <SelectItem key={status.id} value={status.id}>
                                <span className="flex items-center gap-2">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                                    style={{ backgroundColor: status.color || '#9ca3af' }} 
                                  />
                                  {status.name}
                                </span>
                              </SelectItem>
                            ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </DelayedTooltip>

              {/* Next Status Button */}
              <DelayedTooltip
                content={
                  !caseData.current_status_id || !getNextStatus(caseData.current_status_id)
                    ? "Already at final status in this phase"
                    : "Move to next status in workflow"
                }
                side="bottom"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2"
                  disabled={updatingStatus || statusesLoading || !caseData.current_status_id || !getNextStatus(caseData.current_status_id)}
                  onClick={() => {
                    if (caseData.current_status_id) {
                      const next = getNextStatus(caseData.current_status_id);
                      if (next) handleNewStatusChange(next.id);
                    }
                  }}
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </DelayedTooltip>

              {/* Status History Button */}
              <DelayedTooltip
                content="View complete status history with timestamps and durations"
                side="bottom"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setStatusHistoryModalOpen(true)}
                >
                  <History className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </DelayedTooltip>
            </div>
          )}
          
          {/* Category-only status badge (when user cannot view exact status) */}
          {!isVendor && !canViewExactStatus && (
            <Badge className="border" style={getCurrentStatusStyle()}>
              {getCurrentStatusDisplayName()}
            </Badge>
          )}
          
          {/* Vendor Status Badge */}
          {isVendor && (
            <Badge className="border" style={getCurrentStatusStyle()}>
              {getCurrentStatusDisplayName()}
            </Badge>
          )}
          
          {/* Action Menu */}
          {!isVendor && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isManager && <DropdownMenuItem onClick={() => setSummaryPdfDialogOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Summary PDF
                  </DropdownMenuItem>}
                <DropdownMenuItem onClick={() => setEmailComposerOpen(true)} disabled={isClosed}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                {hasPermission('edit_cases') && <DropdownMenuItem onClick={() => setEditFormOpen(true)} disabled={isClosed}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Case
                  </DropdownMenuItem>}
                {hasPermission('delete_cases') && <DropdownMenuItem onClick={handleDelete} disabled={deleting} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleting ? "Deleting..." : "Delete Case"}
                  </DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>}
        </div>
      </div>

      {/* Tabs with sidebar navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar navigation */}
          <div className="w-full md:w-56 shrink-0">
            <div className="md:sticky md:top-6">
              <CaseDetailNav currentTab={activeTab} onTabChange={handleTabChange} isVendor={isVendor} hasReportsPermission={hasPermission('view_reports')} />
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1 min-w-0">
            {/* Info Tab */}
            {!isVendor && <TabsContent value="info" className="mt-0">
                <div className="space-y-4 sm:space-y-6">
                  {/* Case Details Card - Always full width */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Case Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {caseData.description && <div>
                          <p className="text-xs text-muted-foreground mb-1">Case Objective</p>
                          <p className="text-sm">{caseData.description}</p>
                        </div>}
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
                        {/* Case Type - always show */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Case Type</p>
                          {caseType ? <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                          backgroundColor: caseType.color || '#9ca3af'
                        }} />
                              <span className="text-sm font-medium">{caseType.name}</span>
                              <Badge variant="outline" className="text-xs px-1.5 py-0 ml-1">
                                {caseType.tag}
                              </Badge>
                            </div> : <p className="text-sm font-medium text-muted-foreground/60">—</p>}
                        </div>
                        {/* Reference Numbers - Dynamic based on Case Type */}
                        {(caseType?.reference_label_1 || !caseType) && <InfoItem label={caseType?.reference_label_1 || "Reference No."} value={caseData.reference_number} />}
                        {caseType?.reference_label_2 && <InfoItem label={caseType.reference_label_2} value={caseData.reference_number_2} />}
                        {caseType?.reference_label_3 && <InfoItem label={caseType.reference_label_3} value={caseData.reference_number_3} />}
                        <InfoItem label="Due Date" value={caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : null} className="text-destructive" />
                        <InfoItem label="Created" value={caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : null} />
                        {isClosed && <InfoItem label="Closed" value={caseData.closed_at ? new Date(caseData.closed_at).toLocaleDateString() : null} className="text-muted-foreground" />}
                      </div>
                      
                      {/* Services Section - always show */}
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Services</p>
                        {serviceInstances.length > 0 ? <div className="flex flex-wrap gap-2">
                            {serviceInstances.map(instance => <Badge key={instance.id} variant="secondary" className="text-xs">
                                {instance.service_name}
                                {instance.service_code && <span className="text-muted-foreground ml-1">({instance.service_code})</span>}
                              </Badge>)}
                          </div> : <p className="text-sm text-muted-foreground/60">No services assigned</p>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Three-column grid for Client, Team, and Budget */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {/* Client Column */}
                    <ClientInfoSection caseId={id!} account={account ? {
                  id: account.id,
                  name: account.name,
                  status: account.status,
                  industry: account.industry,
                  phone: account.phone,
                  email: account.email
                } : null} contact={contact ? {
                  id: contact.id,
                  first_name: contact.first_name,
                  last_name: contact.last_name,
                  status: contact.status,
                  role: contact.role,
                  phone: contact.phone,
                  email: contact.email
                } : null} accountName={account?.name} onUpdate={fetchCaseData} />

                    {/* Team + Related Cases Column */}
                    <div className="space-y-4">
                      <CaseTeamManager caseId={id!} caseManagerId={caseData.case_manager_id} caseManager2Id={caseData.case_manager_2_id} onUpdate={fetchCaseData} />
                      {caseData.source_request_id && <SourceRequestCard sourceRequestId={caseData.source_request_id} />}
                      <RelatedCases caseId={id!} currentInstanceNumber={caseData.instance_number} />
                    </div>

                    {/* Budget + Retainer Column */}
                    <div className="space-y-4">
                      {organization?.id && <BudgetStatusCard caseId={id!} organizationId={organization.id} refreshKey={budgetRefreshKey} onViewHistory={handleViewBudgetHistory} />}
                      {organization?.id && <RetainerFundsWidget caseId={id!} organizationId={organization.id} />}
                    </div>
                  </div>
                </div>
              </TabsContent>}

            {/* Budget Tab */}
            {!isVendor && <TabsContent value="budget" className="mt-0">
                <div ref={budgetTabRef} className="space-y-6 scroll-mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BudgetSummary caseId={id!} refreshKey={budgetRefreshKey} onAdjustmentSuccess={() => setBudgetRefreshKey(k => k + 1)} />
                    <BudgetConsumptionSnapshot caseId={id!} refreshKey={budgetRefreshKey} />
                  </div>
                  <BudgetAdjustmentsHistory caseId={id!} refreshKey={budgetRefreshKey} highlight={highlightHistory} />
                </div>
              </TabsContent>}

            {/* Subjects Tab */}
            {!isVendor && <TabsContent value="subjects" className="mt-0">
                <SubjectsTab caseId={id!} caseTypeId={caseData?.case_type_id} isClosedCase={isClosed} />
              </TabsContent>}

            {/* Updates Tab */}
            <TabsContent value="updates" className="mt-0">
              <CaseUpdates caseId={id!} caseStatusKey={caseData?.status_key} />
            </TabsContent>

            {/* Activities Tab */}
            {!isVendor && <TabsContent value="activities" className="mt-0">
                <CaseActivities caseId={id!} isClosedCase={isClosed} caseStatusKey={caseData?.status_key} />
              </TabsContent>}

            {/* Calendar Tab */}
            {!isVendor && <TabsContent value="calendar" className="mt-0">
                <CaseCalendar caseId={id!} isClosedCase={isClosed} />
              </TabsContent>}

            {/* Finances Tab */}
            {!isVendor && <TabsContent value="finances" className="mt-0">
                <CaseFinances caseId={id!} isClosedCase={isClosed} caseStatusKey={caseData?.status_key} />
              </TabsContent>}


            {/* Attachments Tab */}
            <TabsContent value="attachments" className="mt-0">
              <CaseAttachments caseId={id!} isClosedCase={isClosed} caseStatusKey={caseData?.status_key} />
            </TabsContent>

            {/* Timeline Tab */}
            {!isVendor && <TabsContent value="timeline" className="mt-0">
                <CaseTimeline caseId={id!} />
              </TabsContent>}

            {/* Reports Tab */}
            {!isVendor && hasPermission('view_reports') && <TabsContent value="reports" className="mt-0">
                <CaseReports key={reportsRefreshKey} caseId={id!} isClosedCase={isClosed} onGenerateReport={() => setReportDialogOpen(true)} />
              </TabsContent>}
          </div>
        </div>
      </Tabs>

      <CaseForm open={editFormOpen} onOpenChange={setEditFormOpen} onSuccess={fetchCaseData} editingCase={caseData || undefined} />
      
      <EmailComposer open={emailComposerOpen} onOpenChange={setEmailComposerOpen} defaultTo={contact?.first_name && contact?.last_name ? `${contact.first_name} ${contact.last_name}` : undefined} defaultSubject={`Update on Case: ${caseData?.title}`} caseId={id} />
      
      {caseData && <GenerateReportDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} caseId={id!} caseData={{
      title: caseData.title,
      case_number: caseData.case_number,
      case_manager_id: caseData.case_manager_id
    }} onSuccess={() => setReportsRefreshKey(prev => prev + 1)} />}
      
      <ConfirmationDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen} title="Reopen Case" description={`Reopening this case will create a new instance with case number ${caseData?.case_number}-${String(caseData?.instance_number || 1).padStart(2, "0")}. All subjects will be copied to the new instance. Continue?`} confirmLabel="Reopen Case" cancelLabel="Cancel" onConfirm={handleReopenCase} variant="default" />

      <CaseSummaryPdfDialog open={summaryPdfDialogOpen} onOpenChange={setSummaryPdfDialogOpen} caseId={id!} caseNumber={caseData?.case_number || ""} />

      <CaseStatusHistoryModal 
        caseId={id!} 
        open={statusHistoryModalOpen} 
        onOpenChange={setStatusHistoryModalOpen} 
      />
    </div>;
};
export default CaseDetail;
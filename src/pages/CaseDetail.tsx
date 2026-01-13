import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CaseDetailNav } from "@/components/case-detail/CaseDetailNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Edit, Trash2, Info, MoreVertical, Mail, FileText, Briefcase, Calendar, Users, Paperclip, ClipboardList, DollarSign, Clock, FilePenLine } from "lucide-react";
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
import { BudgetSummary } from "@/components/case-detail/BudgetSummary";
import { CaseServicesPanel } from "@/components/case-detail/CaseServicesPanel";
import { BudgetAdjustmentForm } from "@/components/case-detail/BudgetAdjustmentForm";
import { BudgetAdjustmentsHistory } from "@/components/case-detail/BudgetAdjustmentsHistory";
import { BudgetConsumptionSnapshot } from "@/components/case-detail/BudgetConsumptionSnapshot";
import { CaseBudgetWidget } from "@/components/case-detail/CaseBudgetWidget";
import { GenerateReportDialog } from "@/components/templates/GenerateReportDialog";
import { CaseSummaryPdfDialog } from "@/components/case-detail/CaseSummaryPdfDialog";
import { CaseReports } from "@/components/case-detail/CaseReports";
import { CaseTimeline } from "@/components/case-detail/CaseTimeline";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { getStatusStyleFromPicklist, isClosedStatus } from "@/lib/statusUtils";

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
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

interface CaseManager {
  id: string;
  full_name: string | null;
  email: string;
}

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { isVendor, isAdmin, isManager } = useUserRole();
  const { hasPermission } = usePermissions();
  const { organization } = useOrganization();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [caseManager, setCaseManager] = useState<CaseManager | null>(null);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [caseStatuses, setCaseStatuses] = useState<Array<{
    id: string;
    value: string;
    color: string;
    status_type?: string;
  }>>([]);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  
  const validTabs = ['info', 'budget', 'subjects', 'updates', 'activities', 'calendar', 'finances', 'attachments', 'timeline', 'reports'];
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
    setSearchParams({ tab: newTab }, { replace: true });
  };
  const [highlightHistory, setHighlightHistory] = useState(false);
  const budgetTabRef = useRef<HTMLDivElement>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [summaryPdfDialogOpen, setSummaryPdfDialogOpen] = useState(false);
  const [updates, setUpdates] = useState<Array<{ id: string; title: string; description: string | null; created_at: string; update_type: string; user_id: string }>>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, { id: string; full_name: string; email: string }>>({});

  // Set breadcrumbs based on case data
  useSetBreadcrumbs(
    caseData
      ? [
          { label: "Cases", href: "/cases" },
          { label: caseData.case_number || caseData.title },
        ]
      : [{ label: "Cases", href: "/cases" }]
  );

  const handleViewBudgetHistory = () => {
    setActiveTab("budget");
    setHighlightHistory(true);
    setTimeout(() => {
      budgetTabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => setHighlightHistory(false), 2000);
    }, 100);
  };

  const fetchUpdatesForReport = async () => {
    const { data } = await supabase
      .from("case_updates")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false });
    setUpdates(data || []);
  };

  const fetchUserProfilesForReport = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email");
    const profiles: Record<string, { id: string; full_name: string; email: string }> = {};
    (data || []).forEach(p => { profiles[p.id] = p; });
    setUserProfiles(profiles);
  };

  useEffect(() => {
    fetchCaseData();
    fetchCaseStatuses();
    fetchUpdatesForReport();
    fetchUserProfilesForReport();
  }, [id]);

  const fetchCaseStatuses = async () => {
    try {
      const { getCurrentUserOrganizationId } = await import("@/lib/organizationHelpers");
      const organizationId = await getCurrentUserOrganizationId();
      
      const { data } = await supabase.from("picklists").select("id, value, color, status_type").eq("type", "case_status").eq("is_active", true).or(`organization_id.eq.${organizationId},organization_id.is.null`).order("display_order");
      if (data) {
        setCaseStatuses(data);
      }
    } catch (error) {
      console.error("Error fetching case statuses:", error);
    }
  };

  const fetchCaseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userOrgs } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);
      
      const userOrgIds = userOrgs?.map(o => o.organization_id) || [];

      const { data, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
      
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

      const hasAccess = 
        data.user_id === user.id || 
        data.investigator_ids?.includes(user.id) ||
        (data.organization_id && userOrgIds.includes(data.organization_id));
      
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
        const { data: accountData } = await supabase.from("accounts").select("id, name").eq("id", data.account_id).maybeSingle();
        if (accountData) setAccount(accountData);
      }

      if (data.contact_id) {
        const { data: contactData } = await supabase.from("contacts").select("id, first_name, last_name").eq("id", data.contact_id).maybeSingle();
        if (contactData) setContact(contactData);
      }

      if (data.case_manager_id) {
        const { data: managerData } = await supabase.from("profiles").select("id, full_name, email").eq("id", data.case_manager_id).maybeSingle();
        if (managerData) setCaseManager(managerData);
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

  const getStatusColor = (status: string) => {
    const statusItem = caseStatuses.find(s => s.value === status);
    if (statusItem?.color) {
      return `border`;
    }
    return "bg-muted";
  };

  const getStatusStyle = (status: string) => getStatusStyleFromPicklist(status, caseStatuses);

  const isClosedCase = () => {
    if (!caseData) return false;
    return isClosedStatus(caseData.status, caseStatuses);
  };

  const handleStatusChange = async (newStatus: string): Promise<boolean> => {
    if (!caseData) return false;

    const oldStatus = caseData.status;
    if (oldStatus === newStatus) return true;
    
    const previousCaseData = { ...caseData };
    
    const newStatusItem = caseStatuses.find(s => s.value === newStatus);
    const isClosing = newStatusItem?.status_type === 'closed';
    const oldStatusItem = caseStatuses.find(s => s.value === oldStatus);
    const wasOpen = oldStatusItem?.status_type === 'open';
    
    setCaseData({
      ...caseData,
      status: newStatus,
      ...(isClosing && wasOpen ? {
        closed_by_user_id: "pending",
        closed_at: new Date().toISOString()
      } : {})
    });
    
    toast({
      title: "Status updated",
      description: isClosing && wasOpen ? "Case closed" : `Status changed to ${newStatus}`
    });
    
    setUpdatingStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const userName = profile?.full_name || user.email || "Unknown User";

      const updateData: any = { status: newStatus };

      if (isClosing && wasOpen) {
        updateData.closed_by_user_id = user.id;
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase.from("cases").update(updateData).eq("id", id).eq("user_id", user.id);
      if (error) throw error;

      let activityDescription = `Status changed from "${oldStatus}" to "${newStatus}" by ${userName}`;
      if (isClosing && wasOpen) {
        activityDescription = `Case closed by ${userName}`;
      }
      const { error: activityError } = await supabase.from("case_activities").insert({
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

      await NotificationHelpers.caseStatusChanged(caseData.case_number, newStatus, id!);

      setCaseData(prev => prev ? {
        ...prev,
        status: newStatus,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: existingReopen } = await supabase
        .from("cases")
        .select("id")
        .eq("parent_case_id", caseData.id)
        .maybeSingle();

      if (existingReopen) {
        toast({
          title: "Cannot Reopen",
          description: "This case has already been reopened. You cannot reopen the same case multiple times.",
          variant: "destructive",
        });
        setReopenDialogOpen(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      const userName = profile?.full_name || user.email || "Unknown User";

      const openStatus = caseStatuses.find((s) => s.status_type === "open");
      if (!openStatus) {
        toast({
          title: "Error",
          description: "No open status available. Please configure an open status first.",
          variant: "destructive",
        });
        return;
      }

      const rootCaseId = caseData.parent_case_id || caseData.id;

      const { data: relatedCases } = await supabase.rpc("get_related_cases", {
        case_id: caseData.id,
      });

      const maxInstance = relatedCases
        ? Math.max(...relatedCases.map((c: any) => c.instance_number))
        : caseData.instance_number;
      const newInstanceNumber = maxInstance + 1;

      let baseCaseNumber = caseData.case_number;
      if (caseData.parent_case_id) {
        const { data: rootCase } = await supabase
          .from("cases")
          .select("case_number")
          .eq("id", rootCaseId)
          .single();
        if (rootCase) {
          baseCaseNumber = rootCase.case_number;
        }
      }
      
      const instanceSuffix = String(newInstanceNumber - 1).padStart(2, "0");
      const newCaseNumber = `${baseCaseNumber}-${instanceSuffix}`;

      const { data: subjects } = await supabase
        .from("case_subjects")
        .select("*")
        .eq("case_id", caseData.id);

      const { data: newCase, error: caseError } = await supabase
        .from("cases")
        .insert({
          case_number: newCaseNumber,
          title: caseData.title,
          description: caseData.description,
          status: openStatus.value,
          account_id: caseData.account_id,
          contact_id: caseData.contact_id,
          case_manager_id: caseData.case_manager_id,
          investigator_ids: caseData.investigator_ids,
          parent_case_id: rootCaseId,
          instance_number: newInstanceNumber,
          user_id: user.id,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      if (subjects && subjects.length > 0) {
        const subjectsToInsert = subjects.map((subject) => ({
          case_id: newCase.id,
          subject_type: subject.subject_type,
          name: subject.name,
          details: subject.details,
          notes: subject.notes,
          profile_image_url: subject.profile_image_url,
          user_id: user.id,
          organization_id: subject.organization_id,
        }));

        const { error: subjectsError } = await supabase
          .from("case_subjects")
          .insert(subjectsToInsert);

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
        status: "completed",
      });

      await supabase.from("case_activities").insert({
        case_id: newCase.id,
        user_id: user.id,
        activity_type: "Status Change",
        title: "Case Instance Created",
        description: `New case instance created from ${caseData.case_number} by ${userName}`,
        status: "completed",
      });

      await NotificationHelpers.caseStatusChanged(
        newCaseNumber,
        openStatus.value,
        newCase.id
      );

      toast({
        title: "Success",
        description: `Case reopened as ${newCaseNumber}`,
      });

      navigate(`/cases/${newCase.id}`);
    } catch (error) {
      console.error("Error reopening case:", error);
      toast({
        title: "Error",
        description: "Failed to reopen case",
        variant: "destructive",
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase.from("cases").delete().eq("id", id).eq("user_id", user.id);
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
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Case not found</p>
        <Button asChild className="mt-4">
          <Link to="/cases">Back to Cases</Link>
        </Button>
      </div>
    );
  }

  const isClosed = isClosedCase();

  // Info item helper component
  const InfoItem = ({ label, value, className = "" }: { label: string; value: string | undefined | null; className?: string }) => {
    if (!value) return null;
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${className}`}>{value}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {isVendor && (
        <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Vendor Access - You can view case details and submit updates. Contact and account information is restricted.
          </AlertDescription>
        </Alert>
      )}

      {isClosed && (
        <Alert className="bg-muted/50 border-muted">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">This case is closed.</span>
                {caseData.closed_by_user_id && caseData.closed_at && (
                  <span className="text-sm text-muted-foreground">
                    Closed on {new Date(caseData.closed_at).toLocaleDateString()} at {new Date(caseData.closed_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {(isAdmin || isManager) && (
                <Button variant="outline" size="sm" onClick={() => setReopenDialogOpen(true)} className="self-start sm:self-auto">
                  Reopen Case
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
          <Link to="/cases">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        
        <div className="flex-1 min-w-0">
          <h1 className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate md:whitespace-normal md:overflow-visible leading-tight ${isClosed ? 'text-muted-foreground' : ''}`} title={caseData.title}>
            {caseData.title}
          </h1>
          <p className={`text-xs mt-0.5 font-medium ${isClosed ? 'text-muted-foreground' : 'text-primary'}`}>
            {caseData.case_number}
          </p>
        </div>
        
        {/* Status + Actions Group */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Dropdown */}
          {!isVendor && (
            <Select value={caseData.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
              <SelectTrigger className={`w-[120px] sm:w-[140px] h-9 text-sm ${getStatusColor(caseData.status)}`} style={getStatusStyle(caseData.status)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {caseStatuses.map(status => (
                  <SelectItem key={status.id} value={status.value}>
                    <span className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: status.color || '#9ca3af' }}
                      />
                      {status.value.charAt(0).toUpperCase() + status.value.slice(1)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Vendor Status Badge */}
          {isVendor && (
            <Badge className="border" style={getStatusStyle(caseData.status)}>
              {caseData.status}
            </Badge>
          )}
          
          {/* Desktop Action Buttons */}
          {!isVendor && !isMobile && (
            <div className="flex items-center gap-2">
              {isManager && (
                <Button variant="outline" className="h-9 px-3" onClick={() => setSummaryPdfDialogOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Summary PDF
                </Button>
              )}
              <Button variant="outline" className="h-9 px-3" onClick={() => setEmailComposerOpen(true)} disabled={isClosed}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              {hasPermission('edit_cases') && (
                <Button variant="outline" className="h-9 px-3" onClick={() => setEditFormOpen(true)} disabled={isClosed}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {hasPermission('delete_cases') && (
                <Button variant="outline" className="h-9 px-3 text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          )}
          
          {/* Mobile Action Menu */}
          {!isVendor && isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 h-9 w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isManager && (
                <DropdownMenuItem onClick={() => setSummaryPdfDialogOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Summary PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setEmailComposerOpen(true)} disabled={isClosed}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              {hasPermission('edit_cases') && (
                <DropdownMenuItem onClick={() => setEditFormOpen(true)} disabled={isClosed}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Case
                </DropdownMenuItem>
              )}
              {hasPermission('delete_cases') && (
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  disabled={deleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Deleting..." : "Delete Case"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tabs with sidebar navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar navigation */}
          <div className="w-full md:w-56 shrink-0">
            <div className="md:sticky md:top-6">
              <CaseDetailNav 
                currentTab={activeTab}
                onTabChange={handleTabChange}
                isVendor={isVendor}
                hasReportsPermission={hasPermission('view_reports')}
              />
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1 min-w-0">
            {/* Info Tab */}
            {!isVendor && (
              <TabsContent value="info" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
                  {/* Case Details Card */}
                  <div className="xl:col-span-1 lg:col-span-2 flex flex-col">
                    <Card className="flex-1">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Briefcase className="h-5 w-5" />
                          Case Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {caseData.description && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Case Objective</p>
                            <p className="text-sm">{caseData.description}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          <InfoItem label="Account" value={account?.name} />
                          <InfoItem label="Contact" value={contact ? `${contact.first_name} ${contact.last_name}` : null} />
                          <InfoItem label="Case Manager" value={caseManager?.full_name || caseManager?.email} />
                          <InfoItem label="Reference No." value={caseData.reference_number} />
                          <InfoItem label="Due Date" value={caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : null} className="text-destructive" />
                          <InfoItem label="Created" value={caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : null} />
                          {isClosed && caseData.closed_at && (
                            <InfoItem label="Closed" value={new Date(caseData.closed_at).toLocaleDateString()} className="text-muted-foreground" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Budget + Retainer Column */}
                  <div className="space-y-4 flex flex-col">
                    <CaseBudgetWidget 
                      caseId={id!} 
                      refreshKey={budgetRefreshKey}
                      onAdjustmentSuccess={() => setBudgetRefreshKey(k => k + 1)}
                      onViewHistory={handleViewBudgetHistory}
                    />
                    {organization?.id && <RetainerFundsWidget caseId={id!} organizationId={organization.id} />}
                  </div>

                  {/* Team + Services + Related Cases Column */}
                  <div className="space-y-4">
                    <CaseTeamManager 
                      caseId={id!} 
                      caseManagerId={caseData.case_manager_id}
                      caseManager2Id={caseData.case_manager_2_id}
                      investigatorIds={caseData.investigator_ids || []} 
                      onUpdate={fetchCaseData} 
                    />
                    <CaseServicesPanel 
                      caseId={id!} 
                      isClosedCase={isClosed} 
                    />
                    <RelatedCases caseId={id!} currentInstanceNumber={caseData.instance_number} />
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Budget Tab */}
            {!isVendor && (
              <TabsContent value="budget" className="mt-0">
                <div ref={budgetTabRef} className="space-y-6 scroll-mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BudgetSummary 
                      caseId={id!} 
                      refreshKey={budgetRefreshKey} 
                      onAdjustmentSuccess={() => setBudgetRefreshKey(k => k + 1)} 
                    />
                    <BudgetConsumptionSnapshot caseId={id!} refreshKey={budgetRefreshKey} />
                  </div>
                  <BudgetAdjustmentsHistory caseId={id!} refreshKey={budgetRefreshKey} highlight={highlightHistory} />
                </div>
              </TabsContent>
            )}

            {/* Subjects Tab */}
            {!isVendor && (
              <TabsContent value="subjects" className="mt-0">
                <SubjectsTab caseId={id!} isClosedCase={isClosed} />
              </TabsContent>
            )}

            {/* Updates Tab */}
            <TabsContent value="updates" className="mt-0">
              <CaseUpdates caseId={id!} isClosedCase={isClosed} />
            </TabsContent>

            {/* Activities Tab */}
            {!isVendor && (
              <TabsContent value="activities" className="mt-0">
                <CaseActivities caseId={id!} isClosedCase={isClosed} />
              </TabsContent>
            )}

            {/* Calendar Tab */}
            {!isVendor && (
              <TabsContent value="calendar" className="mt-0">
                <CaseCalendar caseId={id!} isClosedCase={isClosed} />
              </TabsContent>
            )}

            {/* Finances Tab */}
            {!isVendor && (
              <TabsContent value="finances" className="mt-0">
                <CaseFinances caseId={id!} isClosedCase={isClosed} />
              </TabsContent>
            )}

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="mt-0">
              <CaseAttachments caseId={id!} isClosedCase={isClosed} />
            </TabsContent>

            {/* Timeline Tab */}
            {!isVendor && (
              <TabsContent value="timeline" className="mt-0">
                <CaseTimeline caseId={id!} />
              </TabsContent>
            )}

            {/* Reports Tab */}
            {!isVendor && hasPermission('view_reports') && (
              <TabsContent value="reports" className="mt-0">
                <CaseReports 
                  key={reportsRefreshKey}
                  caseId={id!} 
                  isClosedCase={isClosed}
                  onGenerateReport={() => setReportDialogOpen(true)}
                />
              </TabsContent>
            )}
          </div>
        </div>
      </Tabs>

      <CaseForm open={editFormOpen} onOpenChange={setEditFormOpen} onSuccess={fetchCaseData} editingCase={caseData || undefined} />
      
      <EmailComposer open={emailComposerOpen} onOpenChange={setEmailComposerOpen} defaultTo={contact?.first_name && contact?.last_name ? `${contact.first_name} ${contact.last_name}` : undefined} defaultSubject={`Update on Case: ${caseData?.title}`} caseId={id} />
      
      {caseData && (
        <GenerateReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          caseId={id!}
          caseData={{
            title: caseData.title,
            case_number: caseData.case_number,
            case_manager_id: caseData.case_manager_id,
          }}
          onSuccess={() => setReportsRefreshKey(prev => prev + 1)}
        />
      )}
      
      <ConfirmationDialog
        open={reopenDialogOpen}
        onOpenChange={setReopenDialogOpen}
        title="Reopen Case"
        description={`Reopening this case will create a new instance with case number ${caseData?.case_number}-${String((caseData?.instance_number || 1)).padStart(2, "0")}. All subjects will be copied to the new instance. Continue?`}
        confirmLabel="Reopen Case"
        cancelLabel="Cancel"
        onConfirm={handleReopenCase}
        variant="default"
      />

      <CaseSummaryPdfDialog
        open={summaryPdfDialogOpen}
        onOpenChange={setSummaryPdfDialogOpen}
        caseId={id!}
        caseNumber={caseData?.case_number || ""}
      />
    </div>
  );
};

export default CaseDetail;

import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Edit, Trash2, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { CaseForm } from "@/components/CaseForm";
import { CaseSubjects } from "@/components/case-detail/CaseSubjects";
import { CaseUpdates } from "@/components/case-detail/CaseUpdates";
import { CaseActivities } from "@/components/case-detail/CaseActivities";
import { CaseFinances } from "@/components/case-detail/CaseFinances";
import { CaseAttachments } from "@/components/case-detail/CaseAttachments";
import { RetainerFundsWidget } from "@/components/case-detail/RetainerFundsWidget";
import { CaseCalendar } from "@/components/case-detail/CaseCalendar";
import { NotificationHelpers } from "@/lib/notifications";
import { CaseTeamManager } from "@/components/case-detail/CaseTeamManager";
import { EmailComposer } from "@/components/EmailComposer";
import { Mail } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  account_id: string | null;
  contact_id: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  case_manager_id: string | null;
  investigator_ids: string[];
  closed_by_user_id: string | null;
  closed_at: string | null;
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
const CaseDetail = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const { isVendor, isAdmin, isManager } = useUserRole();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
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
  useEffect(() => {
    fetchCaseData();
    fetchCaseStatuses();
  }, [id]);
  const fetchCaseStatuses = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data
      } = await supabase.from("picklists").select("id, value, color, status_type").eq("user_id", user.id).eq("type", "case_status").eq("is_active", true).order("display_order");
      if (data) {
        setCaseStatuses(data);
      }
    } catch (error) {
      console.error("Error fetching case statuses:", error);
    }
  };
  const fetchCaseData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from("cases").select("*").eq("id", id).eq("user_id", user.id).single();
      if (error) throw error;
      setCaseData(data);

      // Fetch account if exists
      if (data.account_id) {
        const {
          data: accountData
        } = await supabase.from("accounts").select("id, name").eq("id", data.account_id).single();
        if (accountData) setAccount(accountData);
      }

      // Fetch contact if exists
      if (data.contact_id) {
        const {
          data: contactData
        } = await supabase.from("contacts").select("id, first_name, last_name").eq("id", data.contact_id).single();
        if (contactData) setContact(contactData);
      }
    } catch (error) {
      console.error("Error fetching case:", error);
      toast({
        title: "Error",
        description: "Failed to load case details",
        variant: "destructive"
      });
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
  const getStatusStyle = (status: string) => {
    const statusItem = caseStatuses.find(s => s.value === status);
    if (statusItem?.color) {
      return {
        backgroundColor: `${statusItem.color}20`,
        color: statusItem.color,
        borderColor: `${statusItem.color}40`
      };
    }
    return {};
  };
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      critical: "bg-red-500/10 text-red-500 border-red-500/20"
    };
    return colors[priority] || "bg-muted";
  };

  const isClosedCase = () => {
    if (!caseData) return false;
    const statusItem = caseStatuses.find(s => s.value === caseData.status);
    return statusItem?.status_type === 'closed';
  };
  const handleStatusChange = async (newStatus: string) => {
    if (!caseData) return;

    // Don't log if status hasn't actually changed
    const oldStatus = caseData.status;
    if (oldStatus === newStatus) return;
    setUpdatingStatus(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user profile for activity log
      const {
        data: profile
      } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const userName = profile?.full_name || user.email || "Unknown User";

      // Check if the new status is a "closed" type
      const newStatusItem = caseStatuses.find(s => s.value === newStatus);
      const isClosing = newStatusItem?.status_type === 'closed';
      const oldStatusItem = caseStatuses.find(s => s.value === oldStatus);
      const wasOpen = oldStatusItem?.status_type === 'open';

      // Prepare update data
      const updateData: any = {
        status: newStatus
      };

      // If transitioning from open to closed, record who closed it and when
      if (isClosing && wasOpen) {
        updateData.closed_by_user_id = user.id;
        updateData.closed_at = new Date().toISOString();
      }

      // Update case status
      const {
        error
      } = await supabase.from("cases").update(updateData).eq("id", id).eq("user_id", user.id);
      if (error) throw error;

      // Create activity log entry
      let activityDescription = `Status changed from "${oldStatus}" to "${newStatus}" by ${userName}`;
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

      // Create notification
      await NotificationHelpers.caseStatusChanged(caseData.case_number, newStatus, id!);
      
      // Update local state
      setCaseData({
        ...caseData,
        status: newStatus,
        ...(isClosing && wasOpen ? { closed_by_user_id: user.id, closed_at: new Date().toISOString() } : {})
      });
      
      toast({
        title: "Success",
        description: isClosing && wasOpen ? "Case closed successfully" : "Case status updated successfully"
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update case status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReopenCase = async () => {
    if (!caseData) return;
    
    // Show confirmation dialog
    if (!confirm("Are you sure you want to reopen this case?")) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user profile for activity log
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const userName = profile?.full_name || user.email || "Unknown User";

      // Find a default "open" status
      const openStatus = caseStatuses.find(s => s.status_type === 'open');
      if (!openStatus) {
        toast({
          title: "Error",
          description: "No open status available. Please configure an open status first.",
          variant: "destructive"
        });
        return;
      }

      // Update case to reopen it
      const { error } = await supabase
        .from("cases")
        .update({
          status: openStatus.value
          // Keep closed_by_user_id and closed_at for history
        })
        .eq("id", id);

      if (error) throw error;

      // Create activity log entry
      const { error: activityError } = await supabase
        .from("case_activities")
        .insert({
          case_id: id,
          user_id: user.id,
          activity_type: "Status Change",
          title: "Case Reopened",
          description: `Case reopened by ${userName}`,
          status: "completed"
        });

      if (activityError) {
        console.error("Error creating activity log:", activityError);
      }

      // Update local state
      setCaseData({
        ...caseData,
        status: openStatus.value
      });

      toast({
        title: "Success",
        description: "Case reopened successfully"
      });
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
    return <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>;
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
  
  return <div className="space-y-4 sm:space-y-6">
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReopenCase}
                  className="self-start sm:self-auto"
                >
                  Reopen Case
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="self-start sm:self-auto">
          <Link to="/cases">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold break-words ${isClosed ? 'text-muted-foreground' : ''}`}>
              {caseData.title}
            </h1>
            {!isVendor && (
              <div className="flex items-center gap-2">
                <Select value={caseData.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                  <SelectTrigger className={`w-full sm:w-[140px] h-8 sm:h-7 text-sm ${getStatusColor(caseData.status)}`} style={getStatusStyle(caseData.status)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {caseStatuses.map(status => <SelectItem key={status.id} value={status.value}>
                        {status.value.charAt(0).toUpperCase() + status.value.slice(1)}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {caseStatuses.find(s => s.value === caseData.status)?.status_type && (
                  <span className="text-xs">
                    {caseStatuses.find(s => s.value === caseData.status)?.status_type === "open" ? "🟢" : "⚪"}
                  </span>
                )}
              </div>
            )}
            {isVendor && (
              <div className="flex items-center gap-2">
                <Badge className="border" style={getStatusStyle(caseData.status)}>
                  {caseData.status}
                </Badge>
                {caseStatuses.find(s => s.value === caseData.status)?.status_type && (
                  <span className="text-xs">
                    {caseStatuses.find(s => s.value === caseData.status)?.status_type === "open" ? "🟢" : "⚪"}
                  </span>
                )}
              </div>
            )}
            {caseData.priority && <Badge className={getPriorityColor(caseData.priority)}>
                {caseData.priority}
              </Badge>}
          </div>
          <p className={`text-sm sm:text-base ${isClosed ? 'text-muted-foreground' : 'text-slate-500'}`}>
            Case #{caseData.case_number}
          </p>
        </div>
        {!isVendor && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setEmailComposerOpen(true)} 
              className="w-full sm:w-auto"
              disabled={isClosed}
            >
              <Mail className="h-4 w-4 mr-2" />
              <span className="sm:inline">Send Email</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setEditFormOpen(true)} 
              className="bg-zinc-200 hover:bg-zinc-100 w-full sm:w-auto"
              disabled={isClosed}
            >
              <Edit className="h-4 w-4 mr-2" />
              <span className="sm:inline">Edit</span>
            </Button>
            <Button variant="outline" onClick={handleDelete} disabled={deleting} className="text-red-600 bg-red-300 hover:bg-red-200 w-full sm:w-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="sm:inline">{deleting ? "Deleting..." : "Delete"}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            {caseData.description && <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-muted-foreground">{caseData.description}</p>
              </div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {!isVendor && account && <div>
                  <p className="text-sm font-medium mb-1">Account</p>
                  <p className="text-muted-foreground">{account.name}</p>
                </div>}
              {!isVendor && contact && <div>
                  <p className="text-sm font-medium mb-1">Contact</p>
                  <p className="text-muted-foreground">{contact.first_name} {contact.last_name}</p>
                </div>}
              {caseData.start_date && <div>
                  <p className="text-sm font-medium mb-1">Start Date</p>
                  <p className="text-muted-foreground">{new Date(caseData.start_date).toLocaleDateString()}</p>
                </div>}
              {caseData.due_date && <div>
                  <p className="text-sm font-medium mb-1">Due Date</p>
                  <p className="text-red-500 font-normal">{new Date(caseData.due_date).toLocaleDateString()}</p>
                </div>}
            </div>
          </CardContent>
        </Card>

        {!isVendor && (
          <div className="space-y-4 sm:space-y-6">
            <RetainerFundsWidget caseId={id!} />
            <CaseTeamManager caseId={id!} caseManagerId={caseData.case_manager_id} investigatorIds={caseData.investigator_ids || []} onUpdate={fetchCaseData} />
          </div>
        )}
      </div>

      <Tabs defaultValue={isVendor ? "updates" : "subjects"} className="w-full">
        <TabsList className="grid w-full gap-1" style={{ gridTemplateColumns: isVendor ? 'repeat(2, 1fr)' : 'repeat(3, 1fr) repeat(3, 1fr)' }}>
          {!isVendor && <TabsTrigger value="subjects" className="text-xs sm:text-sm px-2 sm:px-3">Subjects</TabsTrigger>}
          <TabsTrigger value="updates" className="text-xs sm:text-sm px-2 sm:px-3">Updates</TabsTrigger>
          {!isVendor && <TabsTrigger value="activities" className="text-xs sm:text-sm px-2 sm:px-3">Activities</TabsTrigger>}
          {!isVendor && <TabsTrigger value="calendar" className="text-xs sm:text-sm px-2 sm:px-3">Calendar</TabsTrigger>}
          {!isVendor && <TabsTrigger value="finances" className="text-xs sm:text-sm px-2 sm:px-3">Finances</TabsTrigger>}
          <TabsTrigger value="attachments" className="text-xs sm:text-sm px-2 sm:px-3">Attachments</TabsTrigger>
        </TabsList>

        {!isVendor && (
          <TabsContent value="subjects" className="mt-4 sm:mt-6">
            <CaseSubjects caseId={id!} isClosedCase={isClosed} />
          </TabsContent>
        )}

        <TabsContent value="updates" className="mt-4 sm:mt-6">
          <CaseUpdates caseId={id!} isClosedCase={isClosed} />
        </TabsContent>

        {!isVendor && (
          <>
            <TabsContent value="activities" className="mt-4 sm:mt-6">
              <CaseActivities caseId={id!} isClosedCase={isClosed} />
            </TabsContent>

            <TabsContent value="calendar" className="mt-4 sm:mt-6">
          <CaseCalendar caseId={id!} isClosedCase={isClosed} />
        </TabsContent>

        <TabsContent value="finances" className="mt-4 sm:mt-6">
          <CaseFinances caseId={id!} isClosedCase={isClosed} />
        </TabsContent>
          </>
        )}

        <TabsContent value="attachments" className="mt-4 sm:mt-6">
          <CaseAttachments caseId={id!} isClosedCase={isClosed} />
        </TabsContent>
      </Tabs>

      <CaseForm open={editFormOpen} onOpenChange={setEditFormOpen} onSuccess={fetchCaseData} editingCase={caseData || undefined} />
      
      <EmailComposer 
        open={emailComposerOpen} 
        onOpenChange={setEmailComposerOpen}
        defaultTo={contact?.first_name && contact?.last_name ? `${contact.first_name} ${contact.last_name}` : undefined}
        defaultSubject={`Update on Case: ${caseData?.title}`}
        caseId={id}
      />
    </div>;
};
export default CaseDetail;
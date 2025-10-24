import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Edit, Trash2 } from "lucide-react";
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
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  useEffect(() => {
    fetchCaseData();
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
    const colors: Record<string, string> = {
      open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      closed: "bg-green-500/10 text-green-500 border-green-500/20"
    };
    return colors[status] || "bg-muted";
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
  const handleStatusChange = async (newStatus: string) => {
    if (!caseData) return;
    
    setUpdatingStatus(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("cases")
        .update({ status: newStatus })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setCaseData({ ...caseData, status: newStatus });
      toast({
        title: "Success",
        description: "Case status updated successfully"
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
  return <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cases">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{caseData.title}</h1>
            <Select value={caseData.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
              <SelectTrigger className={`w-[140px] h-7 ${getStatusColor(caseData.status)}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {caseData.priority && <Badge className={getPriorityColor(caseData.priority)}>
                {caseData.priority}
              </Badge>}
          </div>
          <p className="text-muted-foreground">Case #{caseData.case_number}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditFormOpen(true)} className="bg-green-500 hover:bg-green-400">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDelete} disabled={deleting} className="text-red-600 bg-red-300 hover:bg-red-200">
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {caseData.description && <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-muted-foreground">{caseData.description}</p>
              </div>}
            <div className="grid grid-cols-2 gap-4">
              {account && <div>
                  <p className="text-sm font-medium mb-1">Account</p>
                  <p className="text-muted-foreground">{account.name}</p>
                </div>}
              {contact && <div>
                  <p className="text-sm font-medium mb-1">Contact</p>
                  <p className="text-muted-foreground">{contact.first_name} {contact.last_name}</p>
                </div>}
              {caseData.start_date && <div>
                  <p className="text-sm font-medium mb-1">Start Date</p>
                  <p className="text-muted-foreground">{new Date(caseData.start_date).toLocaleDateString()}</p>
                </div>}
              {caseData.due_date && <div>
                  <p className="text-sm font-medium mb-1">Due Date</p>
                  <p className="text-muted-foreground">{new Date(caseData.due_date).toLocaleDateString()}</p>
                </div>}
            </div>
          </CardContent>
        </Card>

        <RetainerFundsWidget caseId={id!} />
      </div>

      <Tabs defaultValue="subjects" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="mt-6">
          <CaseSubjects caseId={id!} />
        </TabsContent>

        <TabsContent value="updates" className="mt-6">
          <CaseUpdates caseId={id!} />
        </TabsContent>

        <TabsContent value="activities" className="mt-6">
          <CaseActivities caseId={id!} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CaseCalendar caseId={id!} />
        </TabsContent>

        <TabsContent value="finances" className="mt-6">
          <CaseFinances caseId={id!} />
        </TabsContent>

        <TabsContent value="attachments" className="mt-6">
          <CaseAttachments caseId={id!} />
        </TabsContent>
      </Tabs>

      <CaseForm open={editFormOpen} onOpenChange={setEditFormOpen} onSuccess={fetchCaseData} editingCase={caseData || undefined} />
    </div>;
};
export default CaseDetail;
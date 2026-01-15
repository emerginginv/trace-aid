import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Clock, DollarSign, FileText, User, Briefcase, X } from "lucide-react";
// Note: CreateBillingItemButton removed - billing now initiated only from Update Details page
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigationSource } from "@/hooks/useNavigationSource";

interface TimeEntry {
  id: string;
  case_id: string;
  user_id: string;
  finance_type: string;
  amount: number;
  description: string;
  date: string;
  hours: number | null;
  hourly_rate: number | null;
  status: string;
  notes: string | null;
  invoiced: boolean;
  invoice_id: string | null;
  invoice_number: string | null;
  created_at: string;
  case_service_instance_id: string | null;
  activity_id: string | null;
  organization_id: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface CaseInfo {
  id: string;
  case_number: string;
  title: string;
}

interface ServiceInfo {
  name: string;
  billable: boolean;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TimeEntryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getBackRoute } = useNavigationSource();
  const [timeEntry, setTimeEntry] = useState<TimeEntry | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useSetBreadcrumbs([
    { label: "Time Entries", href: "/time-entries" },
    { label: timeEntry?.description || "Time Entry" },
  ]);

  useEffect(() => {
    // Validate UUID format before attempting to fetch
    if (!id || !UUID_REGEX.test(id)) {
      toast({
        title: "Invalid time entry ID",
        description: "The time entry ID format is invalid. Redirecting to time entries list.",
        variant: "destructive",
      });
      navigate("/time-entries");
      return;
    }
    fetchTimeEntry();
  }, [id]);

  const fetchTimeEntry = async () => {
    try {
      setLoading(true);
      
      const { data: entryData, error: entryError } = await supabase
        .from("case_finances")
        .select("*")
        .eq("id", id)
        .eq("finance_type", "time")
        .maybeSingle();

      if (entryError) throw entryError;

      if (!entryData) {
        toast({
          title: "Time entry not found",
          description: "The requested time entry could not be found.",
          variant: "destructive",
        });
        navigate("/time-entries");
        return;
      }

      setTimeEntry(entryData);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", entryData.user_id)
        .maybeSingle();

      if (profileData) {
        setUserProfile(profileData);
      }

      // Fetch case info
      const { data: caseData } = await supabase
        .from("cases")
        .select("id, case_number, title")
        .eq("id", entryData.case_id)
        .maybeSingle();

      if (caseData) {
        setCaseInfo(caseData);
      }

      // Fetch service info if there's a service instance
      if (entryData.case_service_instance_id) {
        const { data: instanceData } = await supabase
          .from("case_service_instances")
          .select("billable, case_services(name)")
          .eq("id", entryData.case_service_instance_id)
          .maybeSingle();

        if (instanceData) {
          const serviceName = (instanceData.case_services as any)?.name || "Unknown Service";
          setServiceInfo({
            name: serviceName,
            billable: instanceData.billable ?? true,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching time entry:", error);
      toast({
        title: "Error",
        description: "Failed to load time entry details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBillingStateBadge = () => {
    if (!timeEntry) return null;

    const billable = serviceInfo?.billable ?? true;

    // State 1: Not billable
    if (!billable) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <X className="h-3 w-3 mr-1" />
          Not Billable
        </Badge>
      );
    }

    // State 2: Invoiced (with invoice reference)
    if (timeEntry.invoiced || timeEntry.status === "billed") {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <FileText className="h-3 w-3 mr-1" />
          {timeEntry.invoice_number ? `INV-${timeEntry.invoice_number}` : "Invoiced"}
        </Badge>
      );
    }

    // State 3: Billable, not invoiced
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Pending Invoice
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
      billed: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const handleBack = () => {
    const backRoute = getBackRoute(timeEntry?.case_id ? `/cases/${timeEntry.case_id}` : "/time-entries");
    navigate(backRoute);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!timeEntry) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{timeEntry.description}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                {getStatusBadge(timeEntry.status)}
                {getBillingStateBadge()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                ${timeEntry.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {timeEntry.hours && (
                <div className="text-sm text-muted-foreground">
                  {timeEntry.hours.toFixed(2)} hrs @ ${timeEntry.hourly_rate?.toFixed(2) || "0.00"}/hr
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Date: {format(new Date(timeEntry.date), "PPP")}</span>
            </div>

            {timeEntry.hours && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Hours: {timeEntry.hours.toFixed(2)}</span>
              </div>
            )}

            {timeEntry.hourly_rate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Hourly Rate: ${timeEntry.hourly_rate.toFixed(2)}</span>
              </div>
            )}

            {serviceInfo && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span>Service: {serviceInfo.name}</span>
              </div>
            )}

            {userProfile && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Created by {userProfile.full_name || userProfile.email}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Submitted on {format(new Date(timeEntry.created_at), "PPP")}</span>
            </div>
          </div>

          {caseInfo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Briefcase className="h-4 w-4" />
                Case Information
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/cases/${caseInfo.id}`)}
              >
                {caseInfo.case_number} - {caseInfo.title}
              </Button>
            </div>
          )}

          {timeEntry.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" />
                Notes
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {timeEntry.notes}
                </p>
              </div>
            </div>
          )}

          {timeEntry.invoice_id && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <DollarSign className="h-4 w-4" />
                Invoice Information
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/invoices/${timeEntry.invoice_id}`)}
              >
                View Invoice {timeEntry.invoice_number ? `(${timeEntry.invoice_number})` : ""}
              </Button>
            </div>
          )}

          {/* Note: Create Billing Item action removed - billing now initiated only from Update Details page */}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeEntryDetail;

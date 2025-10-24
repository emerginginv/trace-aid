import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Info, Briefcase, FileText, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Case {
  id: string;
  case_number: string;
  title: string;
  status: string;
}

interface Update {
  id: string;
  title: string;
  description: string;
  update_type: string;
  created_at: string;
  case_id: string;
  cases?: {
    case_number: string;
    title: string;
  };
}

export default function VendorDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [updateType, setUpdateType] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch cases accessible to vendor
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, case_number, title, status")
        .order("created_at", { ascending: false });

      if (casesError) throw casesError;
      setCases(casesData || []);

      // Fetch vendor's updates
      const { data: updatesData, error: updatesError } = await supabase
        .from("case_updates")
        .select(`
          id,
          title,
          description,
          update_type,
          created_at,
          case_id,
          cases(case_number, title)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (updatesError) throw updatesError;
      setUpdates(updatesData || []);
    } catch (error) {
      console.error("Error fetching vendor data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCaseId || !updateType || !updateTitle) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get organization_id from the selected case
      const { data: caseData } = await supabase
        .from("cases")
        .select("organization_id")
        .eq("id", selectedCaseId)
        .single();

      const { error } = await supabase.from("case_updates").insert({
        case_id: selectedCaseId,
        user_id: user.id,
        organization_id: caseData?.organization_id,
        title: updateTitle,
        description: updateNotes,
        update_type: updateType,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Update submitted successfully",
      });

      // Reset form
      setSelectedCaseId("");
      setUpdateType("");
      setUpdateTitle("");
      setUpdateNotes("");

      // Refresh updates
      fetchVendorData();
    } catch (error) {
      console.error("Error submitting update:", error);
      toast({
        title: "Error",
        description: "Failed to submit update",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "closed":
        return "bg-gray-500/10 text-gray-700 border-gray-200";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      default:
        return "bg-blue-500/10 text-blue-700 border-blue-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your cases and submit updates
        </p>
      </div>

      {/* Limited Access Banner */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          You have limited access as a vendor. You can view assigned cases and submit updates.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Cases - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                My Cases
              </CardTitle>
              <CardDescription>
                Cases you have access to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No cases assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {cases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      onClick={() => navigate(`/cases/${caseItem.id}`)}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-muted-foreground">
                              {caseItem.case_number}
                            </span>
                            <Badge className={getStatusColor(caseItem.status)}>
                              {caseItem.status}
                            </Badge>
                          </div>
                          <p className="font-medium truncate">{caseItem.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                My Updates
              </CardTitle>
              <CardDescription>
                Recent updates you've submitted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No updates submitted yet
                </p>
              ) : (
                <div className="space-y-3">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium mb-1">{update.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {update.update_type}
                            </Badge>
                            <span>{format(new Date(update.created_at), "MMM dd, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      {update.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {update.description}
                        </p>
                      )}
                      {update.cases && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Case: {update.cases.case_number} - {update.cases.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit New Update - 1 column on large screens */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Submit New Update
              </CardTitle>
              <CardDescription>
                Add an update to a case
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="case">Case *</Label>
                  <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                    <SelectTrigger id="case">
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>
                          {caseItem.case_number} - {caseItem.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Update Type *</Label>
                  <Select value={updateType} onValueChange={setUpdateType}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Progress Update">Progress Update</SelectItem>
                      <SelectItem value="Status Change">Status Change</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Issue">Issue</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={updateTitle}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                    placeholder="Brief update summary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Detailed information about this update..."
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Update
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

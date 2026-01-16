import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  Users,
  FileText,
  CalendarDays,
  Paperclip,
  ChevronRight,
  Building2,
  User,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WizardNavigation } from "../WizardNavigation";
import { CaseFormData } from "../hooks/useCaseWizard";
import { SelectedService } from "./Step2Services";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Step6Props {
  caseId: string;
  caseNumber: string;
  caseData: CaseFormData;
  selectedServices: SelectedService[];
  subjectsCount: number;
  updatesCount: number;
  eventsCount: number;
  attachmentsCount: number;
  onBack: () => void;
  onApprove: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
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

interface SubjectSummary {
  person: number;
  vehicle: number;
  location: number;
  item: number;
}

export function Step6Summary({
  caseId,
  caseNumber,
  caseData,
  selectedServices,
  subjectsCount,
  updatesCount,
  eventsCount,
  attachmentsCount,
  onBack,
  onApprove,
  onCancel,
  isSubmitting,
}: Step6Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [caseTitle, setCaseTitle] = useState<string | null>(null);
  const [subjectCounts, setSubjectCounts] = useState<SubjectSummary>({
    person: 0,
    vehicle: 0,
    location: 0,
    item: 0,
  });
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchDetails();
  }, [caseData, caseId]);

  const fetchDetails = async () => {
    try {
      // Fetch the case title from database (set by trigger from primary subject)
      const { data: caseRecord } = await supabase
        .from("cases")
        .select("title")
        .eq("id", caseId)
        .single();
      
      if (caseRecord) {
        setCaseTitle(caseRecord.title);
      }

      // Fetch account and contact names
      if (caseData.account_id) {
        const { data } = await supabase
          .from("accounts")
          .select("id, name")
          .eq("id", caseData.account_id)
          .single();
        if (data) setAccount(data);
      }

      if (caseData.contact_id) {
        const { data } = await supabase
          .from("contacts")
          .select("id, first_name, last_name")
          .eq("id", caseData.contact_id)
          .single();
        if (data) setContact(data);
      }

      // Fetch subject counts by type
      const { data: subjects } = await supabase
        .from("case_subjects")
        .select("subject_type")
        .eq("case_id", caseId)
        .is("archived_at", null);

      if (subjects) {
        const counts: SubjectSummary = { person: 0, vehicle: 0, location: 0, item: 0 };
        subjects.forEach(s => {
          const type = s.subject_type as keyof SubjectSummary;
          if (type in counts) counts[type]++;
        });
        setSubjectCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching summary details:", error);
    }
  };

  const totalSubjects = Object.values(subjectCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Review & Approve</h3>
        <p className="text-sm text-muted-foreground">
          Review your case details before creating. Once approved, the case will be active.
        </p>
      </div>

      {/* Case Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Case Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Case Number</p>
              <p className="font-medium">{caseNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                Draft
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Case Name</p>
              <p className="font-medium">{caseTitle || "(Set from primary subject)"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Case Type</p>
              <p className="font-medium">{caseData.status}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">{account?.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Primary Contact</p>
                <p className="font-medium">
                  {contact ? `${contact.first_name} ${contact.last_name}` : "—"}
                </p>
              </div>
            </div>
          </div>

          {caseData.due_date && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium">{format(caseData.due_date, "PPP")}</p>
              </div>
            </>
          )}

          {caseData.description && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground">Description</p>
                <p className="font-medium">{caseData.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Services */}
        <Collapsible
          open={expandedSection === "services"}
          onOpenChange={(open) => setExpandedSection(open ? "services" : null)}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Services</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedServices.length} selected
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSection === "services" ? "rotate-90" : ""
                  }`}
                />
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <Separator className="mb-3" />
                <div className="flex flex-wrap gap-2 text-sm">
                  {selectedServices.length > 0 ? (
                    selectedServices.map((service) => (
                      <Badge key={service.serviceId} variant="secondary">
                        {service.serviceName}
                        {service.estimatedQuantity && ` (${service.estimatedQuantity}h)`}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No services selected</p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Subjects */}
        <Collapsible
          open={expandedSection === "subjects"}
          onOpenChange={(open) => setExpandedSection(open ? "subjects" : null)}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Subjects</p>
                    <p className="text-sm text-muted-foreground">
                      {totalSubjects} added
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSection === "subjects" ? "rotate-90" : ""
                  }`}
                />
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <Separator className="mb-3" />
                <div className="flex flex-wrap gap-2 text-sm">
                  {subjectCounts.person > 0 && (
                    <Badge variant="secondary">{subjectCounts.person} People</Badge>
                  )}
                  {subjectCounts.vehicle > 0 && (
                    <Badge variant="secondary">{subjectCounts.vehicle} Vehicles</Badge>
                  )}
                  {subjectCounts.location > 0 && (
                    <Badge variant="secondary">{subjectCounts.location} Locations</Badge>
                  )}
                  {subjectCounts.item > 0 && (
                    <Badge variant="secondary">{subjectCounts.item} Items</Badge>
                  )}
                  {totalSubjects === 0 && (
                    <p className="text-muted-foreground">No subjects added</p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Updates */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Updates</p>
              <p className="text-sm text-muted-foreground">
                {updatesCount} added
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Events</p>
              <p className="text-sm text-muted-foreground">
                {eventsCount} scheduled
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="flex items-center gap-3 p-4">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Attachments</p>
              <p className="text-sm text-muted-foreground">
                {attachmentsCount} uploaded
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval note */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          When you approve this case, it will change from <strong>Draft</strong> to{" "}
          <strong>New</strong> status and become visible across the system.
          {selectedServices.length > 0 && (
            <> The {selectedServices.length} selected service{selectedServices.length !== 1 ? "s" : ""} will be added to the case.</>
          )}
        </p>
      </div>

      <WizardNavigation
        currentStep={7}
        onBack={onBack}
        onContinue={() => {}}
        onApprove={onApprove}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

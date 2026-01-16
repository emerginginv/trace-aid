import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InternalClientSelector } from "@/components/case-request/InternalClientSelector";
import { CaseRequestWizard } from "@/components/case-request/CaseRequestWizard";
import { CaseRequestForm } from "@/hooks/queries/useCaseRequestFormBySlug";
import { Step1Data } from "@/hooks/useCaseRequestForm";
import { DEFAULT_FORM_CONFIG } from "@/types/case-request-form-config";
import { FileInput } from "lucide-react";

export default function NewCaseRequest() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { data: user } = useCurrentUser();
  
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('new');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [prefilledData, setPrefilledData] = useState<Step1Data | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useSetBreadcrumbs([
    { label: "Cases", href: "/cases" },
    { label: "Case Requests", href: "/cases/requests" },
    { label: "New Request" },
  ]);

  // Create a synthetic form object for internal use
  const internalForm: CaseRequestForm = useMemo(() => ({
    id: 'internal',
    organization_id: organization?.id || '',
    form_name: 'Internal Request',
    form_slug: 'internal',
    field_config: DEFAULT_FORM_CONFIG,
    is_active: true,
    is_public: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    logo_url: null,
    primary_color: null,
    organization_display_name: null,
    organization_phone: null,
    organization_website: null,
    header_instructions: null,
    success_message: "Case request submitted successfully!",
    send_confirmation_email: false,
    confirmation_email_subject: null,
    confirmation_email_body: null,
    notify_staff_on_submission: true,
    staff_notification_emails: null,
  }), [organization?.id]);

  const handleClientModeChange = useCallback((mode: 'existing' | 'new') => {
    setClientMode(mode);
    if (mode === 'new') {
      setSelectedAccountId(null);
      setSelectedContactId(null);
      setPrefilledData(null);
    }
  }, []);

  const handleClientSelect = useCallback((
    accountId: string | null, 
    contactId: string | null, 
    prefillData: Step1Data | null
  ) => {
    setSelectedAccountId(accountId);
    setSelectedContactId(contactId);
    setPrefilledData(prefillData);
  }, []);

  const handleContinue = useCallback(() => {
    setShowWizard(true);
  }, []);

  const handleComplete = useCallback(() => {
    navigate('/cases/requests');
  }, [navigate]);

  if (!organization?.id) {
    return null;
  }

  // Show the wizard directly when continuing
  if (showWizard) {
    return (
      <CaseRequestWizard 
        form={internalForm}
        mode="internal"
        prefilledClientData={prefilledData || undefined}
        matchedAccountId={selectedAccountId || undefined}
        matchedContactId={selectedContactId || undefined}
        createdBy={user?.id}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileInput className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">New Case Request</h1>
          <p className="text-muted-foreground">
            Submit a case request on behalf of a client
          </p>
        </div>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <InternalClientSelector
            organizationId={organization.id}
            clientMode={clientMode}
            selectedAccountId={selectedAccountId}
            selectedContactId={selectedContactId}
            onClientModeChange={handleClientModeChange}
            onClientSelect={handleClientSelect}
            onContinue={handleContinue}
          />
        </CardContent>
      </Card>
    </div>
  );
}

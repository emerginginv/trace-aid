import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CaseRequestDetailHeader,
  CaseRequestDetailNav,
  RequestDetailTab,
  ClientMatchingSection,
  RequestDetailsCard,
  RequestStatusPanel,
  RequestSubjectsTab,
  RequestFilesTab,
  RequestHistoryTab,
} from "@/components/case-request-detail";

interface CaseRequestSubject {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  cell_phone: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_primary: boolean | null;
  subject_type_id: string | null;
}

interface CaseRequestFile {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_at: string;
}

interface CaseRequest {
  id: string;
  request_number: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  decline_reason: string | null;
  case_type_id: string | null;
  case_services: string[] | null;
  claim_number: string | null;
  budget_dollars: number | null;
  budget_hours: number | null;
  notes_instructions: string | null;
  custom_fields: Record<string, unknown> | null;
  matched_account_id: string | null;
  matched_contact_id: string | null;
  submitted_client_name: string | null;
  submitted_client_address1: string | null;
  submitted_client_city: string | null;
  submitted_client_state: string | null;
  submitted_client_zip: string | null;
  submitted_contact_first_name: string | null;
  submitted_contact_last_name: string | null;
  submitted_contact_email: string | null;
  submitted_contact_mobile_phone: string | null;
  case_request_subjects: CaseRequestSubject[];
  case_request_files: CaseRequestFile[];
}

interface SubjectType {
  id: string;
  name: string;
}

export default function CaseRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [request, setRequest] = useState<CaseRequest | null>(null);
  const [caseTypeName, setCaseTypeName] = useState<string | null>(null);
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RequestDetailTab>('overview');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog states
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Breadcrumbs
  useSetBreadcrumbs([
    { label: "Cases", href: "/cases" },
    { label: "Case Requests", href: "/cases/requests" },
    { label: request?.request_number || "Request" },
  ]);

  useEffect(() => {
    if (organization?.id && id && hasPermission('view_case_requests')) {
      fetchRequest();
      fetchSubjectTypes();
    }
  }, [organization?.id, id, hasPermission]);

  const fetchRequest = async () => {
    if (!organization?.id || !id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_requests')
        .select(`
          *,
          case_request_subjects (*),
          case_request_files (*)
        `)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;

      setRequest(data as CaseRequest);

      // Fetch case type name if exists
      if (data.case_type_id) {
        const { data: typeData } = await supabase
          .from('case_types')
          .select('name')
          .eq('id', data.case_type_id)
          .single();
        
        if (typeData) setCaseTypeName(typeData.name);
      }
    } catch (error) {
      console.error('Error fetching case request:', error);
      toast.error('Failed to load case request');
      navigate('/cases/requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectTypes = async () => {
    if (!organization?.id) return;

    const { data } = await supabase
      .from('subject_types')
      .select('id, name')
      .eq('organization_id', organization.id);
    
    if (data) setSubjectTypes(data);
  };

  const handleMatchComplete = (data: {
    accountId: string;
    contactId: string | null;
    clientAction: 'existing' | 'new';
    contactAction: 'existing' | 'new' | null;
  }) => {
    if (request) {
      setRequest({
        ...request,
        matched_account_id: data.accountId,
        matched_contact_id: data.contactId,
      });
    }
  };

  const getPrimarySubjectName = (): string => {
    if (!request) return '—';
    const primary = request.case_request_subjects.find(s => s.is_primary);
    const subject = primary || request.case_request_subjects[0];
    if (!subject) return '—';
    
    const parts = [subject.last_name, subject.first_name].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  const handleAccept = async () => {
    if (!request || !organization?.id) return;

    setIsProcessing(true);
    try {
      // Get user ID for creating case
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Generate proper case number using database function
      let caseNumber: string;
      let seriesNumber: number | null = null;
      let seriesInstance: number = 1;

      const { data: caseNumberData, error: caseNumberError } = await supabase
        .rpc('generate_next_case_number', { 
          p_organization_id: organization.id,
          p_parent_case_id: null 
        });

      if (caseNumberError || !caseNumberData) {
        console.error('Error generating case number:', caseNumberError);
        // Fallback to timestamp-based number
        const timestamp = Date.now().toString(36).toUpperCase();
        caseNumber = `CASE-${timestamp}`;
      } else {
        // Cast the response to the expected shape
        const caseNumResult = caseNumberData as { case_number: string; series_number: number | null; series_instance: number };
        caseNumber = caseNumResult.case_number;
        seriesNumber = caseNumResult.series_number;
        seriesInstance = caseNumResult.series_instance || 1;
      }

      // Step 2: Determine primary subject for title
      const primarySubject = request.case_request_subjects.find(s => s.is_primary) 
        || request.case_request_subjects[0];

      // Step 3: Create the case
      const { data: newCase, error: createError } = await supabase
        .from('cases')
        .insert([{
          organization_id: organization.id,
          user_id: user.id,
          case_number: caseNumber,
          series_number: seriesNumber,
          series_instance: seriesInstance,
          account_id: request.matched_account_id,
          contact_id: request.matched_contact_id,
          case_type_id: request.case_type_id,
          case_manager_id: user.id,
          title: primarySubject 
            ? [primarySubject.last_name, primarySubject.first_name].filter(Boolean).join(', ')
            : 'Case from Request',
          description: request.notes_instructions,
          reference_number: request.claim_number,
          budget_dollars: request.budget_dollars,
          budget_hours: request.budget_hours,
          status: 'active',
        }])
        .select('id')
        .single();

      if (createError) throw createError;

      // Step 4: Create case subjects from request subjects
      if (request.case_request_subjects.length > 0) {
        const subjectsToCreate = request.case_request_subjects.map(sub => ({
          organization_id: organization.id,
          case_id: newCase.id,
          user_id: user.id,
          name: [sub.first_name, sub.last_name].filter(Boolean).join(' ') || 'Unnamed',
          subject_type: 'person',
          subject_type_id: sub.subject_type_id,
          is_primary: sub.is_primary,
          details: {
            first_name: sub.first_name,
            last_name: sub.last_name,
            middle_name: sub.middle_name,
            date_of_birth: sub.date_of_birth,
            email: sub.email,
            cell_phone: sub.cell_phone,
            address1: sub.address1,
            city: sub.city,
            state: sub.state,
            zip: sub.zip,
          },
        }));

        await supabase.from('case_subjects').insert(subjectsToCreate);
      }

      // Step 5: Copy files from request to case attachments
      if (request.case_request_files.length > 0) {
        for (const file of request.case_request_files) {
          try {
            const fileExt = file.file_name.split('.').pop() || 'bin';
            const newFilePath = `${user.id}/${newCase.id}/${crypto.randomUUID()}.${fileExt}`;
            
            // Download from request bucket
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('case-request-files')
              .download(file.storage_path);
              
            if (downloadError) {
              console.error('Error downloading file:', downloadError);
              continue; // Skip this file but continue with others
            }

            if (fileData) {
              // Upload to case attachments bucket
              const { error: uploadError } = await supabase.storage
                .from('case-attachments')
                .upload(newFilePath, fileData);
                
              if (uploadError) {
                console.error('Error uploading file:', uploadError);
                continue;
              }

              // Create case_attachments record
              await supabase.from('case_attachments').insert({
                case_id: newCase.id,
                organization_id: organization.id,
                user_id: user.id,
                file_name: file.file_name,
                file_path: newFilePath,
                file_type: file.file_type || 'application/octet-stream',
                file_size: file.file_size || 0,
              });
            }
          } catch (fileError) {
            console.error('Error copying file:', fileError);
            // Continue with other files even if one fails
          }
        }
      }

      // Step 6: Update the request status
      await supabase
        .from('case_requests')
        .update({
          status: 'approved',
          approved_case_id: newCase.id,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', request.id);

      toast.success('Request approved and case created');
      navigate(`/cases/${newCase.id}`);
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    } finally {
      setIsProcessing(false);
      setShowAcceptDialog(false);
    }
  };

  const handleDecline = async () => {
    if (!request) return;

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('case_requests')
        .update({
          status: 'declined',
          decline_reason: declineReason || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Request declined');
      navigate('/cases/requests');
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Failed to decline request');
    } finally {
      setIsProcessing(false);
      setShowDeclineDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!request) return;

    setIsProcessing(true);
    try {
      // Delete files from storage first
      if (request.case_request_files.length > 0) {
        const filePaths = request.case_request_files.map(f => f.storage_path);
        await supabase.storage.from('case-request-files').remove(filePaths);
      }

      // Delete the request (cascade will handle subjects and files)
      const { error } = await supabase
        .from('case_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Request deleted');
      navigate('/cases/requests');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    } finally {
      setIsProcessing(false);
      setShowDeleteDialog(false);
    }
  };

  // Permission check
  if (permissionsLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission('view_case_requests')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            You don't have permission to view case requests.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Case request not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isPending = request.status.toLowerCase() === 'pending';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <CaseRequestDetailHeader
        requestNumber={request.request_number}
        primarySubjectName={getPrimarySubjectName()}
        status={request.status}
        matchedAccountId={request.matched_account_id}
        onAccept={() => setShowAcceptDialog(true)}
        onDecline={() => setShowDeclineDialog(true)}
        onDelete={() => setShowDeleteDialog(true)}
        isProcessing={isProcessing}
      />

      {/* Navigation */}
      <div className="mt-6">
        <CaseRequestDetailNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          subjectsCount={request.case_request_subjects.length}
          filesCount={request.case_request_files.length}
        />
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Client Matching Section (only for pending) */}
              {isPending && organization?.id && (
                <ClientMatchingSection
                  requestId={request.id}
                  organizationId={organization.id}
                  matchedAccountId={request.matched_account_id}
                  matchedContactId={request.matched_contact_id}
                  submittedContactData={{
                    firstName: request.submitted_contact_first_name,
                    middleName: null,
                    lastName: request.submitted_contact_last_name,
                    email: request.submitted_contact_email,
                    mobilePhone: request.submitted_contact_mobile_phone,
                  }}
                  onMatchComplete={handleMatchComplete}
                />
              )}

              {/* Request Details */}
              <RequestDetailsCard
                caseTypeName={caseTypeName}
                caseServices={request.case_services}
                claimNumber={request.claim_number}
                budgetDollars={request.budget_dollars}
                budgetHours={request.budget_hours}
                notesInstructions={request.notes_instructions}
                customFields={request.custom_fields}
              />
            </div>

            {/* Status Panel */}
            <div>
              <RequestStatusPanel
                status={request.status}
                submittedAt={request.submitted_at}
                reviewedAt={request.reviewed_at}
                contactFirstName={request.submitted_contact_first_name}
                contactLastName={request.submitted_contact_last_name}
                contactEmail={request.submitted_contact_email}
                contactPhone={request.submitted_contact_mobile_phone}
                clientName={request.submitted_client_name}
                clientAddress={{
                  address1: request.submitted_client_address1,
                  city: request.submitted_client_city,
                  state: request.submitted_client_state,
                  zip: request.submitted_client_zip,
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <RequestSubjectsTab
            subjects={request.case_request_subjects}
            subjectTypes={subjectTypes}
          />
        )}

        {activeTab === 'files' && (
          <RequestFilesTab files={request.case_request_files} />
        )}

        {activeTab === 'history' && (
          <RequestHistoryTab
            submittedAt={request.submitted_at}
            reviewedAt={request.reviewed_at}
            status={request.status}
            matchedAccountId={request.matched_account_id}
            declineReason={request.decline_reason}
          />
        )}
      </div>

      {/* Accept Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Case Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new case from this request and mark the request as approved.
              The subjects and files will be copied to the new case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept} disabled={isProcessing}>
              {isProcessing ? 'Creating Case...' : 'Accept & Create Case'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Case Request</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for declining this request (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="decline-reason">Reason</Label>
            <Textarea
              id="decline-reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter reason for declining..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDecline} 
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Declining...' : 'Decline Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case Request</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the case request
              and all associated files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

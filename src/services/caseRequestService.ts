import { supabase } from '@/integrations/supabase/client';

export interface ClientInfoData {
  submitted_client_name: string;
  submitted_client_address1?: string;
  submitted_client_address2?: string;
  submitted_client_address3?: string;
  submitted_client_city?: string;
  submitted_client_state?: string;
  submitted_client_zip?: string;
  submitted_client_country?: string;
  submitted_contact_first_name?: string;
  submitted_contact_middle_name?: string;
  submitted_contact_last_name?: string;
  submitted_contact_email: string;
  submitted_contact_office_phone?: string;
  submitted_contact_mobile_phone?: string;
  submitted_contact_mobile_carrier?: string;
  submitted_contact_home_phone?: string;
}

export interface CaseDetailsData {
  case_type_id?: string;
  claim_number?: string;
  case_services?: string[];
  budget_hours?: number;
  budget_dollars?: number;
  notes_instructions?: string;
  custom_fields?: Record<string, string>;
}

export interface SubjectData {
  id?: string;
  subject_type_id?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  alias?: string;
  date_of_birth?: string;
  age?: number;
  sex?: string;
  race?: string;
  height?: string;
  weight?: string;
  ssn?: string;
  email?: string;
  cell_phone?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  is_primary?: boolean;
  custom_fields?: Record<string, string | number | boolean | null> | null;
  photo_url?: string;
}

export interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
  storagePath?: string;
  error?: string;
}

export interface SubmitCaseRequestParams {
  organizationId: string;
  formId: string;
  clientInfo: ClientInfoData;
  caseDetails: CaseDetailsData;
  subjects: SubjectData[];
  files: FileData[];
  sourceIp?: string;
  userAgent?: string;
  // Internal mode fields
  createdBy?: string;
  sourceType?: 'public' | 'internal';
  matchedAccountId?: string;
  matchedContactId?: string;
}

export interface SubmitCaseRequestResult {
  success: boolean;
  requestId?: string;
  requestNumber?: string;
  error?: string;
}

export async function submitCaseRequest(
  params: SubmitCaseRequestParams
): Promise<SubmitCaseRequestResult> {
  const {
    organizationId,
    formId,
    clientInfo,
    caseDetails,
    subjects,
    files,
    userAgent,
    createdBy,
    sourceType = 'public',
    matchedAccountId,
    matchedContactId,
  } = params;

  try {
    // 1. Insert main case_request record
    const { data: caseRequest, error: requestError } = await supabase
      .from('case_requests')
      .insert({
        organization_id: organizationId,
        source_form_id: formId === 'internal' ? null : formId,
        status: 'pending',
        // Client info
        submitted_client_name: clientInfo.submitted_client_name,
        submitted_client_address1: clientInfo.submitted_client_address1 || null,
        submitted_client_address2: clientInfo.submitted_client_address2 || null,
        submitted_client_address3: clientInfo.submitted_client_address3 || null,
        submitted_client_city: clientInfo.submitted_client_city || null,
        submitted_client_state: clientInfo.submitted_client_state || null,
        submitted_client_zip: clientInfo.submitted_client_zip || null,
        submitted_client_country: clientInfo.submitted_client_country || null,
        // Contact info
        submitted_contact_first_name: clientInfo.submitted_contact_first_name || null,
        submitted_contact_middle_name: clientInfo.submitted_contact_middle_name || null,
        submitted_contact_last_name: clientInfo.submitted_contact_last_name || null,
        submitted_contact_email: clientInfo.submitted_contact_email,
        submitted_contact_office_phone: clientInfo.submitted_contact_office_phone || null,
        submitted_contact_mobile_phone: clientInfo.submitted_contact_mobile_phone || null,
        submitted_contact_mobile_carrier: clientInfo.submitted_contact_mobile_carrier || null,
        submitted_contact_home_phone: clientInfo.submitted_contact_home_phone || null,
        // Case details
        case_type_id: caseDetails.case_type_id || null,
        claim_number: caseDetails.claim_number || null,
        case_services: caseDetails.case_services || null,
        budget_hours: caseDetails.budget_hours || null,
        budget_dollars: caseDetails.budget_dollars || null,
        notes_instructions: caseDetails.notes_instructions || null,
        custom_fields: caseDetails.custom_fields || null,
        // Metadata
        source_user_agent: userAgent || null,
        // Internal mode fields
        created_by: createdBy || null,
        source_type: sourceType,
        matched_account_id: matchedAccountId || null,
        matched_contact_id: matchedContactId || null,
        client_match_action: matchedAccountId ? 'existing' : null,
        contact_match_action: matchedContactId ? 'existing' : null,
      })
      .select('id, request_number')
      .single();

    if (requestError) {
      console.error('Error inserting case request:', requestError);
      return {
        success: false,
        error: requestError.message || 'Failed to create case request',
      };
    }

    if (!caseRequest) {
      return {
        success: false,
        error: 'No case request returned after insert',
      };
    }

    // 2. Insert subjects to case_request_subjects
    if (subjects.length > 0) {
      const subjectsToInsert = subjects.map((subject, index) => ({
        case_request_id: caseRequest.id,
        subject_type_id: subject.subject_type_id || null,
        first_name: subject.first_name || null,
        middle_name: subject.middle_name || null,
        last_name: subject.last_name || null,
        alias: subject.alias || null,
        date_of_birth: subject.date_of_birth || null,
        age: subject.age || null,
        sex: subject.sex || null,
        race: subject.race || null,
        height: subject.height || null,
        weight: subject.weight || null,
        ssn: subject.ssn || null,
        email: subject.email || null,
        cell_phone: subject.cell_phone || null,
        address1: subject.address1 || null,
        address2: subject.address2 || null,
        address3: subject.address3 || null,
        city: subject.city || null,
        state: subject.state || null,
        zip: subject.zip || null,
        country: subject.country || null,
        is_primary: index === 0, // First subject is primary
        custom_fields: subject.custom_fields || null,
        photo_url: subject.photo_url || null,
      }));

      const { error: subjectsError } = await supabase
        .from('case_request_subjects')
        .insert(subjectsToInsert);

      if (subjectsError) {
        console.error('Error inserting subjects:', subjectsError);
        // Don't fail the whole request, subjects are optional
      }
    }

    // 3. Link uploaded files in case_request_files
    const uploadedFiles = files.filter(f => f.status === 'uploaded' && f.storagePath);
    
    if (uploadedFiles.length > 0) {
      const filesToInsert = uploadedFiles.map(file => ({
        case_request_id: caseRequest.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: file.storagePath!,
      }));

      const { error: filesError } = await supabase
        .from('case_request_files')
        .insert(filesToInsert);

      if (filesError) {
        console.error('Error linking files:', filesError);
        // Don't fail the whole request, files are optional
      }
    }

    return {
      success: true,
      requestId: caseRequest.id,
      requestNumber: caseRequest.request_number || undefined,
    };
  } catch (error) {
    console.error('Unexpected error in submitCaseRequest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

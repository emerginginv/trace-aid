import { supabase } from "@/integrations/supabase/client";

export type DocumentType = 'letter' | 'notice' | 'request' | 'agreement';

export interface DocumentTemplate {
  id: string;
  organizationId: string | null;
  userId: string;
  name: string;
  description: string | null;
  documentType: DocumentType;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentInstance {
  id: string;
  caseId: string;
  templateId: string | null;
  organizationId: string;
  userId: string;
  title: string;
  documentType: string;
  renderedHtml: string;
  orgProfileSnapshot: Record<string, unknown> | null;
  caseVariablesSnapshot: Record<string, unknown> | null;
  exportFormat: string | null;
  exportedAt: string | null;
  generatedAt: string;
  createdAt: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  letter: 'Letter',
  notice: 'Notice',
  request: 'Request',
  agreement: 'Agreement',
};

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'letter', label: 'Letter' },
  { value: 'notice', label: 'Notice' },
  { value: 'request', label: 'Request' },
  { value: 'agreement', label: 'Agreement' },
];

// Parse database row to DocumentTemplate
function parseTemplate(row: Record<string, unknown>): DocumentTemplate {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string | null,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    documentType: row.document_type as DocumentType,
    body: row.body as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Parse database row to DocumentInstance
function parseInstance(row: Record<string, unknown>): DocumentInstance {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    templateId: row.template_id as string | null,
    organizationId: row.organization_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    documentType: row.document_type as string,
    renderedHtml: row.rendered_html as string,
    orgProfileSnapshot: row.org_profile_snapshot as Record<string, unknown> | null,
    caseVariablesSnapshot: row.case_variables_snapshot as Record<string, unknown> | null,
    exportFormat: row.export_format as string | null,
    exportedAt: row.exported_at as string | null,
    generatedAt: row.generated_at as string,
    createdAt: row.created_at as string,
  };
}

// Get all document templates for an organization
export async function getOrganizationDocumentTemplates(orgId: string): Promise<DocumentTemplate[]> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching document templates:', error);
    return [];
  }

  return (data || []).map(parseTemplate);
}

// Get all document templates (including inactive) for management
export async function getAllDocumentTemplates(orgId: string): Promise<DocumentTemplate[]> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('organization_id', orgId)
    .order('name');

  if (error) {
    console.error('Error fetching document templates:', error);
    return [];
  }

  return (data || []).map(parseTemplate);
}

// Get a single document template by ID
export async function getDocumentTemplate(templateId: string): Promise<DocumentTemplate | null> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching document template:', error);
    return null;
  }

  return parseTemplate(data);
}

// Create a new document template
export async function createDocumentTemplate(
  orgId: string,
  userId: string,
  name: string,
  documentType: DocumentType,
  body: string,
  description?: string
): Promise<DocumentTemplate | null> {
  const { data, error } = await supabase
    .from('document_templates')
    .insert({
      organization_id: orgId,
      user_id: userId,
      name,
      document_type: documentType,
      body,
      description: description || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating document template:', error);
    return null;
  }

  return parseTemplate(data);
}

// Update a document template
export async function updateDocumentTemplate(
  templateId: string,
  updates: {
    name?: string;
    description?: string;
    documentType?: DocumentType;
    body?: string;
    isActive?: boolean;
  }
): Promise<boolean> {
  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.documentType !== undefined) updateData.document_type = updates.documentType;
  if (updates.body !== undefined) updateData.body = updates.body;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { error } = await supabase
    .from('document_templates')
    .update(updateData)
    .eq('id', templateId);

  if (error) {
    console.error('Error updating document template:', error);
    return false;
  }

  return true;
}

// Delete a document template
export async function deleteDocumentTemplate(templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('document_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting document template:', error);
    return false;
  }

  return true;
}

// Get document instances for a case
export async function getCaseDocumentInstances(caseId: string): Promise<DocumentInstance[]> {
  const { data, error } = await supabase
    .from('document_instances')
    .select('*')
    .eq('case_id', caseId)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching document instances:', error);
    return [];
  }

  return (data || []).map(parseInstance);
}

// Get a single document instance
export async function getDocumentInstance(instanceId: string): Promise<DocumentInstance | null> {
  const { data, error } = await supabase
    .from('document_instances')
    .select('*')
    .eq('id', instanceId)
    .single();

  if (error) {
    console.error('Error fetching document instance:', error);
    return null;
  }

  return parseInstance(data);
}

// Create a document instance
export async function createDocumentInstance(
  caseId: string,
  orgId: string,
  userId: string,
  templateId: string | null,
  title: string,
  documentType: string,
  renderedHtml: string,
  orgProfileSnapshot: Record<string, unknown>,
  caseVariablesSnapshot: Record<string, unknown>
): Promise<DocumentInstance | null> {
  // Use type assertion to work around generated types not being updated yet
  const { data, error } = await (supabase
    .from('document_instances' as 'invoices') // Type workaround
    .insert({
      case_id: caseId,
      organization_id: orgId,
      user_id: userId,
      template_id: templateId,
      title,
      document_type: documentType,
      rendered_html: renderedHtml,
      org_profile_snapshot: orgProfileSnapshot,
      case_variables_snapshot: caseVariablesSnapshot,
    } as never)
    .select()
    .single() as unknown as { data: Record<string, unknown> | null; error: Error | null });

  if (error) {
    console.error('Error creating document instance:', error);
    return null;
  }

  return data ? parseInstance(data) : null;
}

// Delete a document instance
export async function deleteDocumentInstance(instanceId: string): Promise<boolean> {
  const { error } = await supabase
    .from('document_instances')
    .delete()
    .eq('id', instanceId);

  if (error) {
    console.error('Error deleting document instance:', error);
    return false;
  }

  return true;
}

// Update export info for a document instance
export async function updateDocumentExport(
  instanceId: string,
  exportFormat: string
): Promise<boolean> {
  const { error } = await supabase
    .from('document_instances')
    .update({
      export_format: exportFormat,
      exported_at: new Date().toISOString(),
    })
    .eq('id', instanceId);

  if (error) {
    console.error('Error updating document export:', error);
    return false;
  }

  return true;
}

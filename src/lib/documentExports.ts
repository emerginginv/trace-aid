/**
 * DOCUMENT EXPORTS UTILITY
 * 
 * Handles saving, retrieving, and managing exported document artifacts.
 * PDFs are stored as derived artifacts in the document-exports bucket.
 */

import { supabase } from "@/integrations/supabase/client";

export interface DocumentExport {
  id: string;
  documentInstanceId: string;
  organizationId: string;
  userId: string;
  exportFormat: 'pdf' | 'docx' | 'html' | 'print';
  filename: string;
  storagePath: string | null;
  fileSizeBytes: number | null;
  contentHash: string | null;
  exportedAt: string;
}

/**
 * Compute SHA-256 hash of blob content for integrity verification
 */
async function computeContentHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse database row to DocumentExport
 */
function parseExport(row: Record<string, unknown>): DocumentExport {
  return {
    id: row.id as string,
    documentInstanceId: row.document_instance_id as string,
    organizationId: row.organization_id as string,
    userId: row.user_id as string,
    exportFormat: row.export_format as DocumentExport['exportFormat'],
    filename: row.filename as string,
    storagePath: row.storage_path as string | null,
    fileSizeBytes: row.file_size_bytes as number | null,
    contentHash: row.content_hash as string | null,
    exportedAt: row.exported_at as string,
  };
}

/**
 * Save an exported PDF to storage and record in database
 */
export async function saveExportedPdf(
  documentInstanceId: string,
  organizationId: string,
  userId: string,
  filename: string,
  pdfBlob: Blob
): Promise<DocumentExport | null> {
  try {
    // Compute content hash for integrity verification
    const contentHash = await computeContentHash(pdfBlob);
    
    // Generate storage path: org_id/doc_id/export_id.pdf
    const exportId = crypto.randomUUID();
    const storagePath = `${organizationId}/${documentInstanceId}/${exportId}.pdf`;
    
    // Upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from('document-exports')
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '31536000', // 1 year (immutable artifact)
      });
    
    if (uploadError) {
      console.error('Error uploading PDF to storage:', uploadError);
      throw uploadError;
    }
    
    // Record in database using type workaround for new table
    const { data, error } = await (supabase
      .from('document_exports' as 'invoices')
      .insert({
        document_instance_id: documentInstanceId,
        organization_id: organizationId,
        user_id: userId,
        export_format: 'pdf',
        filename,
        storage_path: storagePath,
        file_size_bytes: pdfBlob.size,
        content_hash: contentHash,
      } as never)
      .select()
      .single() as unknown as { data: Record<string, unknown> | null; error: Error | null });
    
    if (error) {
      console.error('Error saving export record:', error);
      // Cleanup uploaded file on database error
      await supabase.storage.from('document-exports').remove([storagePath]);
      throw error;
    }
    
    return data ? parseExport(data) : null;
  } catch (error) {
    console.error('Error in saveExportedPdf:', error);
    return null;
  }
}

/**
 * Record a non-PDF export (docx, html, print) without blob storage
 */
export async function recordExport(
  documentInstanceId: string,
  organizationId: string,
  userId: string,
  filename: string,
  exportFormat: 'docx' | 'html' | 'print'
): Promise<DocumentExport | null> {
  try {
    const { data, error } = await (supabase
      .from('document_exports' as 'invoices')
      .insert({
        document_instance_id: documentInstanceId,
        organization_id: organizationId,
        user_id: userId,
        export_format: exportFormat,
        filename,
        storage_path: null,
        file_size_bytes: null,
        content_hash: null,
      } as never)
      .select()
      .single() as unknown as { data: Record<string, unknown> | null; error: Error | null });
    
    if (error) {
      console.error('Error recording export:', error);
      throw error;
    }
    
    return data ? parseExport(data) : null;
  } catch (error) {
    console.error('Error in recordExport:', error);
    return null;
  }
}

/**
 * Get all exports for a document instance
 */
export async function getDocumentExportHistory(
  documentInstanceId: string
): Promise<DocumentExport[]> {
  try {
    // Using raw query approach to avoid type instantiation issues with new table
    const { data, error } = await supabase
      .from('document_exports' as 'invoices')
      .select('*')
      .eq('document_instance_id' as 'id', documentInstanceId)
      .order('exported_at' as 'id', { ascending: false });
    
    if (error) {
      console.error('Error fetching export history:', error);
      return [];
    }
    
    return ((data as unknown as Record<string, unknown>[]) || []).map(parseExport);
  } catch (error) {
    console.error('Error in getDocumentExportHistory:', error);
    return [];
  }
}

/**
 * Download a previously exported PDF from storage
 */
export async function downloadExportedPdf(
  storagePath: string,
  filename: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('document-exports')
      .download(storagePath);
    
    if (error || !data) {
      console.error('Error downloading PDF:', error);
      return false;
    }
    
    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error in downloadExportedPdf:', error);
    return false;
  }
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getPlanLimits } from '@/lib/planLimits';
import { canGenerateThumbnail } from '@/hooks/use-background-thumbnail-generation';

export interface Attachment {
  id: string;
  case_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  name?: string | null;
  description?: string | null;
  tags?: string[] | null;
  ai_tags?: string[] | null;
  preview_path?: string | null;
  preview_status?: string | null;
  preview_generated_at?: string | null;
  folder_id?: string | null;
}

export interface AttachmentFolder {
  id: string;
  name: string;
  color: string;
  case_id: string;
  organization_id: string;
  parent_folder_id?: string | null;
  created_at?: string;
  created_by?: string;
}

export interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'complete' | 'error';
  progress?: number;
}

interface UseAttachmentsOptions {
  caseId: string;
  onThumbnailQueueAdd?: (attachments: Attachment[]) => void;
}

export function useAttachments({ caseId, onThumbnailQueueAdd }: UseAttachmentsOptions) {
  const { organization } = useOrganization();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [folders, setFolders] = useState<AttachmentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [sharedAttachmentIds, setSharedAttachmentIds] = useState<Set<string>>(new Set());

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    try {
      if (!organization?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('case_attachments')
        .select('*')
        .eq('case_id', caseId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attachments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [caseId, organization?.id]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      if (!organization?.id) return;

      const { data, error } = await supabase
        .from('attachment_folders')
        .select('*')
        .eq('case_id', caseId)
        .eq('organization_id', organization.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setFolders((data as AttachmentFolder[]) || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  }, [caseId, organization?.id]);

  // Fetch shared status
  const fetchSharedStatus = useCallback(async () => {
    try {
      if (attachments.length === 0) return;

      const attachmentIds = attachments.map((a) => a.id);

      const { data, error } = await supabase
        .from('attachment_access')
        .select('attachment_id')
        .in('attachment_id', attachmentIds)
        .eq('attachment_type', 'case')
        .is('revoked_at', null)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) throw error;

      const sharedIds = new Set(data?.map((d) => d.attachment_id) || []);
      setSharedAttachmentIds(sharedIds);
    } catch (error) {
      console.error('Error fetching shared status:', error);
    }
  }, [attachments]);

  // Upload files
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Check storage limits
      if (organization) {
        const planLimits = getPlanLimits(organization.subscription_product_id);
        const totalNewSize = fileArray.reduce((sum, file) => sum + file.size, 0);
        const totalNewSizeGb = totalNewSize / (1024 * 1024 * 1024);
        const currentStorageGb = organization.storage_used_gb || 0;
        const projectedStorage = currentStorageGb + totalNewSizeGb;

        if (projectedStorage > planLimits.storage_gb) {
          const remainingGb = Math.max(0, planLimits.storage_gb - currentStorageGb);
          toast({
            title: 'Storage Limit Exceeded',
            description: `Your ${planLimits.name} allows ${planLimits.storage_gb} GB of storage. You have ${remainingGb.toFixed(2)} GB remaining. Please upgrade your plan to upload more files.`,
            variant: 'destructive',
          });
          return;
        }
      }

      // Create uploading entries with local previews
      const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: 'uploading' as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);
      setUploading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        for (const uploadingFile of newUploadingFiles) {
          try {
            const file = uploadingFile.file;

            // Step 1: Compute SHA-256 hash for deduplication
            const { computeFileHash } = await import('@/lib/fileHash');
            const fileHash = await computeFileHash(file);

            // Step 2: Check for existing attachment with same hash in this case
            const { data: existingAttachment } = await supabase
              .from('case_attachments')
              .select('id, file_name')
              .eq('case_id', caseId)
              .eq('file_hash', fileHash)
              .limit(1)
              .maybeSingle();

            if (existingAttachment) {
              // Duplicate found - notify user and skip upload
              toast({
                title: 'Duplicate file detected',
                description: `"${file.name}" matches existing file "${existingAttachment.file_name}"`,
              });

              // Mark as complete without uploading
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadingFile.id ? { ...f, status: 'complete' as const } : f
                )
              );
              URL.revokeObjectURL(uploadingFile.preview);
              continue; // Skip to next file
            }

            // Step 3: No duplicate - proceed with upload
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${caseId}/${crypto.randomUUID()}.${fileExt}`;

            // Upload file to storage
            const { error: uploadError } = await supabase.storage
              .from('case-attachments')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get user's organization for the attachment
            const { data: orgMember } = await supabase
              .from('organization_members')
              .select('organization_id')
              .eq('user_id', user.id)
              .limit(1)
              .single();

            const organizationId = orgMember?.organization_id;

            // Save metadata to database with pending preview status for supported types
            const canGenerate = canGenerateThumbnail(file.type || 'application/octet-stream', file.name);
            const { data: newAttachment, error: dbError } = await supabase
              .from('case_attachments')
              .insert({
                case_id: caseId,
                user_id: user.id,
                file_name: file.name,
                file_path: filePath,
                file_type: file.type || 'application/octet-stream',
                file_size: file.size,
                organization_id: organizationId,
                preview_status: canGenerate ? 'pending' : null,
                file_hash: fileHash,
              })
              .select()
              .single();

            if (dbError) throw dbError;

            // Add to thumbnail generation queue if supported
            if (newAttachment && canGenerate && onThumbnailQueueAdd) {
              onThumbnailQueueAdd([newAttachment]);
            }

            // Update status to complete
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id ? { ...f, status: 'complete' as const } : f
              )
            );

            // Cleanup blob URL
            URL.revokeObjectURL(uploadingFile.preview);
          } catch (error) {
            console.error(`Error uploading ${uploadingFile.file.name}:`, error);
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id ? { ...f, status: 'error' as const } : f
              )
            );
          }
        }

        toast({
          title: 'Success',
          description: `${fileArray.length} file(s) uploaded successfully`,
        });

        // Update organization usage
        await supabase.functions.invoke('update-org-usage');

        // Refresh attachments list
        await fetchAttachments();

        // Clear completed uploads after a delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.status === 'uploading'));
        }, 2000);
      } catch (error) {
        console.error('Error uploading files:', error);
        toast({
          title: 'Error',
          description: 'Failed to upload files',
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
      }
    },
    [caseId, organization, fetchAttachments, onThumbnailQueueAdd]
  );

  // Download attachment
  const downloadAttachment = useCallback(async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('case-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  }, []);

  // Delete attachment
  const deleteAttachment = useCallback(
    async (attachment: Attachment) => {
      if (!window.confirm(`Delete ${attachment.file_name}?`)) return;

      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('case-attachments')
          .remove([attachment.file_path]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase
          .from('case_attachments')
          .delete()
          .eq('id', attachment.id);

        if (dbError) throw dbError;

        toast({
          title: 'Success',
          description: 'File deleted successfully',
        });
        fetchAttachments();
      } catch (error) {
        console.error('Error deleting file:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete file',
          variant: 'destructive',
        });
      }
    },
    [fetchAttachments]
  );

  // Update attachment
  const updateAttachment = useCallback(
    async (
      attachmentId: string,
      updates: { name?: string; description?: string | null; tags?: string[] | null }
    ) => {
      try {
        const { error } = await supabase
          .from('case_attachments')
          .update(updates)
          .eq('id', attachmentId);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Attachment updated successfully',
        });

        fetchAttachments();
        return true;
      } catch (error) {
        console.error('Error updating attachment:', error);
        toast({
          title: 'Error',
          description: 'Failed to update attachment',
          variant: 'destructive',
        });
        return false;
      }
    },
    [fetchAttachments]
  );

  // Delete tag from attachment
  const deleteTag = useCallback(
    async (attachmentId: string, tagToDelete: string, isAiTag: boolean) => {
      try {
        const attachment = attachments.find((a) => a.id === attachmentId);
        if (!attachment) return;

        const currentTags = isAiTag ? attachment.ai_tags || [] : attachment.tags || [];
        const updatedTags = currentTags.filter((tag) => tag !== tagToDelete);

        const updateData = isAiTag
          ? { ai_tags: updatedTags.length > 0 ? updatedTags : null }
          : { tags: updatedTags.length > 0 ? updatedTags : null };

        const { error } = await supabase
          .from('case_attachments')
          .update(updateData)
          .eq('id', attachmentId);

        if (error) throw error;

        toast({
          title: 'Tag removed',
          description: `Tag "${tagToDelete}" has been removed`,
        });

        fetchAttachments();
      } catch (error) {
        console.error('Error deleting tag:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove tag',
          variant: 'destructive',
        });
      }
    },
    [attachments, fetchAttachments]
  );

  // Initial fetch
  useEffect(() => {
    fetchAttachments();
    fetchFolders();
  }, [fetchAttachments, fetchFolders]);

  // Fetch shared status when attachments change
  useEffect(() => {
    if (attachments.length > 0) {
      fetchSharedStatus();
    }
  }, [attachments, fetchSharedStatus]);

  // Calculate folder counts
  const attachmentCounts = folders.reduce(
    (acc, folder) => {
      acc[folder.id] = attachments.filter((a) => a.folder_id === folder.id).length;
      return acc;
    },
    {} as Record<string, number>
  );
  const unfiledCount = attachments.filter((a) => !a.folder_id).length;

  return {
    // Data
    attachments,
    folders,
    sharedAttachmentIds,
    uploadingFiles,
    attachmentCounts,
    unfiledCount,

    // State
    loading,
    uploading,
    organizationId: organization?.id,

    // Actions
    fetchAttachments,
    fetchFolders,
    fetchSharedStatus,
    uploadFiles,
    downloadAttachment,
    deleteAttachment,
    updateAttachment,
    deleteTag,
  };
}

export default useAttachments;

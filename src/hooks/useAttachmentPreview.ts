import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Attachment } from '@/hooks/useAttachments';
import { usePreviewLogging } from '@/hooks/use-preview-logging';

interface UseAttachmentPreviewOptions {
  attachment: Attachment | null;
}

export function useAttachmentPreview({ attachment }: UseAttachmentPreviewOptions) {
  const { logPreview } = usePreviewLogging();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobData, setBlobData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup function for blob URL
  const cleanupBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);
    setBlobData(null);
    setError(null);
  }, []);

  useEffect(() => {
    const loadPreviewBlob = async () => {
      if (!attachment) {
        cleanupBlobUrl();
        return;
      }

      setLoading(true);
      setError(null);
      cleanupBlobUrl();

      try {
        const { data, error: downloadError } = await supabase.storage
          .from('case-attachments')
          .download(attachment.file_path);

        if (downloadError) throw downloadError;
        if (!data) throw new Error('No data received');

        // Create blob URL first (for non-PDF previews and download)
        const url = URL.createObjectURL(data);
        blobUrlRef.current = url;
        setBlobUrl(url);

        // For PDFs, get ArrayBuffer from a fresh blob read
        if (attachment.file_type.includes('pdf')) {
          const arrayBuffer = await data.arrayBuffer();
          setBlobData(arrayBuffer);
        }

        // Log the modal preview for audit
        logPreview(attachment.id, 'case', 'modal');
      } catch (err) {
        console.error('Error loading file preview:', err);
        setError('Failed to load file preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreviewBlob();

    return cleanupBlobUrl;
  }, [attachment, cleanupBlobUrl, logPreview]);

  return {
    blobUrl,
    blobData,
    loading,
    error,
  };
}

export default useAttachmentPreview;

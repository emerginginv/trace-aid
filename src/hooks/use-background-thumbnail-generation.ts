import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generatePdfThumbnail, isPdfFile } from '@/lib/pdfThumbnail';
import { generateVideoThumbnail, isVideoFile } from '@/lib/videoThumbnail';
import { generateDocxThumbnail, isDocxFile } from '@/lib/docxThumbnail';

export interface ThumbnailJob {
  attachmentId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  organizationId: string;
  status: 'pending' | 'generating' | 'uploading' | 'complete' | 'failed';
  attempts: number;
  error?: string;
}

interface ThumbnailProgress {
  total: number;
  completed: number;
  failed: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

export function canGenerateThumbnail(fileType: string, fileName: string): boolean {
  return (
    fileType.startsWith('image/') ||
    isPdfFile(fileType, fileName) ||
    isVideoFile(fileType, fileName) ||
    isDocxFile(fileType, fileName)
  );
}

async function resizeImage(blob: Blob, options: { width: number; height: number }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate aspect ratio
      const aspectRatio = img.width / img.height;
      let targetWidth = options.width;
      let targetHeight = options.height;

      if (aspectRatio > options.width / options.height) {
        targetHeight = options.width / aspectRatio;
      } else {
        targetWidth = options.height * aspectRatio;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export function useBackgroundThumbnailGeneration() {
  const [queue, setQueue] = useState<ThumbnailJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const queueRef = useRef<ThumbnailJob[]>([]);

  // Keep ref in sync with state
  queueRef.current = queue;

  const getProgress = useCallback((): ThumbnailProgress => {
    const total = queue.length;
    const completed = queue.filter(j => j.status === 'complete').length;
    const failed = queue.filter(j => j.status === 'failed').length;
    return { total, completed, failed };
  }, [queue]);

  const updateJobStatus = useCallback((
    attachmentId: string,
    updates: Partial<ThumbnailJob>
  ) => {
    setQueue(prev => prev.map(job => 
      job.attachmentId === attachmentId ? { ...job, ...updates } : job
    ));
  }, []);

  const generateThumbnail = useCallback(async (job: ThumbnailJob): Promise<void> => {
    const { attachmentId, filePath, fileName, fileType, organizationId } = job;

    // Update status to generating
    updateJobStatus(attachmentId, { status: 'generating' });

    // Also update DB status
    await supabase
      .from('case_attachments')
      .update({ preview_status: 'generating' })
      .eq('id', attachmentId);

    // Download the original file
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('case-attachments')
      .download(filePath);

    if (downloadError) throw downloadError;
    if (!fileBlob) throw new Error('No file data received');

    // Generate thumbnail based on file type
    let thumbnailBlob: Blob;
    const thumbnailOptions = { width: 400, height: 300 };

    if (isPdfFile(fileType, fileName)) {
      thumbnailBlob = await generatePdfThumbnail(fileBlob, thumbnailOptions);
    } else if (isVideoFile(fileType, fileName)) {
      thumbnailBlob = await generateVideoThumbnail(fileBlob, thumbnailOptions);
    } else if (isDocxFile(fileType, fileName)) {
      thumbnailBlob = await generateDocxThumbnail(fileBlob, thumbnailOptions);
    } else if (fileType.startsWith('image/')) {
      thumbnailBlob = await resizeImage(fileBlob, thumbnailOptions);
    } else {
      throw new Error('Unsupported file type for thumbnail generation');
    }

    // Update status to uploading
    updateJobStatus(attachmentId, { status: 'uploading' });

    // Upload thumbnail to storage
    const previewPath = `previews/${organizationId}/${attachmentId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('case-attachments')
      .upload(previewPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Update database with preview path
    const { error: dbError } = await supabase
      .from('case_attachments')
      .update({
        preview_path: previewPath,
        preview_status: 'complete',
        preview_generated_at: new Date().toISOString(),
      })
      .eq('id', attachmentId);

    if (dbError) throw dbError;

    // Update job status
    updateJobStatus(attachmentId, { status: 'complete' });
  }, [updateJobStatus]);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    while (true) {
      // Find next pending job
      const currentQueue = queueRef.current;
      const pendingJob = currentQueue.find(j => j.status === 'pending');
      
      if (!pendingJob) break;

      try {
        await generateThumbnail(pendingJob);
      } catch (error) {
        console.error('Thumbnail generation failed:', error);
        const newAttempts = pendingJob.attempts + 1;

        if (newAttempts < MAX_RETRIES) {
          // Schedule retry with exponential backoff
          const delay = RETRY_DELAYS[newAttempts - 1] || 4000;
          updateJobStatus(pendingJob.attachmentId, {
            status: 'pending',
            attempts: newAttempts,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Mark as failed after max retries
          updateJobStatus(pendingJob.attachmentId, {
            status: 'failed',
            attempts: newAttempts,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Update DB status to failed
          await supabase
            .from('case_attachments')
            .update({ preview_status: 'failed' })
            .eq('id', pendingJob.attachmentId);
        }
      }
    }

    processingRef.current = false;
    setIsProcessing(false);
  }, [generateThumbnail, updateJobStatus]);

  const addToQueue = useCallback((attachments: Array<{
    id: string;
    file_path: string;
    file_name: string;
    file_type: string;
    organization_id?: string | null;
  }>) => {
    const newJobs: ThumbnailJob[] = attachments
      .filter(a => canGenerateThumbnail(a.file_type, a.file_name))
      .filter(a => !queueRef.current.some(j => j.attachmentId === a.id))
      .map(a => ({
        attachmentId: a.id,
        filePath: a.file_path,
        fileName: a.file_name,
        fileType: a.file_type,
        organizationId: a.organization_id || '',
        status: 'pending' as const,
        attempts: 0,
      }));

    if (newJobs.length > 0) {
      setQueue(prev => [...prev, ...newJobs]);
      // Start processing after state update
      setTimeout(() => processQueue(), 0);
    }
  }, [processQueue]);

  const retryFailed = useCallback(() => {
    setQueue(prev => prev.map(job => 
      job.status === 'failed' 
        ? { ...job, status: 'pending' as const, attempts: 0, error: undefined }
        : job
    ));
    setTimeout(() => processQueue(), 0);
  }, [processQueue]);

  const retryOne = useCallback((attachmentId: string) => {
    setQueue(prev => prev.map(job => 
      job.attachmentId === attachmentId && job.status === 'failed'
        ? { ...job, status: 'pending' as const, attempts: 0, error: undefined }
        : job
    ));
    setTimeout(() => processQueue(), 0);
  }, [processQueue]);

  const cancelPending = useCallback(() => {
    setQueue(prev => prev.filter(job => job.status !== 'pending'));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(job => job.status !== 'complete'));
  }, []);

  const failedJobs = queue.filter(j => j.status === 'failed');
  const activeJobs = queue.filter(j => 
    j.status === 'pending' || j.status === 'generating' || j.status === 'uploading'
  );

  return {
    queue,
    isProcessing,
    progress: getProgress(),
    failedJobs,
    activeJobs,
    addToQueue,
    retryFailed,
    retryOne,
    cancelPending,
    clearCompleted,
  };
}

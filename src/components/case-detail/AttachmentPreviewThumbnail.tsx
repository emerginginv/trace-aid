import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, ImageIcon, Video, Music, File, Loader2 } from 'lucide-react';
import { generatePdfThumbnail, isPdfFile } from '@/lib/pdfThumbnail';
import { cn } from '@/lib/utils';

interface AttachmentPreviewThumbnailProps {
  filePath: string;
  fileName: string;
  fileType: string;
  previewPath?: string | null;
  previewStatus?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onPreviewGenerated?: (previewPath: string) => void;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-20 w-20',
  lg: 'h-40 w-full',
};

export function AttachmentPreviewThumbnail({
  filePath,
  fileName,
  fileType,
  previewPath,
  previewStatus,
  size = 'sm',
  className,
  onPreviewGenerated,
}: AttachmentPreviewThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const thumbnailUrlRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrlRef.current) {
        URL.revokeObjectURL(thumbnailUrlRef.current);
      }
    };
  }, []);

  // Load thumbnail when visible
  useEffect(() => {
    if (!isVisible) return;

    const loadThumbnail = async () => {
      // For images, download and display directly
      if (fileType.startsWith('image/')) {
        await loadImageThumbnail();
        return;
      }

      // For PDFs, check if we have a pre-generated preview
      if (isPdfFile(fileType, fileName)) {
        if (previewPath && previewStatus === 'complete') {
          // Load existing preview
          await loadPreviewImage(previewPath);
        } else {
          // Generate thumbnail on-the-fly
          await generateAndLoadPdfThumbnail();
        }
        return;
      }

      // For videos, we could add video thumbnail extraction here
      if (fileType.startsWith('video/')) {
        await loadVideoThumbnail();
        return;
      }

      // For other file types, just show an icon (no loading needed)
      setError(true);
    };

    loadThumbnail();
  }, [isVisible, filePath, fileType, fileName, previewPath, previewStatus]);

  const loadImageThumbnail = async () => {
    setLoading(true);
    setError(false);

    try {
      const { data, error } = await supabase.storage
        .from('case-attachments')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      if (thumbnailUrlRef.current) {
        URL.revokeObjectURL(thumbnailUrlRef.current);
      }
      thumbnailUrlRef.current = url;
      setThumbnailUrl(url);
    } catch (err) {
      console.error('Error loading image thumbnail:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadPreviewImage = async (path: string) => {
    setLoading(true);
    setError(false);

    try {
      const { data, error } = await supabase.storage
        .from('case-attachments')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      if (thumbnailUrlRef.current) {
        URL.revokeObjectURL(thumbnailUrlRef.current);
      }
      thumbnailUrlRef.current = url;
      setThumbnailUrl(url);
    } catch (err) {
      console.error('Error loading preview image:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const generateAndLoadPdfThumbnail = async () => {
    setLoading(true);
    setError(false);

    try {
      // Download the PDF
      const { data: pdfBlob, error: downloadError } = await supabase.storage
        .from('case-attachments')
        .download(filePath);

      if (downloadError) throw downloadError;

      // Generate thumbnail
      const thumbnailBlob = await generatePdfThumbnail(pdfBlob, {
        width: size === 'lg' ? 600 : 200,
        height: size === 'lg' ? 400 : 150,
      });

      const url = URL.createObjectURL(thumbnailBlob);
      if (thumbnailUrlRef.current) {
        URL.revokeObjectURL(thumbnailUrlRef.current);
      }
      thumbnailUrlRef.current = url;
      setThumbnailUrl(url);
    } catch (err) {
      console.error('Error generating PDF thumbnail:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadVideoThumbnail = async () => {
    setLoading(true);
    setError(false);

    try {
      const { data, error } = await supabase.storage
        .from('case-attachments')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      if (thumbnailUrlRef.current) {
        URL.revokeObjectURL(thumbnailUrlRef.current);
      }
      thumbnailUrlRef.current = url;
      setThumbnailUrl(url);
    } catch (err) {
      console.error('Error loading video thumbnail:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
    if (fileType.startsWith('video/')) return <Video className="h-6 w-6 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <Music className="h-6 w-6 text-green-500" />;
    if (isPdfFile(fileType, fileName)) return <FileText className="h-6 w-6 text-red-500" />;
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'doc' || extension === 'docx') return <FileText className="h-6 w-6 text-blue-600" />;
    return <File className="h-6 w-6 text-muted-foreground" />;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex items-center justify-center bg-muted rounded overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : thumbnailUrl ? (
        fileType.startsWith('video/') ? (
          <video
            src={thumbnailUrl}
            className="w-full h-full object-cover"
            muted
          />
        ) : (
          <img
            src={thumbnailUrl}
            alt={fileName}
            className="w-full h-full object-cover"
          />
        )
      ) : (
        getFileIcon()
      )}
    </div>
  );
}

/**
 * Video Thumbnail Generator
 * Extracts a poster frame from video files using HTML5 video element and Canvas API
 */

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  seekPercent?: number; // What percentage through video to capture (default 10%)
}

/**
 * Generates a thumbnail from a video file by extracting a frame
 */
export async function generateVideoThumbnail(
  source: Blob | File,
  options: ThumbnailOptions = {}
): Promise<Blob> {
  const {
    width = 320,
    height = 240,
    quality = 0.8,
    seekPercent = 0.1, // 10% through video to avoid black intro frames
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Timeout after 10 seconds for large videos
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail generation timed out'));
    }, 10000);

    const blobUrl = URL.createObjectURL(source);

    const cleanup = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      video.src = '';
      video.load();
    };

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Seek to specified percentage of video
      const seekTime = video.duration * seekPercent;
      video.currentTime = Math.min(seekTime, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        const videoAspect = video.videoWidth / video.videoHeight;
        const targetAspect = width / height;
        
        let drawWidth = width;
        let drawHeight = height;
        
        if (videoAspect > targetAspect) {
          drawHeight = width / videoAspect;
        } else {
          drawWidth = height * videoAspect;
        }

        canvas.width = width;
        canvas.height = height;
        
        // Fill with dark background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        
        // Center the video frame
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;
        
        ctx.drawImage(video, x, y, drawWidth, drawHeight);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate video thumbnail blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    video.src = blobUrl;
  });
}

/**
 * Checks if a file is a video based on MIME type or extension
 */
export function isVideoFile(fileType: string, fileName: string): boolean {
  if (fileType.startsWith('video/')) return true;
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv', 'ogg', 'wmv', 'flv'].includes(ext || '');
}

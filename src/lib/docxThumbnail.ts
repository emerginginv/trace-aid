/**
 * DOCX Thumbnail Generator
 * Generates a first-page preview for DOCX files using mammoth.js
 */

import { loadMammoth, isPreviewEnvironment } from './dynamicImports';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Generates a thumbnail from a DOCX file by extracting and rendering text
 */
export async function generateDocxThumbnail(
  source: Blob | File,
  options: ThumbnailOptions = {}
): Promise<Blob> {
  // Skip thumbnail generation in preview environments
  if (isPreviewEnvironment()) {
    throw new Error('DOCX thumbnails are available in production builds only.');
  }

  const {
    width = 320,
    height = 240,
    quality = 0.9,
  } = options;

  return new Promise(async (resolve, reject) => {
    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      reject(new Error('DOCX thumbnail generation timed out'));
    }, 5000);

    try {
      // Load mammoth dynamically
      const mammoth = await loadMammoth();
      
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await source.arrayBuffer();
      
      // Extract raw text from DOCX
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value.trim();
      
      clearTimeout(timeout);
      
      if (!text) {
        reject(new Error('No text content found in DOCX'));
        return;
      }

      // Create canvas and render text
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = width;
      canvas.height = height;

      // White background like a document
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Add subtle page shadow/border effect
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

      // Document styling
      const padding = 16;
      const lineHeight = 14;
      const fontSize = 10;
      const maxWidth = width - (padding * 2);

      ctx.fillStyle = '#374151';
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textBaseline = 'top';

      // Wrap and render text
      const lines = wrapText(ctx, text, maxWidth);
      const maxLines = Math.floor((height - padding * 2) / lineHeight);
      
      lines.slice(0, maxLines).forEach((line, index) => {
        const y = padding + (index * lineHeight);
        ctx.fillText(line, padding, y);
      });

      // Add fade-out effect at bottom if text continues
      if (lines.length > maxLines) {
        const gradient = ctx.createLinearGradient(0, height - 40, 0, height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 40, width, 40);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate DOCX thumbnail blob'));
          }
        },
        'image/jpeg',
        quality
      );
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

/**
 * Wraps text to fit within a maximum width
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n+/);
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(/\s+/);
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

/**
 * Checks if a file is a DOCX based on MIME type or extension
 */
export function isDocxFile(fileType: string, fileName: string): boolean {
  if (fileType.includes('vnd.openxmlformats-officedocument.wordprocessingml')) return true;
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext === 'docx';
}

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker source (use CDN for simplicity)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-1 for JPEG quality
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  width: 400,
  height: 300,
  quality: 0.8,
};

/**
 * Generate a thumbnail from a PDF file or ArrayBuffer
 * Returns a JPEG Blob of the first page
 */
export async function generatePdfThumbnail(
  source: File | ArrayBuffer | Blob,
  options: ThumbnailOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Convert source to ArrayBuffer if needed
  let arrayBuffer: ArrayBuffer;
  if (source instanceof ArrayBuffer) {
    arrayBuffer = source;
  } else if ('arrayBuffer' in source && typeof source.arrayBuffer === 'function') {
    // Handle Blob and File objects
    arrayBuffer = await source.arrayBuffer();
  } else {
    throw new Error('Invalid source type');
  }

  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;

  // Get the first page
  const page = await pdfDocument.getPage(1);

  // Calculate scale to fit within the desired dimensions while maintaining aspect ratio
  const viewport = page.getViewport({ scale: 1 });
  const scaleX = opts.width / viewport.width;
  const scaleY = opts.height / viewport.height;
  const scale = Math.min(scaleX, scaleY);

  const scaledViewport = page.getViewport({ scale });

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  // Render page to canvas
  await page.render({
    canvasContext: context,
    viewport: scaledViewport,
  }).promise;

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      opts.quality
    );
  });
}

/**
 * Check if a file is a PDF based on its MIME type or extension
 */
export function isPdfFile(fileType: string, fileName: string): boolean {
  if (fileType.includes('pdf')) return true;
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
}

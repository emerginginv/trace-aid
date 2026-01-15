/**
 * Dynamic Import Utilities
 * 
 * Heavy dependencies (PDF, DOCX processing) are loaded dynamically to:
 * 1. Prevent bun install timeouts during preview builds
 * 2. Enable graceful fallbacks in preview environments
 * 3. Reduce initial bundle size
 */

/**
 * Check if we're in a preview environment where heavy dependencies aren't available
 */
export function isPreviewEnvironment(): boolean {
  // Check for preview hostname pattern
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('-preview--') || hostname.includes('preview.lovable.app')) {
      return true;
    }
  }
  return false;
}

/**
 * Cached PDF.js library reference
 */
let pdfjsLibCache: typeof import('pdfjs-dist') | null = null;

/**
 * Dynamically load PDF.js library with worker configuration
 */
export async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (isPreviewEnvironment()) {
    throw new Error('PDF preview is available in production builds only.');
  }

  if (pdfjsLibCache) {
    return pdfjsLibCache;
  }

  try {
    const pdfjsLib = await import('pdfjs-dist');
    const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;
    pdfjsLibCache = pdfjsLib;
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw new Error('PDF functionality is not available. Please try again later.');
  }
}

/**
 * Dynamically load html2pdf.js library for PDF generation
 */
export async function loadHtml2Pdf(): Promise<typeof import('html2pdf.js').default> {
  if (isPreviewEnvironment()) {
    throw new Error('PDF export is available in production builds only.');
  }

  try {
    const module = await import('html2pdf.js');
    return module.default;
  } catch (error) {
    console.error('Failed to load html2pdf.js:', error);
    throw new Error('PDF export functionality is not available. Please try again later.');
  }
}

/**
 * Dynamically load mammoth.js library for DOCX processing
 */
export async function loadMammoth(): Promise<typeof import('mammoth')> {
  if (isPreviewEnvironment()) {
    throw new Error('DOCX preview is available in production builds only.');
  }

  try {
    const module = await import('mammoth');
    return module;
  } catch (error) {
    console.error('Failed to load mammoth.js:', error);
    throw new Error('DOCX processing functionality is not available. Please try again later.');
  }
}

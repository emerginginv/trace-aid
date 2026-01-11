/**
 * AI Import Parser - Multi-format file parsing utilities
 * Supports CSV, JSON, TXT, and CSS (metadata only)
 */

import { AIUploadedFile } from './aiImportTypes';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PREVIEW_ROWS = 100;
const MAX_CONTENT_FOR_AI = 50 * 1024; // 50KB for AI analysis

/**
 * Detect file type from extension and content
 */
export function detectFileType(file: File): AIUploadedFile['type'] {
  const ext = file.name.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'csv':
      return 'csv';
    case 'json':
      return 'json';
    case 'txt':
    case 'md':
    case 'readme':
      return 'txt';
    case 'css':
      return 'css';
    default:
      return 'unknown';
  }
}

/**
 * Parse CSV content with proper quote handling
 */
export function parseCSVContent(content: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
        currentLine += char;
      }
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r') i++;
    } else if (char === '\r' && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (!inQuotes) {
          inQuotes = true;
        } else if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  
  return { headers, rows };
}

/**
 * Parse JSON content safely
 */
export function parseJSONContent(content: string): { headers: string[]; rows: Record<string, string>[] } {
  try {
    const data = JSON.parse(content);
    
    // Handle array of objects
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const headers = [...new Set(data.flatMap(obj => Object.keys(obj)))];
      const rows = data.map(obj => {
        const row: Record<string, string> = {};
        headers.forEach(h => {
          const val = obj[h];
          row[h] = val === null || val === undefined ? '' : String(val);
        });
        return row;
      });
      return { headers, rows };
    }
    
    // Handle single object
    if (typeof data === 'object' && !Array.isArray(data)) {
      const headers = Object.keys(data);
      const row: Record<string, string> = {};
      headers.forEach(h => {
        const val = data[h];
        row[h] = val === null || val === undefined ? '' : String(val);
      });
      return { headers, rows: [row] };
    }
    
    return { headers: [], rows: [] };
  } catch {
    return { headers: [], rows: [] };
  }
}

/**
 * Extract metadata from CSS file (NOT styles - just metadata)
 */
export function extractCSSMetadata(content: string): { 
  hasStyles: boolean;
  colorCount: number;
  fontFamilies: string[];
  warning: string;
} {
  const colorMatches = content.match(/#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\)/g) || [];
  const fontMatches = content.match(/font-family:\s*([^;]+)/gi) || [];
  const fontFamilies = fontMatches.map(m => m.replace(/font-family:\s*/i, '').trim());
  
  return {
    hasStyles: content.trim().length > 0,
    colorCount: colorMatches.length,
    fontFamilies: [...new Set(fontFamilies)],
    warning: 'CSS styles will NOT be applied to CaseWyze. This file is analyzed for documentation purposes only.'
  };
}

/**
 * Parse a file and extract content/preview
 */
export async function parseFile(file: File): Promise<Partial<AIUploadedFile>> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      status: 'error',
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }
  
  const fileType = detectFileType(file);
  
  if (fileType === 'unknown') {
    return {
      status: 'error',
      error: 'Unsupported file type. Please upload CSV, JSON, TXT, or CSS files.'
    };
  }
  
  try {
    const content = await file.text();
    
    let preview: AIUploadedFile['preview'] = {};
    
    if (fileType === 'csv') {
      const { headers, rows } = parseCSVContent(content);
      const rowObjects = rows.slice(0, MAX_PREVIEW_ROWS).map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] || '';
        });
        return obj;
      });
      preview = {
        headers,
        rows: rowObjects,
        rowCount: rows.length
      };
    } else if (fileType === 'json') {
      const { headers, rows } = parseJSONContent(content);
      preview = {
        headers,
        rows: rows.slice(0, MAX_PREVIEW_ROWS),
        rowCount: rows.length
      };
    }
    
    return {
      type: fileType,
      content: content.slice(0, MAX_CONTENT_FOR_AI), // Truncate for AI
      status: 'parsed',
      preview
    };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Failed to parse file'
    };
  }
}

/**
 * Prepare files for AI analysis
 */
export function prepareFilesForAnalysis(files: AIUploadedFile[]): {
  name: string;
  type: string;
  content: string;
  rowCount?: number;
  headers?: string[];
}[] {
  return files
    .filter(f => f.status === 'parsed')
    .map(f => ({
      name: f.name,
      type: f.type,
      content: f.content.slice(0, MAX_CONTENT_FOR_AI),
      rowCount: f.preview?.rowCount,
      headers: f.preview?.headers
    }));
}

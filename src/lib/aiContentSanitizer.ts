/**
 * AI Content Sanitizer
 * 
 * Ensures all AI-generated letter content:
 * 1. Inserts text inside predefined HTML regions only
 * 2. Respects existing section structure
 * 3. Never contains raw layout or styling instructions
 * 4. Never alters page sizing, margins, or pagination rules
 */

import DOMPurify from 'dompurify';

// ============================================
// TYPES
// ============================================

export interface SanitizationResult {
  clean: string;
  violations: string[];
  wasModified: boolean;
}

export interface ContentConstraints {
  allowedTags?: string[];
  maxContentLength?: number;
  preserveBindings?: string[];
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Tags allowed in AI-generated content (content-only, no layout)
 */
export const ALLOWED_CONTENT_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u',
  'ul', 'ol', 'li',
  'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'hr'
];

/**
 * CSS properties that affect layout and are forbidden
 */
const FORBIDDEN_CSS_PROPERTIES = [
  'position',
  'float',
  'display',
  'margin',
  'padding',
  'width',
  'height',
  'max-width',
  'max-height',
  'min-width',
  'min-height',
  'top',
  'left',
  'right',
  'bottom',
  'z-index',
  'page-break',
  'break-before',
  'break-after',
  'break-inside',
  'page',
  'column',
  'columns',
  'grid',
  'flex',
  'transform',
  'font-size',
  'font-family',
  'line-height',
  'letter-spacing'
];

/**
 * Patterns that should never appear in AI content
 */
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // Style blocks
  { pattern: /<style[\s\S]*?<\/style>/gi, description: '<style> block' },
  
  // Script blocks
  { pattern: /<script[\s\S]*?<\/script>/gi, description: '<script> block' },
  
  // Event handlers
  { pattern: /\bon\w+\s*=/gi, description: 'event handler attribute' },
  
  // @page rules
  { pattern: /@page\s*{/gi, description: '@page CSS rule' },
  
  // @media print rules
  { pattern: /@media\s+print/gi, description: '@media print rule' },
  
  // CSS import
  { pattern: /@import\s/gi, description: '@import rule' },
];

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Check for forbidden CSS properties in inline styles
 */
function detectForbiddenCss(html: string): string[] {
  const violations: string[] = [];
  
  // Match all style attributes
  const styleMatches = html.matchAll(/style\s*=\s*["']([^"']*)["']/gi);
  
  for (const match of styleMatches) {
    const styleValue = match[1].toLowerCase();
    
    for (const prop of FORBIDDEN_CSS_PROPERTIES) {
      if (styleValue.includes(prop)) {
        violations.push(`Forbidden CSS property: ${prop}`);
      }
    }
  }
  
  return violations;
}

/**
 * Check for forbidden patterns in content
 */
function detectForbiddenPatterns(html: string): string[] {
  const violations: string[] = [];
  
  for (const { pattern, description } of FORBIDDEN_PATTERNS) {
    if (pattern.test(html)) {
      violations.push(`Forbidden pattern: ${description}`);
    }
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
  }
  
  return violations;
}

/**
 * Strip all style attributes from HTML
 */
function stripStyleAttributes(html: string): string {
  return html.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
}

/**
 * Strip class attributes that might affect layout
 */
function stripLayoutClasses(html: string): string {
  // Remove class attributes entirely to prevent any layout interference
  // AI content should not have any classes - template controls styling
  return html.replace(/\s*class\s*=\s*["'][^"']*["']/gi, '');
}

/**
 * Main sanitization function for AI-generated content
 * 
 * @param html - Raw HTML from AI
 * @param constraints - Optional constraints for validation
 * @returns Sanitization result with clean HTML and any violations
 */
export function sanitizeAiContent(
  html: string,
  constraints?: ContentConstraints
): SanitizationResult {
  const violations: string[] = [];
  let wasModified = false;
  
  if (!html || typeof html !== 'string') {
    return { clean: '', violations: ['Empty or invalid input'], wasModified: true };
  }
  
  // Step 1: Detect violations (for logging)
  violations.push(...detectForbiddenPatterns(html));
  violations.push(...detectForbiddenCss(html));
  
  // Step 2: Remove forbidden patterns
  let cleaned = html;
  
  for (const { pattern } of FORBIDDEN_PATTERNS) {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, '');
    if (before !== cleaned) wasModified = true;
    pattern.lastIndex = 0;
  }
  
  // Step 3: Strip all style attributes
  const beforeStyle = cleaned;
  cleaned = stripStyleAttributes(cleaned);
  if (beforeStyle !== cleaned) wasModified = true;
  
  // Step 4: Strip class attributes
  const beforeClass = cleaned;
  cleaned = stripLayoutClasses(cleaned);
  if (beforeClass !== cleaned) wasModified = true;
  
  // Step 5: Use DOMPurify for final sanitization with allowed tags
  const allowedTags = constraints?.allowedTags || ALLOWED_CONTENT_TAGS;
  
  cleaned = DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['href', 'target', 'rel'], // Only allow minimal attributes
    KEEP_CONTENT: true,
    FORBID_ATTR: ['style', 'class', 'id', 'onclick', 'onload', 'onerror'],
  });
  
  // Step 6: Validate length if specified
  if (constraints?.maxContentLength && cleaned.length > constraints.maxContentLength) {
    violations.push(`Content exceeds maximum length of ${constraints.maxContentLength}`);
    cleaned = cleaned.substring(0, constraints.maxContentLength);
    wasModified = true;
  }
  
  // Step 7: Verify preserved bindings if specified
  if (constraints?.preserveBindings) {
    for (const binding of constraints.preserveBindings) {
      if (!cleaned.includes(binding)) {
        violations.push(`Required binding missing: ${binding}`);
      }
    }
  }
  
  return {
    clean: cleaned.trim(),
    violations,
    wasModified
  };
}

/**
 * Validate that section content doesn't break template structure
 */
export function validateSectionContent(
  sectionType: string,
  content: string,
  isLocked: boolean
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Locked sections cannot be modified by AI
  if (isLocked) {
    errors.push(`Section "${sectionType}" is locked and cannot be modified by AI`);
  }
  
  // Check for layout-breaking patterns
  const layoutPatterns = [
    { pattern: /position\s*:\s*(absolute|fixed|relative)/i, msg: 'position CSS' },
    { pattern: /float\s*:/i, msg: 'float CSS' },
    { pattern: /display\s*:\s*(flex|grid|none)/i, msg: 'display CSS' },
    { pattern: /@page/i, msg: '@page rule' },
    { pattern: /page-break/i, msg: 'page-break' },
  ];
  
  for (const { pattern, msg } of layoutPatterns) {
    if (pattern.test(content)) {
      errors.push(`Content contains forbidden ${msg}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Get default constraints for a letter section type
 */
export function getDefaultConstraints(sectionType: string): ContentConstraints {
  const baseConstraints: ContentConstraints = {
    allowedTags: ALLOWED_CONTENT_TAGS,
    maxContentLength: 50000, // ~50KB max per section
  };
  
  // Add section-specific preserved bindings
  switch (sectionType) {
    case 'signature':
      return {
        ...baseConstraints,
        preserveBindings: ['{{signature_name}}', '{{signature_title}}'],
      };
    case 'letterhead':
      return {
        ...baseConstraints,
        preserveBindings: ['{{company_name}}', '{{org_logo}}'],
      };
    case 'date_block':
      return {
        ...baseConstraints,
        preserveBindings: ['{{current_date}}'],
      };
    default:
      return baseConstraints;
  }
}

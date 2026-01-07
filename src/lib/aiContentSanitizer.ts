/**
 * AI Content Sanitizer
 * 
 * Ensures all AI-generated letter content:
 * 1. Inserts text inside predefined HTML regions only
 * 2. Respects existing section structure
 * 3. Never contains raw layout or styling instructions
 * 4. Never alters page sizing, margins, or pagination rules
 * 5. BODY-ONLY: AI may only generate body paragraph content
 */

import DOMPurify from 'dompurify';

// ============================================
// AI CONTENT BOUNDARY RULES
// ============================================

/**
 * AI CONTENT BOUNDARY RULES
 * 
 * AI-generated content is STRICTLY LIMITED to these sections.
 * All other sections are SYSTEM-CONTROLLED.
 * 
 * AI RESTRICTIONS (Enforced at generation and validation):
 * 
 * AI MUST NOT:
 * - Insert headers
 * - Insert dates
 * - Insert logos
 * - Insert addresses
 * - Control spacing
 * - Modify layout
 * 
 * AI MAY ONLY:
 * - Draft paragraph content
 * - Suggest tone refinements
 * - Rewrite body text
 */
export const AI_EDITABLE_SECTIONS = ['body', 'statutory_block'] as const;

export const SYSTEM_CONTROLLED_SECTIONS = [
  'letterhead', 'date_block', 'recipient_block', 
  'reference', 'salutation', 'closing', 
  'signature_block', 'footer'
] as const;

// ============================================
// AI CASE SCOPE BOUNDARIES
// ============================================

/**
 * AI CASE SCOPE BOUNDARIES
 * 
 * Case-scoped AI operates ONLY inside placeholders.
 * It fills {{PLACEHOLDER}} slots with case-specific content.
 * It NEVER alters the template structure.
 */
export const AI_CASE_SCOPE = {
  // Allowed output types
  ALLOWED_CONTENT_TYPES: [
    'fee_waiver_justification',
    'expedited_justification',
    'purpose_of_request',
    'tone_refinement',
  ],
  
  // Maximum content length per field
  MAX_JUSTIFICATION_LENGTH: 2000,
  
  // Allowed output tags (minimal - content only)
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
  
  // Forbidden patterns (template elements)
  FORBIDDEN_IN_CASE_CONTENT: [
    /\{\{[A-Z_]+\}\}/,      // Placeholders (should not generate these)
    /\[IF\s+\w+\]/,         // Conditionals
    /\[\/IF\]/,             // End conditionals
    /<style/i,              // Style blocks
    /<div\s+class=/i,       // Layout classes
    /position\s*:/i,        // CSS positioning
    /margin\s*:/i,          // CSS margins
    /padding\s*:/i,         // CSS padding
  ],
} as const;

/**
 * Validate and sanitize case-scoped AI output
 * 
 * This is for content that fills {{PLACEHOLDER}} slots in templates.
 * It must be pure text content without any template or layout elements.
 */
export function sanitizeCaseScopedContent(
  content: string,
  fieldType: string
): { clean: string; violations: string[] } {
  const violations: string[] = [];
  let clean = content;

  // Check for forbidden patterns
  for (const pattern of AI_CASE_SCOPE.FORBIDDEN_IN_CASE_CONTENT) {
    if (pattern.test(clean)) {
      violations.push(`Content contains forbidden pattern: ${pattern.source}`);
      clean = clean.replace(pattern, '');
    }
    pattern.lastIndex = 0;
  }

  // Strip any HTML tags - case content should be plain text
  clean = clean.replace(/<[^>]+>/g, '');

  // Strip markdown formatting
  clean = clean
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1')     // Italic
    .replace(/##\s*/g, '')             // Headers
    .replace(/`([^`]+)`/g, '$1');      // Code

  // Enforce length limit
  if (clean.length > AI_CASE_SCOPE.MAX_JUSTIFICATION_LENGTH) {
    violations.push(`Content exceeds maximum length of ${AI_CASE_SCOPE.MAX_JUSTIFICATION_LENGTH}`);
    clean = clean.substring(0, AI_CASE_SCOPE.MAX_JUSTIFICATION_LENGTH);
  }

  return { clean: clean.trim(), violations };
}

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
 * Detect if AI content contains system-controlled elements
 * 
 * AI MUST NOT generate these sections - they are system-controlled:
 * - Letterhead/headers
 * - Date blocks
 * - Recipient addresses
 * - Signature blocks
 * - Footers
 */
export function detectSystemSectionIntrusion(html: string): {
  hasIntrusion: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Patterns that indicate AI is trying to generate system sections
  const intrusionPatterns = [
    // Date blocks
    { pattern: /<div[^>]*class="[^"]*letter-date[^"]*"/gi, msg: 'AI generated date block' },
    { pattern: /class="[^"]*letterhead/gi, msg: 'AI generated letterhead' },
    { pattern: /class="[^"]*letter-recipient/gi, msg: 'AI generated recipient block' },
    { pattern: /class="[^"]*letter-signature/gi, msg: 'AI generated signature block' },
    { pattern: /class="[^"]*letter-footer/gi, msg: 'AI generated footer' },
    
    // Standalone date formats at start of content
    { pattern: /^<p>\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\s*<\/p>/i, msg: 'AI generated standalone date' },
    
    // Signature patterns - closing phrase followed by name blocks
    { pattern: /Sincerely,?\s*<\/p>\s*<p[^>]*>[\s\S]{0,100}<\/p>\s*<p[^>]*>[\s\S]{0,100}<\/p>\s*$/i, msg: 'AI generated signature block' },
    
    // Address block patterns (multi-line with state/zip)
    { pattern: /<p>[^<]+<br\s*\/?>[^<]+<br\s*\/?>[^<]+,\s*[A-Z]{2}\s+\d{5}/gi, msg: 'AI generated address block' },
    
    // Logo references
    { pattern: /<img[^>]*logo/gi, msg: 'AI inserted logo reference' },
    
    // Letterhead-style org name at start
    { pattern: /^<div[^>]*>\s*<(?:h1|h2|div)[^>]*class="[^"]*org-name/gi, msg: 'AI generated letterhead org name' },
  ];
  
  for (const { pattern, msg } of intrusionPatterns) {
    if (pattern.test(html)) {
      violations.push(msg);
    }
    pattern.lastIndex = 0;
  }
  
  return {
    hasIntrusion: violations.length > 0,
    violations
  };
}

/**
 * Strip system section patterns from AI content
 * This is a safety net - AI should not be generating these
 */
function stripSystemSectionPatterns(html: string): string {
  let cleaned = html;
  
  // Remove standalone date at the very beginning
  cleaned = cleaned.replace(/^<p>\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\s*<\/p>\s*/i, '');
  
  // Remove elements with system-controlled classes
  const systemClasses = ['letter-date', 'letter-letterhead', 'letter-recipient', 'letter-signature', 'letter-footer', 'letterhead'];
  for (const cls of systemClasses) {
    const regex = new RegExp(`<div[^>]*class="[^"]*${cls}[^"]*"[^>]*>[\\s\\S]*?<\\/div>`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  return cleaned.trim();
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
  
  // Step 0: Detect system section intrusion (AI trying to generate headers, dates, etc.)
  const intrusionCheck = detectSystemSectionIntrusion(html);
  if (intrusionCheck.hasIntrusion) {
    violations.push(...intrusionCheck.violations.map(v => `INTRUSION: ${v}`));
    wasModified = true;
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
  
  // Step 3: Strip system section patterns if intrusion detected
  if (intrusionCheck.hasIntrusion) {
    const beforeIntrusion = cleaned;
    cleaned = stripSystemSectionPatterns(cleaned);
    if (beforeIntrusion !== cleaned) wasModified = true;
  }
  
  // Step 4: Strip all style attributes
  const beforeStyle = cleaned;
  cleaned = stripStyleAttributes(cleaned);
  if (beforeStyle !== cleaned) wasModified = true;
  
  // Step 5: Strip class attributes
  const beforeClass = cleaned;
  cleaned = stripLayoutClasses(cleaned);
  if (beforeClass !== cleaned) wasModified = true;
  
  // Step 6: Use DOMPurify for final sanitization with allowed tags
  const allowedTags = constraints?.allowedTags || ALLOWED_CONTENT_TAGS;
  
  cleaned = DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['href', 'target', 'rel'], // Only allow minimal attributes
    KEEP_CONTENT: true,
    FORBID_ATTR: ['style', 'class', 'id', 'onclick', 'onload', 'onerror'],
  });
  
  // Step 7: Validate length if specified
  if (constraints?.maxContentLength && cleaned.length > constraints.maxContentLength) {
    violations.push(`Content exceeds maximum length of ${constraints.maxContentLength}`);
    cleaned = cleaned.substring(0, constraints.maxContentLength);
    wasModified = true;
  }
  
  // Step 8: Verify preserved bindings if specified
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

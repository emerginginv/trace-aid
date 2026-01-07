/**
 * Letter Template Model - Single Source of Truth
 * 
 * Defines the structured model for letter templates including:
 * - HTML structure (sections, headers, footers)
 * - Print-CSS rules (page size, margins, page breaks)
 * - Data bindings (organization info, case info, user info)
 * - Optional AI-editable content regions
 */

import type { LetterCategory } from './letterCategories';
import { PAGE_SPECS, type PageSize } from './paginatedLetterStyles';

// ============================================
// SECTION TYPES
// ============================================

/**
 * Section types for modular letter composition
 */
export type LetterSectionType = 
  | 'letterhead'       // Organization branding (locked structure)
  | 'date_block'       // Date positioning (right-aligned)
  | 'recipient_block'  // Addressee information
  | 'subject_line'     // RE: line
  | 'salutation'       // Dear X,
  | 'body'             // Main content (AI-editable)
  | 'statutory_block'  // Legal citations (injected, read-only)
  | 'closing'          // Sincerely,
  | 'signature_block'  // Signature area
  | 'footer';          // Confidentiality notice

// ============================================
// DATA BINDINGS
// ============================================

/**
 * Data binding source types
 */
export type BindingSource = 
  | 'organization'     // From OrganizationProfile
  | 'case'             // From CaseVariables  
  | 'user'             // From current user profile
  | 'recipient'        // From letter-specific input
  | 'statutory'        // From jurisdiction statutes
  | 'computed';        // Derived values (dates, etc.)

/**
 * Data binding definition
 */
export interface DataBinding {
  placeholder: string;           // e.g., "{{company_name}}"
  source: BindingSource;
  sourceField: string;           // e.g., "companyName"
  required: boolean;
  defaultValue?: string;
  formatFn?: string;             // Optional format function name
}

/**
 * Standard data bindings available to all templates
 */
export const STANDARD_BINDINGS: DataBinding[] = [
  // Organization bindings
  { placeholder: '{{company_name}}', source: 'organization', sourceField: 'companyName', required: true },
  { placeholder: '{{company_address}}', source: 'organization', sourceField: 'fullAddress', required: false },
  { placeholder: '{{company_phone}}', source: 'organization', sourceField: 'phone', required: false },
  { placeholder: '{{company_email}}', source: 'organization', sourceField: 'email', required: false },
  { placeholder: '{{org_logo}}', source: 'organization', sourceField: 'logoUrl', required: false },
  { placeholder: '{{agency_license}}', source: 'organization', sourceField: 'agencyLicenseNumber', required: false },
  
  // Case bindings
  { placeholder: '{{case_title}}', source: 'case', sourceField: 'caseTitle', required: false },
  { placeholder: '{{case_number}}', source: 'case', sourceField: 'caseNumber', required: false },
  { placeholder: '{{primary_subject}}', source: 'case', sourceField: 'primarySubject.name', required: false },
  { placeholder: '{{primary_client}}', source: 'case', sourceField: 'primaryClient.name', required: false },
  { placeholder: '{{client_name}}', source: 'case', sourceField: 'primaryClient.name', required: false },
  
  // User bindings
  { placeholder: '{{signature_name}}', source: 'user', sourceField: 'fullName', required: true },
  { placeholder: '{{signature_title}}', source: 'user', sourceField: 'title', required: false },
  { placeholder: '{{user_email}}', source: 'user', sourceField: 'email', required: false },
  
  // Recipient bindings
  { placeholder: '{{recipient_name}}', source: 'recipient', sourceField: 'name', required: false },
  { placeholder: '{{recipient_title}}', source: 'recipient', sourceField: 'title', required: false },
  { placeholder: '{{recipient_address}}', source: 'recipient', sourceField: 'address', required: false },
  { placeholder: '{{recipient_organization}}', source: 'recipient', sourceField: 'organization', required: false },
  
  // Computed bindings
  { placeholder: '{{current_date}}', source: 'computed', sourceField: 'currentDate', required: true },
  { placeholder: '{{current_date_short}}', source: 'computed', sourceField: 'currentDateShort', required: true },
  { placeholder: '{{response_deadline}}', source: 'computed', sourceField: 'responseDeadline', required: false },
];

// ============================================
// LETTER SECTION
// ============================================

/**
 * Letter section definition
 */
export interface LetterSection {
  id: string;
  type: LetterSectionType;
  displayOrder: number;
  html: string;                  // Section HTML content
  isVisible: boolean;
  isLocked: boolean;             // Prevents structure changes
  isAiEditable: boolean;         // AI can modify content
  dataBindings: DataBinding[];   // Placeholders in this section
  cssClass?: string;             // Additional CSS class
}

/**
 * Default HTML templates for each section type
 */
export const DEFAULT_SECTION_TEMPLATES: Record<LetterSectionType, string> = {
  letterhead: `
    <div class="letter-letterhead">
      {{#if org_logo}}<img src="{{org_logo}}" alt="Logo" class="letterhead-logo" />{{/if}}
      <div class="org-name">{{company_name}}</div>
      <div class="org-info">{{company_address}}</div>
      <div class="org-info">{{company_phone}} | {{company_email}}</div>
    </div>
  `.trim(),
  
  date_block: `
    <div class="letter-date">{{current_date}}</div>
  `.trim(),
  
  recipient_block: `
    <div class="letter-recipient">
      <p>{{recipient_name}}</p>
      <p>{{recipient_title}}</p>
      <p>{{recipient_organization}}</p>
      <p>{{recipient_address}}</p>
    </div>
  `.trim(),
  
  subject_line: `
    <p class="letter-subject"><strong>RE: {{subject}}</strong></p>
  `.trim(),
  
  salutation: `
    <p class="letter-salutation">{{salutation}}</p>
  `.trim(),
  
  body: `
    <div class="letter-body ai-editable">
      {{body_content}}
    </div>
  `.trim(),
  
  statutory_block: `
    <div class="statutory-language">
      {{statutory_content}}
    </div>
  `.trim(),
  
  closing: `
    <p class="letter-closing">Sincerely,</p>
  `.trim(),
  
  signature_block: `
    <div class="letter-signature">
      <div class="signature-space"></div>
      <p class="signature-name">{{signature_name}}</p>
      <p class="signature-title">{{signature_title}}</p>
    </div>
  `.trim(),
  
  footer: `
    <div class="letter-footer">
      {{confidentiality_text}}
    </div>
  `.trim(),
};

// ============================================
// PRINT CONFIGURATION
// ============================================

/**
 * Print-CSS configuration per template
 */
export interface LetterPrintConfig {
  pageSize: PageSize;
  margins: {
    top: string;    // e.g., "1in"
    right: string;
    bottom: string;
    left: string;
  };
  fontFamily: string;
  fontSize: string;
  lineHeight: number;
  headerHeight?: string;         // For running headers
  footerHeight?: string;         // For running footers
  avoidBreakSelectors: string[]; // CSS selectors to keep together
}

/**
 * Default print configuration for letters
 */
export const DEFAULT_PRINT_CONFIG: LetterPrintConfig = {
  pageSize: 'letter',
  margins: {
    top: '1in',
    right: '1in',
    bottom: '1in',
    left: '1in',
  },
  fontFamily: '"Times New Roman", Times, serif',
  fontSize: '12pt',
  lineHeight: 1.5,
  avoidBreakSelectors: [
    '.letter-signature',
    '.statutory-language',
    '.letter-recipient',
    'table',
    'ul',
    'ol',
  ],
};

// ============================================
// STATUTORY INJECTION
// ============================================

/**
 * Statutory language injection configuration
 */
export interface StatutoryInjection {
  jurisdiction: string;          // State code or 'federal'
  statuteType: 'foia' | 'pra' | 'nda' | 'custom';
  sections: {
    opening?: boolean;           // Include opening legal language
    closing?: boolean;           // Include closing legal language
    feeWaiver?: boolean;         // Include fee waiver language
    expedited?: boolean;         // Include expedited processing
    appeal?: boolean;            // Include appeal rights
  };
}

// ============================================
// LETTER TEMPLATE MODEL
// ============================================

/**
 * The complete Letter Template model
 */
export interface LetterTemplate {
  // Identity
  id: string;
  organizationId: string | null;
  userId: string;
  name: string;
  description: string | null;
  category: LetterCategory;
  
  // Structure
  sections: LetterSection[];
  
  // Print configuration
  printConfig: LetterPrintConfig;
  
  // Data bindings registry
  availableBindings: DataBinding[];
  
  // Statutory injection (optional)
  statutoryInjection?: StatutoryInjection;
  
  // Branding configuration
  brandingConfigId?: string;     // Reference to saved branding
  
  // Metadata
  isSystemTemplate: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AI EDITING CONSTRAINTS
// ============================================

/**
 * Constraints for AI-editable sections
 * 
 * IMPORTANT: AI-generated content must:
 * 1. Insert text inside predefined HTML regions only
 * 2. Respect existing section structure
 * 3. Never contain raw layout or styling instructions
 * 4. Never alter page sizing, margins, or pagination rules
 */
export interface AiEditConstraints {
  maxParagraphs: number;
  allowedTags: string[];
  forbiddenPatterns: string[];
  forbiddenCssProperties: string[];   // CSS properties that affect layout
  forbiddenAttributes: string[];       // HTML attributes to strip
  preserveBindings: string[];          // Placeholders AI must not remove
  maxContentLength?: number;           // Maximum content length in characters
}

/**
 * Default forbidden CSS properties that affect layout/pagination
 */
export const FORBIDDEN_CSS_PROPERTIES = [
  'position', 'float', 'display',
  'margin', 'padding', 'width', 'height',
  'max-width', 'max-height', 'min-width', 'min-height',
  'page-break', 'break-before', 'break-after', 'break-inside',
  'font-size', 'line-height', 'font-family',
  'top', 'left', 'right', 'bottom',
  'grid', 'flex', 'column', 'columns', 'transform', 'z-index'
];

/**
 * Default forbidden HTML attributes
 */
export const FORBIDDEN_ATTRIBUTES = [
  'style', 'class', 'onclick', 'onload', 'onerror', 'onmouseover'
];

/**
 * Get AI-editable content from a template with constraints
 */
export function getAiEditableContent(template: LetterTemplate): {
  sectionId: string;
  sectionType: LetterSectionType;
  currentHtml: string;
  constraints: AiEditConstraints;
}[] {
  return template.sections
    .filter(s => s.isAiEditable && s.isVisible)
    .map(s => ({
      sectionId: s.id,
      sectionType: s.type,
      currentHtml: s.html,
      constraints: {
        maxParagraphs: 20,
        allowedTags: ['p', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'br', 'span', 'div'],
        forbiddenPatterns: [
          '<style',
          '<script',
          '@page',
          '@media print',
          'page-break',
        ],
        forbiddenCssProperties: FORBIDDEN_CSS_PROPERTIES,
        forbiddenAttributes: FORBIDDEN_ATTRIBUTES,
        preserveBindings: s.dataBindings.map(b => b.placeholder),
        maxContentLength: 50000,
      },
    }));
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validation result for template layout
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a letter template maintains pagination integrity
 */
export function validateTemplateLayout(template: LetterTemplate): TemplateValidationResult {
  const result: TemplateValidationResult = { 
    isValid: true, 
    errors: [], 
    warnings: [] 
  };
  
  // Check required sections exist
  const requiredTypes: LetterSectionType[] = ['body', 'signature_block'];
  for (const type of requiredTypes) {
    if (!template.sections.some(s => s.type === type && s.isVisible)) {
      result.errors.push(`Missing required section: ${type}`);
      result.isValid = false;
    }
  }
  
  // Check for dangerous CSS that could break pagination
  const dangerousCss = [
    'position: absolute',
    'position: fixed',
    'float:',
  ];
  
  for (const section of template.sections) {
    // Only check body content for dangerous CSS (other sections are locked)
    if (section.type === 'body' && !section.isLocked) {
      for (const css of dangerousCss) {
        if (section.html.toLowerCase().includes(css.toLowerCase())) {
          result.warnings.push(
            `Section "${section.type}" contains "${css}" which may break pagination`
          );
        }
      }
    }
  }
  
  // Validate print config
  if (!PAGE_SPECS[template.printConfig.pageSize]) {
    result.errors.push(`Invalid page size: ${template.printConfig.pageSize}`);
    result.isValid = false;
  }
  
  // Validate section order
  const orders = template.sections.map(s => s.displayOrder);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    result.warnings.push('Duplicate section display orders detected');
  }
  
  return result;
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a default letter section
 */
export function createDefaultSection(
  type: LetterSectionType,
  displayOrder: number,
  overrides?: Partial<LetterSection>
): LetterSection {
  const isStructural = ['letterhead', 'date_block', 'signature_block', 'footer'].includes(type);
  const isStatutory = type === 'statutory_block';
  
  return {
    id: `${type}-${Date.now()}`,
    type,
    displayOrder,
    html: DEFAULT_SECTION_TEMPLATES[type],
    isVisible: true,
    isLocked: isStructural || isStatutory,
    isAiEditable: type === 'body',
    dataBindings: STANDARD_BINDINGS.filter(b => 
      DEFAULT_SECTION_TEMPLATES[type].includes(b.placeholder)
    ),
    ...overrides,
  };
}

/**
 * Create a default letter template with standard sections
 */
export function createDefaultLetterTemplate(
  category: LetterCategory,
  overrides?: Partial<LetterTemplate>
): Omit<LetterTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  const sections: LetterSection[] = [
    createDefaultSection('letterhead', 1),
    createDefaultSection('date_block', 2),
    createDefaultSection('recipient_block', 3),
    createDefaultSection('subject_line', 4),
    createDefaultSection('salutation', 5),
    createDefaultSection('body', 6),
    createDefaultSection('closing', 7),
    createDefaultSection('signature_block', 8),
  ];
  
  return {
    organizationId: null,
    name: 'New Letter Template',
    description: null,
    category,
    sections,
    printConfig: { ...DEFAULT_PRINT_CONFIG },
    availableBindings: [...STANDARD_BINDINGS],
    isSystemTemplate: false,
    isActive: true,
    version: 1,
    ...overrides,
  };
}

/**
 * Create a letter template with statutory injection
 */
export function createStatutoryLetterTemplate(
  category: LetterCategory,
  statutoryInjection: StatutoryInjection,
  overrides?: Partial<LetterTemplate>
): Omit<LetterTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  const base = createDefaultLetterTemplate(category, overrides);
  
  // Add statutory block after body
  const statutorySection = createDefaultSection('statutory_block', 6.5);
  base.sections.push(statutorySection);
  base.sections.sort((a, b) => a.displayOrder - b.displayOrder);
  
  return {
    ...base,
    statutoryInjection,
  };
}

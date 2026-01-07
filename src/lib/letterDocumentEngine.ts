/**
 * UNIFIED LETTER DOCUMENT ENGINE
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * Ensures preview matches PDF/DOCX export exactly.
 * HTML is the SINGLE SOURCE OF TRUTH.
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * IMPORTANT: All styling comes from paginatedLetterStyles.ts
 * This file handles document structure and composition only.
 * 
 * For styles, use:
 * - getUnifiedLetterStyles() - for ALL letter styling (preview & export)
 * - LETTER_FONT_STACK - for font definitions
 * - PAGE_SPECS - for page dimensions
 */

import { type OrganizationProfile } from "./organizationProfile";
import { 
  type LetterBrandingConfig, 
  renderLetterhead, 
  renderDateBlock, 
  renderSignatureBlock, 
  renderConfidentialityFooter,
  renderRecipientBlock,
  renderSalutation,
  renderSubjectLine
} from "./letterBranding";
import { 
  PAGE_SPECS, 
  type PageSize, 
  getUnifiedLetterStyles,
  LETTER_FONT_STACK 
} from "./paginatedLetterStyles";
import { CANONICAL_SECTION_ORDER, SECTION_METADATA } from "./letterTemplates";
import type { CaseVariables } from "./caseVariables";

export interface PageSettings {
  size: PageSize;
  margins: { top: number; right: number; bottom: number; left: number };
  orientation: 'portrait' | 'landscape';
}

export interface LetterDocument {
  /** 
   * Letter HTML content (body only, without embedded styles).
   * Styles are applied at render time via getUnifiedLetterStyles().
   */
  html: string;
  /** 
   * @deprecated Use getUnifiedLetterStyles() from paginatedLetterStyles.ts instead.
   * Kept for backwards compatibility only.
   */
  styles: string;
  pageSettings: PageSettings;
  /** 
   * @deprecated Use actual page count from PaginatedDocumentViewer's onPageCountChange callback.
   * This is only an estimate based on character count.
   */
  estimatedPages: number;
}

/**
 * Recipient information for letter assembly
 */
export interface LetterRecipient {
  name: string;
  title?: string;
  organization?: string;
  address: string;
}

export interface CreateLetterDocumentOptions {
  pageSettings?: Partial<PageSettings>;
  includeWatermark?: boolean;
  draftMode?: boolean;
  /** Recipient information (system-controlled) */
  recipient?: LetterRecipient;
  /** Subject/RE line (system-controlled) */
  subject?: string;
  /** Salutation e.g. "Dear Mr. Smith:" (system-controlled) */
  salutation?: string;
  /** Closing e.g. "Sincerely," (system-controlled) - overrides branding config */
  closing?: string;
}

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'letter',
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  orientation: 'portrait'
};

/**
 * @deprecated Use getUnifiedLetterStyles() from paginatedLetterStyles.ts instead.
 * 
 * This function is kept for backwards compatibility only.
 * All new code should use getUnifiedLetterStyles() directly.
 */
export function getLetterStyles(draftMode = false): string {
  // Delegate to unified styles for consistency
  return getUnifiedLetterStyles('letter', { draftMode, forExport: false });
}

// Estimate page count based on content length
function estimatePageCount(html: string): number {
  // Rough estimation: ~3000 characters per page (12pt, 1.5 line spacing)
  const textContent = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
  const charCount = textContent.length;
  return Math.max(1, Math.ceil(charCount / 3000));
}

/**
 * Validation result for letter structure
 */
export interface LetterStructureValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validation result for letter date
 */
export interface LetterDateValidation {
  isValid: boolean;
  dateBlockCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that letter contains exactly one primary date.
 * 
 * RULES:
 * - Exactly one primary date block allowed
 * - Date must appear below letterhead (enforced by structure)
 * - Date must be left-aligned (enforced by CSS)
 * - Multiple date blocks = validation error
 * - No date block = validation error
 * 
 * Note: Dates within body content (e.g., "records from January 2023") 
 * are allowed as they are content dates, not the letter date.
 */
export function validateLetterDate(html: string): LetterDateValidation {
  const result: LetterDateValidation = {
    isValid: true,
    dateBlockCount: 0,
    errors: [],
    warnings: []
  };
  
  // Count primary date blocks (the authoritative date location)
  const dateBlockMatches = html.match(/<div[^>]*class="[^"]*letter-date[^"]*"[^>]*>/gi) || [];
  result.dateBlockCount = dateBlockMatches.length;
  
  // Validation rules
  if (result.dateBlockCount === 0) {
    result.isValid = false;
    result.errors.push('Letter is missing the primary date block');
  }
  
  if (result.dateBlockCount > 1) {
    result.isValid = false;
    result.errors.push(`Multiple date blocks detected (${result.dateBlockCount}). Only one primary date is allowed.`);
  }
  
  // Check for date in header (not allowed)
  const headerMatch = html.match(/<div[^>]*class="[^"]*letter-letterhead[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (headerMatch) {
    const headerContent = headerMatch[1];
    const datePatternInHeader = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i;
    if (datePatternInHeader.test(headerContent)) {
      result.isValid = false;
      result.errors.push('Date detected in letterhead. Dates must only appear in the date block.');
    }
  }
  
  // Check for date in footer (not allowed)
  const footerMatch = html.match(/<div[^>]*class="[^"]*letter-footer[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (footerMatch) {
    const footerContent = footerMatch[1];
    const datePatternInFooter = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i;
    if (datePatternInFooter.test(footerContent)) {
      result.warnings.push('Date-like content detected in footer. Ensure this is not intended as the letter date.');
    }
  }
  
  return result;
}

/**
 * Validate letter structure to prevent free-form layouts
 * Ensures letters follow proper professional structure
 */
/**
 * Validate letter typography follows professional correspondence standards
 * 
 * RULES:
 * - Body text: Left-aligned only
 * - No text-align: justify
 * - No center-aligned body content
 * - Single font family
 */
export function validateLetterTypography(html: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[]
  };
  
  // Check for justification (forbidden)
  if (/text-align:\s*justify/i.test(html)) {
    result.isValid = false;
    result.errors.push('text-align: justify is not allowed. Use left-aligned text only.');
  }
  
  // Check for center-aligned body content (forbidden in body)
  const bodyMatch = html.match(/<div[^>]*class="[^"]*letter-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1];
    if (/text-align:\s*center/i.test(bodyContent)) {
      result.isValid = false;
      result.errors.push('Center-aligned text in body content is not allowed.');
    }
  }
  
  // Check for multiple font-family declarations (warning)
  const fontMatches = html.match(/font-family:\s*[^;]+/gi) || [];
  const uniqueFonts = new Set(fontMatches.map(f => f.toLowerCase().replace(/\s+/g, '')));
  if (uniqueFonts.size > 2) { // Allow 2 (one for body, one for UI elements)
    result.warnings.push(`Multiple font families detected (${uniqueFonts.size}). Professional letters should use one font family.`);
  }
  
  return result;
}

/**
 * Validate exactly one letterhead exists
 */
export function validateLetterhead(html: string): {
  isValid: boolean;
  letterheadCount: number;
  errors: string[];
} {
  const result = { isValid: true, letterheadCount: 0, errors: [] as string[] };
  
  // Count letterhead blocks
  const letterheadMatches = html.match(/<div[^>]*class="[^"]*letter-letterhead[^"]*"[^>]*>/gi) || [];
  result.letterheadCount = letterheadMatches.length;
  
  if (result.letterheadCount > 1) {
    result.isValid = false;
    result.errors.push(`Multiple letterheads detected (${result.letterheadCount}). Only one letterhead is allowed.`);
  }
  
  return result;
}

/**
 * Validate no duplicate organization identifiers
 */
export function validateOrgIdentifiers(html: string): {
  isValid: boolean;
  errors: string[];
} {
  const result = { isValid: true, errors: [] as string[] };
  
  // Check for duplicate org-name classes
  const orgNameMatches = html.match(/<[^>]*class="[^"]*org-name[^"]*"[^>]*>/gi) || [];
  if (orgNameMatches.length > 1) {
    result.isValid = false;
    result.errors.push(`Duplicate organization name elements detected (${orgNameMatches.length}). Only one is allowed.`);
  }
  
  // Check for duplicate logo images
  const logoMatches = html.match(/<img[^>]*class="[^"]*letterhead-logo[^"]*"/gi) || [];
  if (logoMatches.length > 1) {
    result.isValid = false;
    result.errors.push(`Multiple logos detected (${logoMatches.length}). Only one logo is allowed.`);
  }
  
  return result;
}

/**
 * Validate all required sections are present
 */
export function validateRequiredSections(html: string): {
  isValid: boolean;
  missingSections: string[];
  errors: string[];
  warnings: string[];
} {
  const result = {
    isValid: true,
    missingSections: [] as string[],
    errors: [] as string[],
    warnings: [] as string[]
  };
  
  // Required sections
  const requiredSections: Array<{ type: string; cssClass: string; description: string }> = [
    { type: 'date_block', cssClass: 'letter-date', description: 'Date' },
    { type: 'body', cssClass: 'letter-body', description: 'Body content' },
    { type: 'signature_block', cssClass: 'letter-signature', description: 'Signature' },
  ];
  
  for (const { type, cssClass, description } of requiredSections) {
    const regex = new RegExp(`class="[^"]*${cssClass}[^"]*"`, 'i');
    if (!regex.test(html)) {
      result.missingSections.push(type);
      result.isValid = false;
      result.errors.push(`Missing required section: ${description}`);
    }
  }
  
  // Check for recommended sections (warnings only)
  const recommendedSections = [
    { cssClass: 'letter-salutation', description: 'Salutation (e.g., "Dear...")' },
    { cssClass: 'letter-closing', description: 'Closing (e.g., "Sincerely,")' },
  ];
  
  for (const { cssClass, description } of recommendedSections) {
    const regex = new RegExp(`class="[^"]*${cssClass}[^"]*"`, 'i');
    if (!regex.test(html)) {
      result.warnings.push(`Missing recommended section: ${description}`);
    }
  }
  
  return result;
}

/**
 * Pre-generation validation result
 */
export interface PreGenerationValidation {
  isValid: boolean;
  canProceed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Extended pre-generation validation for case letters
 */
export interface PreGenerationCaseValidation extends PreGenerationValidation {
  caseFieldsValid: boolean;
  templatePure: boolean;
  conditionalsResolved: boolean;
  missingCaseFields: string[];
}

/**
 * Validation result for case-level required fields
 */
export interface CaseFieldsValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
}

/**
 * Validate case-level fields are filled based on case settings
 * 
 * RULES:
 * - If fee_waiver enabled, fee_waiver_justification should be filled
 * - If expedited enabled, expedited_justification should be filled
 * - purpose_of_request is optional but recommended
 */
export function validateCaseFields(caseData: CaseVariables): CaseFieldsValidation {
  const result: CaseFieldsValidation = {
    isValid: true,
    errors: [],
    warnings: [],
    missingFields: []
  };
  
  // Fee waiver enabled but no justification
  if (caseData.feeWaiver && !caseData.feeWaiverJustification?.trim()) {
    result.isValid = false;
    result.errors.push('Fee waiver is enabled but justification is missing. Add justification in Case Settings.');
    result.missingFields.push('fee_waiver_justification');
  }
  
  // Expedited enabled but no justification
  if (caseData.expedited && !caseData.expeditedJustification?.trim()) {
    result.isValid = false;
    result.errors.push('Expedited processing is enabled but justification is missing. Add justification in Case Settings.');
    result.missingFields.push('expedited_justification');
  }
  
  // Purpose of request (warning only)
  if (!caseData.purposeOfRequest?.trim()) {
    result.warnings.push('Purpose of request is empty. Consider adding a purpose statement for clarity.');
  }
  
  return result;
}

/**
 * Validate template doesn't contain case-specific data
 * 
 * Templates should only contain:
 * - Placeholders like {{case_number}}
 * - Conditionals like [IF fee_waiver_enabled]
 * - Static text that applies to ALL cases
 * 
 * Templates MUST NOT contain:
 * - Actual case numbers (e.g., "CASE-2024-001")
 * - Actual dates in the body (e.g., "January 7, 2026")
 * - Actual names in place of placeholders
 */
export interface TemplatePurityValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suspiciousPatterns: string[];
}

export function validateTemplatePurity(templateHtml: string): TemplatePurityValidation {
  const result: TemplatePurityValidation = {
    isValid: true,
    errors: [],
    warnings: [],
    suspiciousPatterns: []
  };
  
  // Check for case number patterns (likely hardcoded)
  const caseNumberPattern = /\b(?:CASE|Case)-\d{4}-\d{3,6}\b/g;
  const caseMatches = templateHtml.match(caseNumberPattern) || [];
  if (caseMatches.length > 0) {
    result.isValid = false;
    result.errors.push(`Template contains hardcoded case number(s): ${caseMatches.join(', ')}. Use {{case_number}} placeholder instead.`);
    result.suspiciousPatterns.push(...caseMatches);
  }
  
  // Check for specific date patterns in body (not in date block)
  // Exclude the letter-date block from this check
  const bodyContent = templateHtml.replace(/<div[^>]*class="[^"]*letter-date[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  const datePattern = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:20\d{2}|19\d{2})\b/gi;
  const dateMatches = bodyContent.match(datePattern) || [];
  if (dateMatches.length > 0) {
    result.warnings.push(`Template body contains specific date(s): ${dateMatches.slice(0, 2).join(', ')}. Ensure these are intentional (e.g., historical dates) and not intended as dynamic dates.`);
    result.suspiciousPatterns.push(...dateMatches);
  }
  
  // Check for email patterns that aren't placeholders
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = bodyContent.match(emailPattern) || [];
  // Filter out common example emails
  const realEmails = emailMatches.filter(e => 
    !e.includes('example.com') && 
    !e.includes('placeholder') && 
    !e.includes('{{')
  );
  if (realEmails.length > 0) {
    result.warnings.push(`Template contains email address(es): ${realEmails.slice(0, 2).join(', ')}. Use {{company_email}} or similar placeholders if these should be dynamic.`);
  }
  
  return result;
}

/**
 * Validate all conditional blocks are resolved
 * 
 * After resolveConditionals() runs, there should be:
 * - No remaining [IF ...] markers
 * - No remaining [/IF] markers
 * - No nested conditionals left unresolved
 */
export interface ConditionalResolutionValidation {
  isValid: boolean;
  errors: string[];
  unresolvedConditions: string[];
}

export function validateConditionalResolution(html: string): ConditionalResolutionValidation {
  const result: ConditionalResolutionValidation = {
    isValid: true,
    errors: [],
    unresolvedConditions: []
  };
  
  // Check for remaining [IF ...] markers
  const ifPattern = /\[IF\s+(\w+)\]/g;
  let match;
  while ((match = ifPattern.exec(html)) !== null) {
    result.isValid = false;
    result.unresolvedConditions.push(match[1]);
  }
  
  // Check for orphaned [/IF] markers
  const endIfPattern = /\[\/IF\]/g;
  const endIfMatches = html.match(endIfPattern) || [];
  
  if (result.unresolvedConditions.length > 0) {
    result.errors.push(`Unresolved conditional blocks: [IF ${result.unresolvedConditions.join('], [IF ')}]. These conditions were not evaluated.`);
  }
  
  if (endIfMatches.length > 0 && result.unresolvedConditions.length === 0) {
    result.isValid = false;
    result.errors.push('Orphaned [/IF] marker(s) found without matching [IF]. Check template structure.');
  }
  
  return result;
}

/**
 * COMPREHENSIVE PRE-GENERATION VALIDATION FOR CASE LETTERS
 * 
 * Run BEFORE generating a case letter.
 * Validates:
 * 1. Required case-level fields are filled
 * 2. Template is "pure" (no hardcoded case data)
 * 3. Conditionals resolve correctly
 */
export function validateBeforeCaseGeneration(
  templateHtml: string,
  renderedHtml: string,
  caseData: CaseVariables
): PreGenerationCaseValidation {
  const result: PreGenerationCaseValidation = {
    isValid: true,
    canProceed: true,
    errors: [],
    warnings: [],
    caseFieldsValid: true,
    templatePure: true,
    conditionalsResolved: true,
    missingCaseFields: []
  };
  
  // 1. Validate case fields
  const caseFieldsValidation = validateCaseFields(caseData);
  if (!caseFieldsValidation.isValid) {
    result.caseFieldsValid = false;
    result.isValid = false;
    result.canProceed = false; // BLOCKING
    result.errors.push(...caseFieldsValidation.errors);
    result.missingCaseFields.push(...caseFieldsValidation.missingFields);
  }
  result.warnings.push(...caseFieldsValidation.warnings);
  
  // 2. Validate template purity (on original template)
  const purityValidation = validateTemplatePurity(templateHtml);
  if (!purityValidation.isValid) {
    result.templatePure = false;
    result.isValid = false;
    result.canProceed = false; // BLOCKING
    result.errors.push(...purityValidation.errors);
  }
  result.warnings.push(...purityValidation.warnings);
  
  // 3. Validate conditionals resolved (on rendered HTML)
  const conditionalValidation = validateConditionalResolution(renderedHtml);
  if (!conditionalValidation.isValid) {
    result.conditionalsResolved = false;
    result.isValid = false;
    result.canProceed = false; // BLOCKING
    result.errors.push(...conditionalValidation.errors);
  }
  
  return result;
}

/**
 * Professional Acceptance Test Result
 * 
 * A letter is considered valid ONLY if:
 * 1. It visually matches a standard business letter
 * 2. It can be printed and mailed without edits
 * 3. It could be sent to a government agency or attorney immediately
 * 4. Preview and PDF match exactly
 * 
 * Anything else is a DEFECT.
 */
export interface ProfessionalAcceptanceTest {
  /** Overall pass/fail status */
  passed: boolean;
  /** Letter can be exported */
  canExport: boolean;
  /** Validation timestamp */
  testedAt: Date;
  /** Individual test results */
  tests: {
    visualStandards: AcceptanceTestResult;
    completeness: AcceptanceTestResult;
    printReadiness: AcceptanceTestResult;
    professionalStandards: AcceptanceTestResult;
    fidelity: AcceptanceTestResult;
    structure: AcceptanceTestResult;
  };
  /** All errors (blocking) */
  errors: string[];
  /** All warnings (non-blocking) */
  warnings: string[];
}

export interface AcceptanceTestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate visual standards for professional correspondence
 */
export function validateVisualStandards(html: string): AcceptanceTestResult {
  const result: AcceptanceTestResult = { passed: true, errors: [], warnings: [] };
  
  // Check for proper font stack (sans-serif: Arial, Calibri)
  if (!html.includes('Arial') && !html.includes('Calibri') && !html.includes('Helvetica') && !html.includes('sans-serif')) {
    result.warnings.push('Non-standard font family detected. Professional letters should use Arial or Calibri.');
  }
  
  // Check for inline styles that break visual consistency
  const inlineStyleCount = (html.match(/style="[^"]+"/gi) || []).length;
  if (inlineStyleCount > 15) {
    result.warnings.push(`Excessive inline styles (${inlineStyleCount}). May cause visual inconsistency.`);
  }
  
  // Check signature block has proper space
  const signatureMatch = html.match(/<div[^>]*class="[^"]*letter-signature[^"]*"[^>]*>/i);
  if (signatureMatch && !html.includes('signature-space') && !html.includes('signature-line')) {
    result.warnings.push('Signature block may lack adequate space for wet signature.');
  }
  
  return result;
}

/**
 * Validate completeness - no placeholders, all fields filled
 */
export function validateCompleteness(html: string): AcceptanceTestResult {
  const result: AcceptanceTestResult = { passed: true, errors: [], warnings: [] };
  
  // Check for unresolved mustache placeholders (BLOCKING)
  const placeholderMatches = html.match(/\{\{[^}]+\}\}/g) || [];
  if (placeholderMatches.length > 0) {
    result.passed = false;
    const uniquePlaceholders = [...new Set(placeholderMatches)].slice(0, 3);
    result.errors.push(`Unresolved placeholders found: ${uniquePlaceholders.join(', ')}${placeholderMatches.length > 3 ? '...' : ''}`);
  }
  
  // Check for bracket placeholders
  const bracketPlaceholders = html.match(/\[[^\]]*(?:insert|your name|recipient|date|TBD|TODO)[^\]]*\]/gi) || [];
  if (bracketPlaceholders.length > 0) {
    result.passed = false;
    result.errors.push(`Placeholder text found: ${bracketPlaceholders.slice(0, 2).join(', ')}`);
  }
  
  // Check for empty body (BLOCKING)
  const bodyMatch = html.match(/<div[^>]*class="[^"]*letter-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1].replace(/<[^>]*>/g, '').trim();
    if (bodyContent.length < 50) {
      result.passed = false;
      result.errors.push('Letter body is empty or too short (minimum 50 characters required).');
    }
  }
  
  // Check for empty signature name
  const sigNameMatch = html.match(/<[^>]*class="[^"]*signature-name[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/i);
  if (sigNameMatch) {
    const sigName = sigNameMatch[1].replace(/<[^>]*>/g, '').trim();
    if (!sigName || sigName.length < 2) {
      result.passed = false;
      result.errors.push('Signature name is missing or too short.');
    }
  }
  
  // Check for broken images
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  for (const img of imgMatches) {
    if (!img.includes('src="') || img.includes('src=""') || img.includes('src="undefined"')) {
      result.passed = false;
      result.errors.push('Broken image detected (missing or invalid source).');
      break;
    }
  }
  
  return result;
}

/**
 * Validate print readiness - can be mailed immediately
 */
export function validatePrintReadiness(html: string): AcceptanceTestResult {
  const result: AcceptanceTestResult = { passed: true, errors: [], warnings: [] };
  
  // Check for interactive elements (BLOCKING)
  if (/<button/i.test(html) || /<input/i.test(html) || /<select/i.test(html) || /<textarea/i.test(html)) {
    result.passed = false;
    result.errors.push('Interactive elements detected. Letters must not contain buttons or form inputs.');
  }
  
  // Check for hidden content that won't print
  if (/display:\s*none/i.test(html)) {
    result.warnings.push('Hidden content detected. May cause preview/print mismatch.');
  }
  
  // Check for background colors (except white/transparent)
  const bgColorMatches = html.match(/background(-color)?:\s*([^;]+)/gi) || [];
  for (const bg of bgColorMatches) {
    const lowerBg = bg.toLowerCase();
    if (!lowerBg.includes('#fff') && !lowerBg.includes('white') && !lowerBg.includes('transparent') && !lowerBg.includes('#ffffff')) {
      result.warnings.push('Non-white background color detected. May not print correctly.');
      break;
    }
  }
  
  // Check for clickable links in body (should be plain text for mailed letters)
  const bodyMatch = html.match(/<div[^>]*class="[^"]*letter-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (bodyMatch && /<a\s+href/i.test(bodyMatch[1])) {
    result.warnings.push('Clickable links in body. Consider using plain text URLs for printed letters.');
  }
  
  return result;
}

/**
 * Validate professional standards - attorney/government ready
 */
export function validateProfessionalStandards(html: string): AcceptanceTestResult {
  const result: AcceptanceTestResult = { passed: true, errors: [], warnings: [] };
  
  // Check salutation for informal language (BLOCKING)
  const salutationMatch = html.match(/<[^>]*class="[^"]*letter-salutation[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/i);
  if (salutationMatch) {
    const salutation = salutationMatch[1].replace(/<[^>]*>/g, '').toLowerCase().trim();
    const informalPatterns = [
      { pattern: /^hey\b/, label: 'Hey' },
      { pattern: /^hi\b/, label: 'Hi' },
      { pattern: /^hello\b/, label: 'Hello' },
      { pattern: /^yo\b/, label: 'Yo' },
      { pattern: /^sup\b/, label: 'Sup' },
      { pattern: /^what'?s up/, label: "What's up" },
    ];
    for (const { pattern, label } of informalPatterns) {
      if (pattern.test(salutation)) {
        result.passed = false;
        result.errors.push(`Informal salutation "${label}" detected. Use "Dear [Name]:" for professional correspondence.`);
        break;
      }
    }
  }
  
  // Check closing for informal language (warning)
  const closingMatch = html.match(/<[^>]*class="[^"]*letter-closing[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/i);
  if (closingMatch) {
    const closing = closingMatch[1].replace(/<[^>]*>/g, '').toLowerCase().trim();
    const informalClosings = ['thanks!', 'cheers', 'later', 'take care', 'ciao', 'bye', 'xoxo'];
    for (const pattern of informalClosings) {
      if (closing.includes(pattern)) {
        result.warnings.push(`Informal closing detected ("${pattern}"). Consider "Sincerely," or "Respectfully," for government/legal correspondence.`);
        break;
      }
    }
  }
  
  // Check for draft watermark (warning for final export)
  if (/\bDRAFT\b/i.test(html) || /class="[^"]*draft-watermark/i.test(html)) {
    result.warnings.push('Draft watermark detected. Ensure this is intentional for final export.');
  }
  
  // Check for profanity or inappropriate language
  const textContent = html.replace(/<[^>]*>/g, ' ').toLowerCase();
  const inappropriatePatterns = [/\bf+[*@#]+k/i, /\bs+[*@#]+t/i, /\ba+[*@#]+/i];
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(textContent)) {
      result.passed = false;
      result.errors.push('Inappropriate language detected. Remove before sending to government or legal recipients.');
      break;
    }
  }
  
  return result;
}

/**
 * Validate fidelity - preview matches PDF exactly
 */
export function validateFidelity(html: string, pageSettings: PageSettings): AcceptanceTestResult {
  const result: AcceptanceTestResult = { passed: true, errors: [], warnings: [] };
  
  // Check for page size validity
  if (!['letter', 'a4'].includes(pageSettings.size)) {
    result.passed = false;
    result.errors.push(`Invalid page size: ${pageSettings.size}. Must be "letter" or "a4".`);
  }
  
  // Check for !important overrides that could break fidelity
  const importantCount = (html.match(/!important/gi) || []).length;
  if (importantCount > 30) {
    result.warnings.push(`Excessive CSS !important declarations (${importantCount}). May cause preview/PDF mismatch.`);
  }
  
  // Check for embedded <style> tags (should use unified styles)
  const embeddedStyleCount = (html.match(/<style>/gi) || []).length;
  if (embeddedStyleCount > 2) {
    result.warnings.push('Multiple embedded style blocks detected. Use unified letter styles for consistency.');
  }
  
  // Check for viewport-dependent units that could cause issues
  if (/\d+vw|\d+vh|\d+vmin|\d+vmax/i.test(html)) {
    result.warnings.push('Viewport-relative units detected. May cause inconsistency between preview and PDF.');
  }
  
  return result;
}

/**
 * PRE-GENERATION VALIDATION
 * 
 * Run BEFORE generating or exporting a letter.
 * If canProceed=false, BLOCK generation and surface errors.
 */
export function validateBeforeGeneration(html: string): PreGenerationValidation {
  const result: PreGenerationValidation = {
    isValid: true,
    canProceed: true,
    errors: [],
    warnings: []
  };
  
  // 1. Exactly one header (letterhead)
  const letterheadValidation = validateLetterhead(html);
  if (!letterheadValidation.isValid) {
    result.isValid = false;
    result.canProceed = false;
    result.errors.push(...letterheadValidation.errors);
  }
  
  // 2. Exactly one date
  const dateValidation = validateLetterDate(html);
  if (!dateValidation.isValid) {
    result.isValid = false;
    result.canProceed = false;
    result.errors.push(...dateValidation.errors);
  }
  result.warnings.push(...dateValidation.warnings);
  
  // 3. No justified text
  const typographyValidation = validateLetterTypography(html);
  if (!typographyValidation.isValid) {
    result.isValid = false;
    result.canProceed = false;
    result.errors.push(...typographyValidation.errors);
  }
  result.warnings.push(...typographyValidation.warnings);
  
  // 4. No duplicate organization identifiers
  const orgValidation = validateOrgIdentifiers(html);
  if (!orgValidation.isValid) {
    result.isValid = false;
    result.canProceed = false;
    result.errors.push(...orgValidation.errors);
  }
  
  // 5. All required sections present
  const sectionsValidation = validateRequiredSections(html);
  if (!sectionsValidation.isValid) {
    result.isValid = false;
    result.canProceed = false;
    result.errors.push(...sectionsValidation.errors);
  }
  result.warnings.push(...sectionsValidation.warnings);
  
  return result;
}

/**
 * PROFESSIONAL ACCEPTANCE TEST
 * 
 * Comprehensive validation that ensures every letter is:
 * 1. Visually matches a standard business letter
 * 2. Can be printed and mailed without edits
 * 3. Could be sent to a government agency or attorney immediately
 * 4. Preview and PDF match exactly
 * 
 * ANYTHING that fails this test is classified as a DEFECT and blocks export.
 */
export function runProfessionalAcceptanceTest(
  html: string,
  pageSettings: PageSettings
): ProfessionalAcceptanceTest {
  // Run all test categories
  const visualStandards = validateVisualStandards(html);
  const completeness = validateCompleteness(html);
  const printReadiness = validatePrintReadiness(html);
  const professionalStandards = validateProfessionalStandards(html);
  const fidelity = validateFidelity(html, pageSettings);
  
  // Also run existing structural validation
  const preGen = validateBeforeGeneration(html);
  const structure: AcceptanceTestResult = {
    passed: preGen.isValid,
    errors: preGen.errors,
    warnings: preGen.warnings
  };
  
  // Aggregate results
  const allErrors = [
    ...structure.errors,
    ...visualStandards.errors,
    ...completeness.errors,
    ...printReadiness.errors,
    ...professionalStandards.errors,
    ...fidelity.errors,
  ];
  
  const allWarnings = [
    ...structure.warnings,
    ...visualStandards.warnings,
    ...completeness.warnings,
    ...printReadiness.warnings,
    ...professionalStandards.warnings,
    ...fidelity.warnings,
  ];
  
  // Deduplicate
  const uniqueErrors = [...new Set(allErrors)];
  const uniqueWarnings = [...new Set(allWarnings)];
  
  const passed = uniqueErrors.length === 0;
  
  return {
    passed,
    canExport: passed,
    testedAt: new Date(),
    tests: {
      visualStandards,
      completeness,
      printReadiness,
      professionalStandards,
      fidelity,
      structure,
    },
    errors: uniqueErrors,
    warnings: uniqueWarnings,
  };
}

export function validateLetterStructure(html: string): LetterStructureValidation {
  const result: LetterStructureValidation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  const textContent = html.replace(/<[^>]*>/g, ' ').trim();
  
  // Must have content (not empty)
  if (textContent.length < 50) {
    result.isValid = false;
    result.errors.push("Letter content is too short");
  }
  
  // Check for placeholder text that must be replaced
  const placeholderPatterns = [
    { pattern: /\[insert/i, message: "Contains '[insert...]' placeholder" },
    { pattern: /\[your name/i, message: "Contains '[your name]' placeholder" },
    { pattern: /\[recipient/i, message: "Contains '[recipient...]' placeholder" },
    { pattern: /\[date\]/i, message: "Contains '[date]' placeholder" },
    { pattern: /\bTBD\b/, message: "Contains 'TBD' placeholder" },
    { pattern: /\bTODO\b/i, message: "Contains 'TODO' placeholder" },
    { pattern: /\bPLACEHOLDER\b/i, message: "Contains 'PLACEHOLDER' text" },
    { pattern: /\bXXX\b/, message: "Contains 'XXX' placeholder" },
    { pattern: /\b___+\b/, message: "Contains blank line placeholder" },
  ];
  
  for (const { pattern, message } of placeholderPatterns) {
    if (pattern.test(textContent)) {
      result.isValid = false;
      result.errors.push(message);
    }
  }
  
  // Validate date (single authoritative date rule)
  const dateValidation = validateLetterDate(html);
  if (!dateValidation.isValid) {
    result.isValid = false;
    result.errors.push(...dateValidation.errors);
  }
  result.warnings.push(...dateValidation.warnings);
  
  // Validate typography rules
  const typographyValidation = validateLetterTypography(html);
  if (!typographyValidation.isValid) {
    result.isValid = false;
    result.errors.push(...typographyValidation.errors);
  }
  result.warnings.push(...typographyValidation.warnings);
  
  // Check for proper structure indicators (salutation and closing)
  const hasSalutation = /\b(?:Dear|To Whom|Attention|Re:)\b/i.test(textContent);
  const hasClosing = /\b(?:Sincerely|Regards|Best|Respectfully|Thank you)\b/i.test(textContent);
  
  if (!hasSalutation) {
    result.warnings.push("Letter may be missing a proper salutation");
  }
  if (!hasClosing) {
    result.warnings.push("Letter may be missing a closing");
  }
  
  return result;
}

/**
 * Create a complete letter document with all branding.
 * 
 * NOTE: The returned html includes the style tag for backwards compatibility,
 * but new code should apply styles separately using getUnifiedLetterStyles().
 */
export function createLetterDocument(
  letterBody: string,
  brandingConfig: LetterBrandingConfig,
  orgProfile: OrganizationProfile | null,
  options?: CreateLetterDocumentOptions
): LetterDocument {
  const pageSettings: PageSettings = {
    ...DEFAULT_PAGE_SETTINGS,
    ...options?.pageSettings
  };

  // Get unified styles (for backwards compatibility, included in document)
  const styles = getUnifiedLetterStyles(pageSettings.size, { 
    draftMode: options?.draftMode,
    forExport: false 
  });

  // Build the complete letter HTML
  const parts: string[] = [];

  // Add letterhead (system-controlled)
  if (brandingConfig.showLogo || brandingConfig.showOrgName || brandingConfig.showOrgAddress || brandingConfig.showContactInfo) {
    parts.push(renderLetterhead(orgProfile, brandingConfig));
  }

  // Add date block (system-controlled)
  if (brandingConfig.showDate) {
    parts.push(renderDateBlock(new Date(), brandingConfig));
  }

  // Add recipient block if provided (system-controlled)
  if (options?.recipient) {
    parts.push(renderRecipientBlock(options.recipient));
  }

  // Add subject/reference line if provided (system-controlled)
  if (options?.subject) {
    parts.push(renderSubjectLine(options.subject));
  }

  // Add salutation if provided (system-controlled)
  if (options?.salutation) {
    parts.push(renderSalutation(options.salutation));
  }

  // Add letter body (AI-editable content wrapped in letter-body class)
  parts.push(`<div class="letter-body">${letterBody}</div>`);

  // Add signature block (system-controlled)
  if (brandingConfig.showSignatureBlock) {
    // Use custom closing if provided, otherwise use default from signature block
    parts.push(renderSignatureBlock(brandingConfig, options?.closing));
  }

  // Add confidentiality footer (system-controlled)
  if (brandingConfig.showConfidentiality) {
    parts.push(renderConfidentialityFooter(brandingConfig));
  }

  const fullHtml = `
    <style>${styles}</style>
    <div class="letter-document">
      ${parts.join('\n')}
    </div>
  `;

  return {
    html: fullHtml,
    styles,
    pageSettings,
    estimatedPages: estimatePageCount(fullHtml)
  };
}

/**
 * Export letter as HTML with embedded styles (for PDF generation)
 * 
 * NOTE: Uses getUnifiedLetterStyles() for consistent rendering.
 */
export function getExportableHtml(
  letterDocument: LetterDocument,
  options?: { draftMode?: boolean }
): string {
  // Always use unified styles for export
  const styles = getUnifiedLetterStyles(letterDocument.pageSettings.size, {
    draftMode: options?.draftMode,
    forExport: true
  });
  
  // Extract body content without existing styles
  const bodyMatch = letterDocument.html.match(/<div class="letter-document">([\s\S]*)<\/div>\s*$/);
  const bodyContent = bodyMatch ? bodyMatch[1] : letterDocument.html.replace(/<style>[\s\S]*?<\/style>/g, '');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Letter Document</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="letter-document">
        ${bodyContent}
      </div>
    </body>
    </html>
  `;
}

// NOTE: Import directly from @/lib/paginatedLetterStyles for:
// - getPdfExportOptions (deprecated)
// - getUnifiedLetterStyles
// - LETTER_FONT_STACK  
// - PAGE_SPECS
// Re-exports removed to prevent circular reference issues with TypeScript compiler.

// ============================================================================
// TEMPLATE REUSABILITY VALIDATION
// ============================================================================

/**
 * Validate that a template contains only allowed content.
 * Templates must be GENERAL-PURPOSE and reusable across unlimited cases.
 * 
 * TEMPLATE RULES:
 * - MAY include: statutory citations, neutral openings, placeholders, response deadlines
 * - MUST NOT include: case-specific explanations, filled justifications, hardcoded names/dates
 */
export function validateTemplateReusability(templateHtml: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const result = { isValid: true, errors: [] as string[], warnings: [] as string[] };
  
  // Patterns that indicate case-specific content (FORBIDDEN)
  const forbiddenPatterns = [
    { pattern: /\bdue to\b[^.]*\b(case|investigation|lawsuit|litigation|matter)\b/i, message: 'Case-specific language detected ("due to... case/investigation")' },
    { pattern: /\bbecause\b[^.]*\b(we are|our client|the client|my client)\b/i, message: 'Case-specific justification narrative detected' },
    { pattern: /\b(we are|our firm is)\s+(currently\s+)?(investigating|representing|handling)/i, message: 'Case-specific investigation/representation language' },
    { pattern: /\bour client\b/i, message: 'Client-specific reference ("our client")' },
    { pattern: /\bmy client\b/i, message: 'Client-specific reference ("my client")' },
    { pattern: /\bthe subject\b[^.]*\b(has|is|was|did)\b/i, message: 'Subject-specific narrative detected' },
    { pattern: /\b(on behalf of|representing)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/i, message: 'Hardcoded party name detected' },
  ];
  
  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(templateHtml)) {
      result.isValid = false;
      result.errors.push(`Template contains case-specific content: ${message}`);
    }
  }
  
  // Check for filled-in justifications (should be placeholders instead)
  const filledJustificationPatterns = [
    { pattern: /disclosure\s+(is|serves)\s+(in\s+)?the\s+public\s+interest\s+because\b/i, message: 'Filled fee waiver justification - use {{fee_waiver_justification}} placeholder' },
    { pattern: /this\s+is\s+(an?\s+)?(urgent|time-sensitive|emergent)\s+(matter|situation|case)\b/i, message: 'Filled expedited justification - use {{expedited_justification}} placeholder' },
    { pattern: /there\s+is\s+(an?\s+)?imminent\s+(threat|danger|harm)\b/i, message: 'Filled expedited justification - use {{expedited_justification}} placeholder' },
  ];
  
  for (const { pattern, message } of filledJustificationPatterns) {
    if (pattern.test(templateHtml)) {
      result.isValid = false;
      result.errors.push(`Template contains filled justification: ${message}`);
    }
  }
  
  // Check for hardcoded dates (should be placeholders)
  const hardcodedDatePatterns = [
    { pattern: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i, message: 'Hardcoded date (e.g., "January 15, 2024")' },
    { pattern: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, message: 'Hardcoded date (e.g., "01/15/2024")' },
    { pattern: /\b\d{4}-\d{2}-\d{2}\b/, message: 'Hardcoded date (e.g., "2024-01-15")' },
  ];
  
  // Only flag dates that appear to be case-specific (not statutory deadlines)
  for (const { pattern, message } of hardcodedDatePatterns) {
    const matches = templateHtml.match(pattern);
    if (matches) {
      // Skip if it's clearly a placeholder example or statutory language
      const context = templateHtml.toLowerCase();
      if (!context.includes('{{') && !context.includes('current_date') && !context.includes('placeholder')) {
        result.warnings.push(`Possible hardcoded date detected: ${message}. Use {{date_range_start}}/{{date_range_end}} placeholders for case dates.`);
      }
    }
  }
  
  // Verify essential placeholders are used for variable content
  const essentialPlaceholders = [
    { placeholder: '{{records_requested}}', section: 'records description', required: false },
  ];
  
  for (const { placeholder, section, required } of essentialPlaceholders) {
    if (!templateHtml.includes(placeholder)) {
      if (required) {
        result.errors.push(`Template missing required placeholder ${placeholder} for ${section}`);
        result.isValid = false;
      } else {
        result.warnings.push(`Consider using ${placeholder} placeholder for ${section}`);
      }
    }
  }
  
  // Check for proper use of optional section placeholders
  const optionalSectionIndicators = [
    { text: 'fee waiver', placeholder: '{{fee_waiver_justification}}' },
    { text: 'expedited processing', placeholder: '{{expedited_justification}}' },
  ];
  
  for (const { text, placeholder } of optionalSectionIndicators) {
    if (templateHtml.toLowerCase().includes(text) && !templateHtml.includes(placeholder)) {
      // Check if it's a toggle reference (allowed) vs filled content (not allowed)
      const hasFilledContent = new RegExp(`${text}[^.]*\\b(because|since|as|due to)\\b`, 'i').test(templateHtml);
      if (hasFilledContent) {
        result.warnings.push(`${text} section contains filled justification. Use ${placeholder} placeholder for case-specific content.`);
      }
    }
  }
  
  return result;
}

// Statute Validator - Prevents AI hallucinations of laws and agencies
// All legal citations must come from validated templates

import { FEDERAL_FOIA, STATE_STATUTES, type JurisdictionInfo } from "./foiaStatutes";
import { NDA_STATE_PROVISIONS, type StateNDAProvisions } from "./ndaStatutes";

export interface CitationInfo {
  text: string;
  type: 'statute' | 'code' | 'section' | 'unknown';
  jurisdiction?: string;
}

export interface ValidationResult {
  isValid: boolean;
  validatedCount: number;
  unvalidatedCount: number;
  citations: {
    found: string;
    validated: boolean;
    source: 'foia_federal' | 'foia_state' | 'nda_state' | 'unknown';
    matchedStatute?: string;
  }[];
  warnings: string[];
}

// Common citation patterns
const CITATION_PATTERNS = [
  // Federal statutes: 5 U.S.C. § 552
  /\d+\s+U\.?S\.?C\.?\s*§?\s*\d+[a-z]?(?:\([a-z0-9]+\))?/gi,
  // State statutes: Cal. Gov. Code § 6250
  /[A-Z][a-z]+\.?\s+(?:Rev\.?\s+)?(?:Stat\.?|Code|Ann\.?|Gen\.?\s+Stat\.?|Gov\.?\s+Code)\s*§?\s*[\d\-\.]+/gi,
  // Section references: § 552, Section 552
  /(?:Section|§)\s*[\d\-\.]+(?:\([a-z0-9]+\))?/gi,
  // Code references: O.C.G.A. § 50-18-70
  /[A-Z\.]+\s*§?\s*[\d\-\.]+/g,
];

// Extract all citations from HTML content
export function extractCitations(html: string): string[] {
  // Remove HTML tags for text analysis
  const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  
  const citations: Set<string> = new Set();
  
  for (const pattern of CITATION_PATTERNS) {
    const matches = textContent.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the match
        const cleaned = match.trim();
        if (cleaned.length > 3) { // Avoid very short matches
          citations.add(cleaned);
        }
      });
    }
  }
  
  return Array.from(citations);
}

// Get all valid FOIA statute references
function getAllValidFoiaStatutes(): string[] {
  const statutes: string[] = [];
  
  // Federal FOIA
  statutes.push(FEDERAL_FOIA.statute);
  statutes.push(FEDERAL_FOIA.feeWaiverProvision);
  statutes.push(FEDERAL_FOIA.expeditedProvision);
  statutes.push(FEDERAL_FOIA.appealProvision);
  
  // State statutes
  Object.values(STATE_STATUTES).forEach((state: JurisdictionInfo) => {
    statutes.push(state.statute);
    if (state.feeWaiverProvision) statutes.push(state.feeWaiverProvision);
    if (state.expeditedProvision) statutes.push(state.expeditedProvision);
    if (state.appealProvision) statutes.push(state.appealProvision);
  });
  
  return statutes.filter(s => s && s.length > 0);
}

// Get all valid NDA statute references
function getAllValidNdaStatutes(): string[] {
  const statutes: string[] = [];
  
  Object.values(NDA_STATE_PROVISIONS).forEach((state: StateNDAProvisions) => {
    if (state.tradeSecretStatute) statutes.push(state.tradeSecretStatute);
  });
  
  return statutes.filter(s => s && s.length > 0);
}

// Normalize statute text for comparison
function normalizeStatute(statute: string): string {
  return statute
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/§/g, 'section')
    .replace(/\./g, '')
    .trim();
}

// Check if a citation matches a known statute
function matchesKnownStatute(citation: string, knownStatutes: string[]): string | null {
  const normalizedCitation = normalizeStatute(citation);
  
  for (const statute of knownStatutes) {
    const normalizedStatute = normalizeStatute(statute);
    
    // Exact match
    if (normalizedCitation === normalizedStatute) {
      return statute;
    }
    
    // Partial match (citation contains the statute reference)
    if (normalizedCitation.includes(normalizedStatute) || normalizedStatute.includes(normalizedCitation)) {
      return statute;
    }
    
    // Extract numbers and compare
    const citationNumbers = normalizedCitation.match(/\d+/g)?.join('') || '';
    const statuteNumbers = normalizedStatute.match(/\d+/g)?.join('') || '';
    
    if (citationNumbers && statuteNumbers && citationNumbers === statuteNumbers) {
      // Numbers match, check if it's from the same jurisdiction family
      const citationPrefix = normalizedCitation.substring(0, 10);
      const statutePrefix = normalizedStatute.substring(0, 10);
      
      if (citationPrefix.includes('usc') || statutePrefix.includes('usc')) {
        if (citationPrefix.includes('usc') && statutePrefix.includes('usc')) {
          return statute;
        }
      }
    }
  }
  
  return null;
}

// Validate citations against known statutes
export function validateCitations(
  citations: string[],
  letterType: 'foia' | 'nda' | 'custom',
  jurisdictionCode?: string
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    validatedCount: 0,
    unvalidatedCount: 0,
    citations: [],
    warnings: []
  };

  if (citations.length === 0) {
    return result;
  }

  const foiaStatutes = getAllValidFoiaStatutes();
  const ndaStatutes = getAllValidNdaStatutes();
  const allValidStatutes = [...foiaStatutes, ...ndaStatutes];

  for (const citation of citations) {
    let validated = false;
    let source: 'foia_federal' | 'foia_state' | 'nda_state' | 'unknown' = 'unknown';
    let matchedStatute: string | undefined;

    // Check FOIA statutes
    const foiaMatch = matchesKnownStatute(citation, foiaStatutes);
    if (foiaMatch) {
      validated = true;
      source = citation.toLowerCase().includes('u.s.c') ? 'foia_federal' : 'foia_state';
      matchedStatute = foiaMatch;
    }

    // Check NDA statutes
    if (!validated) {
      const ndaMatch = matchesKnownStatute(citation, ndaStatutes);
      if (ndaMatch) {
        validated = true;
        source = 'nda_state';
        matchedStatute = ndaMatch;
      }
    }

    result.citations.push({
      found: citation,
      validated,
      source,
      matchedStatute
    });

    if (validated) {
      result.validatedCount++;
    } else {
      result.unvalidatedCount++;
    }
  }

  // Determine overall validity and add warnings
  if (result.unvalidatedCount > 0) {
    result.isValid = false;
    
    if (letterType === 'custom') {
      result.warnings.push(
        `Found ${result.unvalidatedCount} legal citation(s) in a custom letter. Custom letters should not contain legal citations - use FOIA or NDA builders for legal documents.`
      );
    } else {
      result.warnings.push(
        `${result.unvalidatedCount} citation(s) could not be validated against known statutes. These may be AI-generated or outdated references.`
      );
    }
  }

  // Letter type specific warnings
  if (letterType === 'custom' && citations.length > 0) {
    result.warnings.push(
      "Custom letters should not contain statutory references. Consider using the appropriate legal document builder."
    );
  }

  return result;
}

// Mark unvalidated citations in HTML with warning styling
export function markUnvalidatedCitations(html: string, validationResult: ValidationResult): string {
  let markedHtml = html;

  for (const citation of validationResult.citations) {
    const escapedCitation = citation.found.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedCitation})`, 'gi');
    
    if (citation.validated) {
      markedHtml = markedHtml.replace(
        regex,
        `<span class="statute-reference" data-validated="true" data-source="${citation.source}" title="Validated: ${citation.matchedStatute || 'Known statute'}">$1</span>`
      );
    } else {
      markedHtml = markedHtml.replace(
        regex,
        `<span class="statute-reference" data-validated="false" data-source="unknown" title="Warning: Unvalidated citation">$1</span>`
      );
    }
  }

  return markedHtml;
}

// Check if letter content contains any legal-looking language that shouldn't be in custom letters
export function detectLegalLanguageInCustomLetter(html: string): string[] {
  const textContent = html.replace(/<[^>]*>/g, ' ').toLowerCase();
  const warnings: string[] = [];

  const legalPhrases = [
    'pursuant to',
    'in accordance with',
    'as required by law',
    'under penalty of',
    'hereby agree',
    'legally binding',
    'shall be governed',
    'jurisdiction of',
    'statute of limitations',
    'liability shall',
    'indemnify and hold harmless'
  ];

  for (const phrase of legalPhrases) {
    if (textContent.includes(phrase)) {
      warnings.push(`Contains legal phrase: "${phrase}". Consider using appropriate legal document builder.`);
    }
  }

  return warnings;
}

// Get jurisdiction info for validation context
export function getJurisdictionStatutes(jurisdictionCode: string): string[] {
  const statutes: string[] = [];
  
  if (jurisdictionCode === 'federal') {
    statutes.push(FEDERAL_FOIA.statute);
    statutes.push(FEDERAL_FOIA.feeWaiverProvision);
    statutes.push(FEDERAL_FOIA.expeditedProvision);
    statutes.push(FEDERAL_FOIA.appealProvision);
  } else if (STATE_STATUTES[jurisdictionCode]) {
    const state = STATE_STATUTES[jurisdictionCode];
    statutes.push(state.statute);
    if (state.feeWaiverProvision) statutes.push(state.feeWaiverProvision);
    if (state.expeditedProvision) statutes.push(state.expeditedProvision);
    if (state.appealProvision) statutes.push(state.appealProvision);
  }
  
  if (NDA_STATE_PROVISIONS[jurisdictionCode]) {
    statutes.push(NDA_STATE_PROVISIONS[jurisdictionCode].tradeSecretStatute);
  }
  
  return statutes.filter(s => s && s.length > 0);
}

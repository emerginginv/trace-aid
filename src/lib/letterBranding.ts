import { format } from "date-fns";
import type { OrganizationProfile } from "./organizationProfile";

/**
 * Letter Branding Configuration Interface
 */
export interface LetterBrandingConfig {
  // Letterhead options
  showLogo: boolean;
  showOrgName: boolean;
  showOrgAddress: boolean;
  showContactInfo: boolean;
  logoAlignment: 'left' | 'center' | 'right';
  
  // Letter elements
  showDate: boolean;
  dateFormat: 'full' | 'short';
  
  // Signature block
  showSignatureBlock: boolean;
  signatureName: string;
  signatureTitle: string;
  includeSignatureLine: boolean;
  
  // Footer (optional for letters)
  showConfidentiality: boolean;
  confidentialityText: string;
}

/**
 * Get default letter branding configuration
 */
export function getDefaultLetterBrandingConfig(): LetterBrandingConfig {
  return {
    // Default: prefer logo if available (enforced at render time)
    showLogo: true,
    showOrgName: false, // Mutually exclusive with showLogo
    showOrgAddress: true,
    showContactInfo: true,
    logoAlignment: 'center',
    showDate: true,
    dateFormat: 'full',
    showSignatureBlock: true,
    signatureName: '',
    signatureTitle: '',
    includeSignatureLine: true,
    showConfidentiality: false,
    confidentialityText: 'This letter and any attachments are confidential and intended solely for the addressee.',
  };
}

/**
 * Validates that header configuration follows mutual exclusivity rules
 * RULE: Logo OR Name, NEVER BOTH
 */
export function validateHeaderConfig(
  config: LetterBrandingConfig,
  orgProfile: OrganizationProfile | null
): { isValid: boolean; warning?: string } {
  const hasLogo = !!orgProfile?.logoUrl;
  
  if (config.showLogo && config.showOrgName) {
    return {
      isValid: false,
      warning: 'Header cannot show both logo and organization name. Choose one.'
    };
  }
  
  if (config.showLogo && !hasLogo) {
    return {
      isValid: true,
      warning: 'Logo display enabled but no logo uploaded. Organization name will be used.'
    };
  }
  
  return { isValid: true };
}

/**
 * Get the effective header display based on mutual exclusivity rules
 * RULE: Logo OR Name, NEVER BOTH
 */
export function getEffectiveHeaderDisplay(
  config: LetterBrandingConfig,
  orgProfile: OrganizationProfile | null
): { showLogo: boolean; showOrgName: boolean } {
  const hasLogo = !!orgProfile?.logoUrl;
  
  if (hasLogo && config.showLogo) {
    // Logo exists and enabled: LOGO ONLY
    return { showLogo: true, showOrgName: false };
  } else {
    // No logo or logo disabled: NAME ONLY (if enabled)
    return { showLogo: false, showOrgName: true };
  }
}

/**
 * Format date according to config
 */
export function formatLetterDate(date: Date, format: 'full' | 'short'): string {
  if (format === 'full') {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}/${date.getFullYear()}`;
}

/**
 * Render letterhead HTML
 * RULE: Logo OR Name, NEVER BOTH
 */
export function renderLetterhead(
  orgProfile: OrganizationProfile | null,
  config: LetterBrandingConfig
): string {
  if (!orgProfile) return '';
  
  const parts: string[] = [];
  const alignment = config.logoAlignment;
  
  // ENFORCE MUTUAL EXCLUSIVITY: Logo OR Name, NEVER BOTH
  const effectiveDisplay = getEffectiveHeaderDisplay(config, orgProfile);
  
  if (effectiveDisplay.showLogo && orgProfile.logoUrl) {
    // Logo ONLY - no organization name in header
    parts.push(`
      <div class="letterhead-logo" style="text-align: ${alignment}; margin-bottom: 10px;">
        <img src="${orgProfile.logoUrl}" alt="${orgProfile.companyName || 'Company Logo'}" style="max-height: 60px; max-width: 200px;" />
      </div>
    `);
  } else if (effectiveDisplay.showOrgName && orgProfile.companyName) {
    // Name ONLY - no logo
    parts.push(`
      <div class="org-name" style="text-align: ${alignment}; font-weight: bold; font-size: 16px;">
        ${orgProfile.companyName}
      </div>
    `);
  }
  
  // Address
  if (config.showOrgAddress && orgProfile.fullAddress) {
    const addressLines = [];
    if (orgProfile.streetAddress) addressLines.push(orgProfile.streetAddress);
    if (orgProfile.city || orgProfile.state || orgProfile.zipCode) {
      const cityStateZip = [
        orgProfile.city,
        orgProfile.state
      ].filter(Boolean).join(', ');
      const fullLine = [cityStateZip, orgProfile.zipCode].filter(Boolean).join(' ');
      if (fullLine) addressLines.push(fullLine);
    }
    
    if (addressLines.length > 0) {
      parts.push(`
        <div style="text-align: ${alignment}; font-size: 12px; color: #666;">
          ${addressLines.join('<br/>')}
        </div>
      `);
    }
  }
  
  // Contact Info
  if (config.showContactInfo) {
    const contactParts = [];
    if (orgProfile.phone) contactParts.push(orgProfile.phone);
    if (orgProfile.email) contactParts.push(orgProfile.email);
    
    if (contactParts.length > 0) {
      parts.push(`
        <div style="text-align: ${alignment}; font-size: 12px; color: #666;">
          ${contactParts.join(' | ')}
        </div>
      `);
    }
  }
  
  if (parts.length === 0) return '';
  
  // Use CSS class for spacing - vertical rhythm controlled by paginatedLetterStyles.ts
  return `
    <div class="letter-letterhead">
      ${parts.join('')}
      <hr style="border: none; border-top: 1px solid #333;" />
    </div>
  `;
}

/**
 * Render date block HTML
 */
export function renderDateBlock(
  date: Date,
  config: LetterBrandingConfig
): string {
  if (!config.showDate) return '';
  
  const formattedDate = formatLetterDate(date, config.dateFormat);
  
  // RULE: Single authoritative date, left-aligned, below letterhead
  // Spacing controlled by CSS class - vertical rhythm in paginatedLetterStyles.ts
  return `
    <div class="letter-date">
      ${formattedDate}
    </div>
  `;
}

/**
 * Render signature block HTML
 * Spacing controlled by CSS classes - vertical rhythm in paginatedLetterStyles.ts
 */
export function renderSignatureBlock(
  config: LetterBrandingConfig
): string {
  if (!config.showSignatureBlock) return '';
  
  const parts: string[] = [];
  
  // Closing - spacing controlled by .letter-signature .closing CSS
  parts.push('<p class="closing">Sincerely,</p>');
  
  // Signature line for wet signature
  if (config.includeSignatureLine) {
    parts.push('<div class="signature-line"></div>');
  } else {
    parts.push('<div class="signature-space" style="height: 36pt;"></div>');
  }
  
  // Name
  if (config.signatureName) {
    parts.push(`<p class="signature-name"><strong>${config.signatureName}</strong></p>`);
  } else {
    parts.push(`<p class="signature-name"><strong>{{signature_name}}</strong></p>`);
  }
  
  // Title
  if (config.signatureTitle) {
    parts.push(`<p class="signature-title">${config.signatureTitle}</p>`);
  } else {
    parts.push(`<p class="signature-title">{{signature_title}}</p>`);
  }
  
  return `
    <div class="letter-signature">
      ${parts.join('')}
    </div>
  `;
}

/**
 * Render confidentiality footer
 * Spacing controlled by CSS class - vertical rhythm in paginatedLetterStyles.ts
 */
export function renderConfidentialityFooter(
  config: LetterBrandingConfig
): string {
  if (!config.showConfidentiality || !config.confidentialityText) return '';
  
  return `
    <div class="letter-footer">
      <p style="font-size: 10px; color: #666; font-style: italic;">
        ${config.confidentialityText}
      </p>
    </div>
  `;
}

/**
 * Wrap letter body with full branding (letterhead, date, signature, footer)
 */
export function wrapLetterWithBranding(
  letterBody: string,
  orgProfile: OrganizationProfile | null,
  config: LetterBrandingConfig,
  date: Date = new Date()
): string {
  const letterhead = renderLetterhead(orgProfile, config);
  const dateBlock = renderDateBlock(date, config);
  const signature = renderSignatureBlock(config);
  const footer = renderConfidentialityFooter(config);
  
  return `
    <div class="letter-document" style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px;">
      ${letterhead}
      ${dateBlock}
      <div class="letter-body">
        ${letterBody}
      </div>
      ${signature}
      ${footer}
    </div>
  `;
}

/**
 * Get current date placeholder for templates
 */
export function getDatePlaceholder(format: 'full' | 'short'): string {
  return format === 'full' ? '{{current_date_full}}' : '{{current_date_short}}';
}

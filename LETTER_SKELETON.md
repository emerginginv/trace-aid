# Canonical Letter HTML Skeleton

This document provides the definitive HTML structure and CSS classes for generating professional letters in the application. All letter templates should follow this skeleton to ensure consistent styling, proper pagination, and reliable PDF export.

---

## Canonical Section Order (IMMUTABLE)

**This order is the base contract for all letters. Sections may be shown or hidden, but NEVER rearranged.**

| Order | Section ID | CSS Class | Required | Description |
|-------|-----------|-----------|----------|-------------|
| 1 | `letterhead` | `.letter-letterhead` | ✓ | Organization branding, logo, contact info |
| 2 | `date_block` | `.letter-date` | ✓ | Letter date, right-aligned |
| 3 | `recipient_block` | `.letter-recipient` | ✓ | Addressee name, title, organization, address |
| 4 | `reference` | `.letter-reference` | ○ | Subject/RE line (optional) |
| 5 | `salutation` | `.letter-salutation` | ✓ | "Dear [Name]:" |
| 6 | `body` | `.letter-body` | ✓ | Main content paragraphs |
| 7 | `statutory_block` | `.statutory-language` | ○ | Legal citations (FOIA/PRA letters only) |
| 8 | `closing` | `.letter-closing` | ✓ | "Sincerely," or similar |
| 9 | `signature_block` | `.letter-signature` | ✓ | Signature line, name, title, contact |
| 10 | `footer` | `.letter-footer` | ○ | Confidentiality notice (optional) |

**Legend:** ✓ = Always present | ○ = Optional (may be hidden)

### Letter Type Configurations

| Letter Type | Visible Sections |
|-------------|-----------------|
| **FOIA Request** | letterhead, date_block, recipient_block, reference, salutation, body, statutory_block, closing, signature_block |
| **State PRA** | letterhead, date_block, recipient_block, reference, salutation, body, statutory_block, closing, signature_block |
| **NDA** | letterhead, date_block, recipient_block, salutation, body, closing, signature_block, footer |
| **Custom** | letterhead, date_block, recipient_block, salutation, body, closing, signature_block |

---

## Header Rules (Mutual Exclusivity)

| Condition | Header Content |
|-----------|---------------|
| Logo exists + enabled | **Logo ONLY** (no org name) |
| No logo OR logo disabled | **Organization Name ONLY** |
| Both disabled | Empty header (not recommended) |

**RULE:** Never show logo and organization name together in the header.

### Header CSS Classes
- `.letter-letterhead` - Header container (appears once per page)
- `.letterhead-logo` - Logo image (if logo mode)
- `.org-name` - Organization name text (if name mode)

### Header Constraints
- Header content is fixed-position
- No AI-generated content allowed in headers
- Header must appear consistently on each page
- Maximum logo height: 60px
- Maximum logo width: 200px

---

## Table of Contents

1. [Canonical Section Order](#canonical-section-order-immutable)
2. [Header Rules](#header-rules-mutual-exclusivity)
3. [Complete HTML Skeleton](#complete-html-skeleton)
4. [Section Reference](#section-reference)
5. [CSS Classes](#css-classes)
6. [Placeholder Variables](#placeholder-variables)
7. [Pagination Behavior](#pagination-behavior)
8. [Usage Examples](#usage-examples)

---

## Complete HTML Skeleton

```html
<div class="letter-document">
  <!-- ═══════════════════════════════════════════════════════════════════════
       SECTION 1: LETTERHEAD
       Appears at the top of page 1 only. Contains organization branding.
       ═══════════════════════════════════════════════════════════════════════ -->
  <div class="letterhead">
    <div class="letterhead-logo">
      <img src="{{organization.logoUrl}}" alt="{{organization.name}}" />
    </div>
    <div class="letterhead-info">
      <div class="letterhead-name">{{organization.name}}</div>
      <div class="letterhead-address">{{organization.address}}</div>
      <div class="letterhead-address">{{organization.city}}, {{organization.state}} {{organization.zipCode}}</div>
      <div class="letterhead-contact">{{organization.phone}} | {{organization.email}}</div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECTION 2: DATE BLOCK
       Letter date, positioned below letterhead with appropriate spacing.
       ═══════════════════════════════════════════════════════════════════════ -->
  <div class="letter-date">{{formattedDate}}</div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECTION 3: RECIPIENT BLOCK
       Complete recipient address block with proper line spacing.
       ═══════════════════════════════════════════════════════════════════════ -->
  <div class="recipient-block">
    <div class="recipient-name">{{recipient.name}}</div>
    <div class="recipient-title">{{recipient.title}}</div>
    <div class="recipient-organization">{{recipient.organization}}</div>
    <div class="recipient-address">{{recipient.address}}</div>
    <div class="recipient-address">{{recipient.city}}, {{recipient.state}} {{recipient.zipCode}}</div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECTION 4: REFERENCE LINE (Optional)
       Case reference, invoice number, or subject line.
       ═══════════════════════════════════════════════════════════════════════ -->
  <div class="reference-line">
    <strong>Re:</strong> {{case.title}} (Case #{{case.caseNumber}})
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECTION 5: SALUTATION
       Opening greeting.
       ═══════════════════════════════════════════════════════════════════════ -->
  <div class="salutation">{{salutation}}</div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECTION 6: LETTER BODY
       Main content area with paragraphs, headings, and lists.
       ═══════════════════════════════════════════════════════════════════════ -->
  <div class="letter-body">
    <!-- Standard paragraph -->
    <p class="letter-paragraph">
      {{bodyContent}}
    </p>

    <!-- Section heading (optional) -->
    <h3 class="letter-section-heading">{{sectionTitle}}</h3>

    <!-- Additional paragraphs -->
    <p class="letter-paragraph">
      {{additionalContent}}
    </p>

    <!-- Bulleted list -->
    <ul class="letter-list">
      <li class="letter-list-item">{{listItem1}}</li>
      <li class="letter-list-item">{{listItem2}}</li>
      <li class="letter-list-item">{{listItem3}}</li>
    </ul>

    <!-- Numbered list -->
    <ol class="letter-list letter-list-numbered">
      <li class="letter-list-item">{{numberedItem1}}</li>
      <li class="letter-list-item">{{numberedItem2}}</li>
    </ol>

    <!-- Emphasized text -->
    <p class="letter-paragraph">
      <strong class="letter-emphasis">{{emphasizedText}}</strong>
    </p>

    <!-- Legal/statutory language block -->
    <div class="statutory-block">
      <p class="statutory-text">{{statutoryLanguage}}</p>
      <p class="statutory-citation">{{legalCitation}}</p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECTION 7: SIGNATURE BLOCK
       Closing, signature area, and signer information.
       ═══════════════════════════════════════════════════════════════════════ -->
  <div class="signature-block">
    <div class="signature-closing">{{closing}}</div>
    <div class="signature-line"></div>
    <div class="signature-name">{{signer.name}}</div>
    <div class="signature-title">{{signer.title}}</div>
    <div class="signature-credentials">{{signer.credentials}}</div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       SECTION 8: CONFIDENTIALITY FOOTER (Optional)
       Legal disclaimer or confidentiality notice.
       ═══════════════════════════════════════════════════════════════════════ -->
  <div class="confidentiality-footer">
    <p class="confidentiality-text">{{confidentialityNotice}}</p>
  </div>
</div>
```

---

## Section Reference

| Section | CSS Class | Purpose | Page Behavior |
|---------|-----------|---------|---------------|
| Letterhead | `.letterhead` | Organization branding & contact | Page 1 only |
| Date | `.letter-date` | Letter date | Page 1 only |
| Recipient | `.recipient-block` | Addressee information | Page 1 only |
| Reference | `.reference-line` | Case/subject reference | Page 1 only |
| Salutation | `.salutation` | Opening greeting | Page 1 only |
| Body | `.letter-body` | Main content | Flows across pages |
| Signature | `.signature-block` | Closing & signature | Kept together |
| Footer | `.confidentiality-footer` | Legal disclaimer | Last page only |

---

## CSS Classes

### Container Classes

| Class | Description |
|-------|-------------|
| `.letter-document` | Root container for the entire letter |
| `.letter-body` | Main content wrapper |
| `.letterhead` | Organization header container |
| `.signature-block` | Signature area container |

### Letterhead Classes

| Class | Description |
|-------|-------------|
| `.letterhead-logo` | Logo image container |
| `.letterhead-info` | Text information container |
| `.letterhead-name` | Organization name (bold, larger) |
| `.letterhead-address` | Address lines |
| `.letterhead-contact` | Phone/email line |

### Content Classes

| Class | Description |
|-------|-------------|
| `.letter-date` | Date display |
| `.recipient-block` | Full recipient address block |
| `.recipient-name` | Recipient's name |
| `.recipient-title` | Recipient's title |
| `.recipient-organization` | Recipient's company/agency |
| `.recipient-address` | Address lines |
| `.reference-line` | Re: line with subject |
| `.salutation` | "Dear..." opening |

### Body Content Classes

| Class | Description |
|-------|-------------|
| `.letter-paragraph` | Standard body paragraph |
| `.letter-section-heading` | Section header (h3) |
| `.letter-list` | Bulleted list container |
| `.letter-list-numbered` | Modifier for numbered lists |
| `.letter-list-item` | Individual list item |
| `.letter-emphasis` | Bold/emphasized text |
| `.statutory-block` | Legal language container |
| `.statutory-text` | Statutory language text |
| `.statutory-citation` | Legal citation reference |

### Signature Classes

| Class | Description |
|-------|-------------|
| `.signature-closing` | "Sincerely," etc. |
| `.signature-line` | Visual line for signature |
| `.signature-name` | Signer's printed name |
| `.signature-title` | Signer's title |
| `.signature-credentials` | Professional credentials |

### Footer Classes

| Class | Description |
|-------|-------------|
| `.confidentiality-footer` | Footer container |
| `.confidentiality-text` | Disclaimer text |

---

## Placeholder Variables

### Organization Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{organization.name}}` | `organization_settings.company_name` | "Smith Investigations LLC" |
| `{{organization.logoUrl}}` | `organization_settings.logo_url` | "https://..." |
| `{{organization.address}}` | `organization_settings.address` | "123 Main Street" |
| `{{organization.city}}` | `organization_settings.city` | "Denver" |
| `{{organization.state}}` | `organization_settings.state` | "CO" |
| `{{organization.zipCode}}` | `organization_settings.zip_code` | "80202" |
| `{{organization.phone}}` | `organization_settings.phone` | "(303) 555-1234" |
| `{{organization.email}}` | `organization_settings.email` | "info@smithinv.com" |
| `{{organization.licenseNumber}}` | `organization_settings.agency_license_number` | "PI-12345" |

### Case Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{case.title}}` | `cases.title` | "Insurance Fraud Investigation" |
| `{{case.caseNumber}}` | `cases.case_number` | "2024-001234" |
| `{{case.referenceNumber}}` | `cases.reference_number` | "CLM-789456" |
| `{{case.status}}` | `cases.status` | "Active" |
| `{{case.description}}` | `cases.description` | "Investigation of..." |

### Recipient Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{recipient.name}}` | User input / contact | "Jane Doe" |
| `{{recipient.title}}` | User input / contact | "Records Custodian" |
| `{{recipient.organization}}` | User input / contact | "ABC Corporation" |
| `{{recipient.address}}` | User input / contact | "456 Corporate Blvd" |
| `{{recipient.city}}` | User input / contact | "Chicago" |
| `{{recipient.state}}` | User input / contact | "IL" |
| `{{recipient.zipCode}}` | User input / contact | "60601" |

### Signer Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{signer.name}}` | `organization_settings.signature_name` | "John Smith" |
| `{{signer.title}}` | `organization_settings.signature_title` | "Principal Investigator" |
| `{{signer.credentials}}` | User input | "Licensed Private Investigator" |

### Date Variables

| Variable | Format | Example |
|----------|--------|---------|
| `{{formattedDate}}` | Full date | "January 7, 2026" |
| `{{shortDate}}` | Short date | "01/07/2026" |
| `{{isoDate}}` | ISO format | "2026-01-07" |

### Common Text Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{salutation}}` | Opening greeting | "Dear Ms. Doe:" |
| `{{closing}}` | Sign-off phrase | "Sincerely," |
| `{{confidentialityNotice}}` | Legal disclaimer | "This letter contains..." |

---

## Pagination Behavior

### Page Break Control

```css
/* Keep signature block together on same page */
.signature-block {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Prevent orphaned headings */
.letter-section-heading {
  break-after: avoid;
  page-break-after: avoid;
}

/* Keep list items together */
.letter-list {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

### Running Headers/Footers (Multi-page)

For letters spanning multiple pages, use CSS `@page` rules:

```css
@page {
  @top-right {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 10px;
    color: #666;
  }
  
  @bottom-center {
    content: "{{case.caseNumber}}";
    font-size: 9px;
    color: #999;
  }
}

/* Hide letterhead on subsequent pages */
@page :not(:first) {
  margin-top: 1in;
}
```

---

## Usage Examples

### Example 1: Basic FOIA Request Letter

```html
<div class="letter-document">
  <div class="letterhead">
    <div class="letterhead-info">
      <div class="letterhead-name">Smith Investigations LLC</div>
      <div class="letterhead-address">123 Main Street</div>
      <div class="letterhead-address">Denver, CO 80202</div>
      <div class="letterhead-contact">(303) 555-1234 | info@smithinv.com</div>
    </div>
  </div>

  <div class="letter-date">January 7, 2026</div>

  <div class="recipient-block">
    <div class="recipient-name">FOIA Officer</div>
    <div class="recipient-organization">Department of Justice</div>
    <div class="recipient-address">950 Pennsylvania Avenue, NW</div>
    <div class="recipient-address">Washington, DC 20530</div>
  </div>

  <div class="reference-line">
    <strong>Re:</strong> Freedom of Information Act Request
  </div>

  <div class="salutation">Dear FOIA Officer:</div>

  <div class="letter-body">
    <p class="letter-paragraph">
      Pursuant to the Freedom of Information Act, 5 U.S.C. § 552, I am 
      requesting access to and copies of the following records...
    </p>

    <ul class="letter-list">
      <li class="letter-list-item">All correspondence regarding Case #12345</li>
      <li class="letter-list-item">Investigation reports from January 2025</li>
      <li class="letter-list-item">Related photographs and documentation</li>
    </ul>

    <div class="statutory-block">
      <p class="statutory-text">
        Under 5 U.S.C. § 552(a)(6)(A)(i), you are required to respond 
        to this request within 20 business days.
      </p>
    </div>
  </div>

  <div class="signature-block">
    <div class="signature-closing">Sincerely,</div>
    <div class="signature-line"></div>
    <div class="signature-name">John Smith</div>
    <div class="signature-title">Principal Investigator</div>
  </div>
</div>
```

### Example 2: Client Correspondence

```html
<div class="letter-document">
  <div class="letterhead">
    <div class="letterhead-logo">
      <img src="/logos/company-logo.png" alt="Smith Investigations" />
    </div>
    <div class="letterhead-info">
      <div class="letterhead-name">Smith Investigations LLC</div>
      <div class="letterhead-contact">License #PI-12345</div>
    </div>
  </div>

  <div class="letter-date">January 7, 2026</div>

  <div class="recipient-block">
    <div class="recipient-name">Ms. Sarah Johnson</div>
    <div class="recipient-organization">ABC Insurance Company</div>
    <div class="recipient-address">789 Corporate Drive, Suite 100</div>
    <div class="recipient-address">Chicago, IL 60601</div>
  </div>

  <div class="reference-line">
    <strong>Re:</strong> Case Update - Claim #CLM-456789
  </div>

  <div class="salutation">Dear Ms. Johnson:</div>

  <div class="letter-body">
    <p class="letter-paragraph">
      I am writing to provide you with an update on the above-referenced 
      investigation. Our team has completed the initial surveillance phase 
      and documented the following findings:
    </p>

    <h3 class="letter-section-heading">Key Findings</h3>

    <ol class="letter-list letter-list-numbered">
      <li class="letter-list-item">Subject was observed at the residence on three occasions</li>
      <li class="letter-list-item">Activity levels appear consistent with reported injuries</li>
      <li class="letter-list-item">No contradictory evidence was documented</li>
    </ol>

    <p class="letter-paragraph">
      Based on these findings, we recommend 
      <strong class="letter-emphasis">continuing surveillance for an additional 
      five days</strong> to establish a complete activity pattern.
    </p>
  </div>

  <div class="signature-block">
    <div class="signature-closing">Best regards,</div>
    <div class="signature-line"></div>
    <div class="signature-name">John Smith</div>
    <div class="signature-title">Principal Investigator</div>
    <div class="signature-credentials">Licensed Private Investigator, State of Colorado</div>
  </div>

  <div class="confidentiality-footer">
    <p class="confidentiality-text">
      CONFIDENTIAL: This letter and any attachments contain privileged 
      information intended only for the addressee. Unauthorized disclosure, 
      copying, or distribution is prohibited.
    </p>
  </div>
</div>
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/paginatedLetterStyles.ts` | CSS styles for preview & export |
| `src/lib/letterDocumentEngine.ts` | Document creation engine |
| `src/lib/letterBranding.ts` | Branding/letterhead rendering |
| `src/lib/letterTemplateRenderer.ts` | Template binding & rendering |
| `src/components/documents/LetterPreview.tsx` | Preview component |
| `src/components/documents/PaginatedDocumentViewer.tsx` | Paginated viewer |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-07 | Initial skeleton documentation |

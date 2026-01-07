# Canonical Letter HTML Skeleton

This document provides the definitive HTML structure and CSS classes for generating professional letters in the application. All letter templates should follow this skeleton to ensure consistent styling, proper pagination, and reliable PDF export.

---

## Canonical Section Order (IMMUTABLE)

**This order is the base contract for all letters. Sections may be shown or hidden, but NEVER rearranged.**

| Order | Section ID | CSS Class | Required | Description |
|-------|-----------|-----------|----------|-------------|
| 1 | `letterhead` | `.letter-letterhead` | ✓ | Organization branding, logo, contact info |
| 2 | `date_block` | `.letter-date` | ✓ | Letter date, **left-aligned** (single authoritative date) |
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

## Date Rules (Single Authoritative Date)

**RULE:** Each letter must contain exactly **one primary date** that appears once, below the letterhead, and is **left-aligned**.

| Requirement | Enforcement |
|-------------|-------------|
| Exactly one primary date | Validation error if 0 or >1 date blocks |
| Position | Below letterhead, before recipient block |
| Alignment | **Left-aligned** (not right-aligned) |
| Format | Full (January 15, 2024) or Short (01/15/2024) |
| Header/Footer dates | **Not allowed** - validation error |

### Valid Structure
```
[Letterhead]

January 7, 2026     ← Primary date (left-aligned)

[Recipient Block]
...
```

### Content Dates vs Letter Date
Dates that are part of the letter content (e.g., "records from January 2023 to March 2024") are **allowed** but are **NOT** considered the letter date. They are content dates and do not violate the single-date rule.

### Date CSS Class
- `.letter-date` - Primary date block (appears once, left-aligned)

### Date Validation
The system validates:
1. Exactly one `.letter-date` element exists
2. No date elements in letterhead header
3. Warning if date-like content in footer
4. Multiple date blocks = validation error

---

## Table of Contents

1. [Canonical Section Order](#canonical-section-order-immutable)
2. [Header Rules](#header-rules-mutual-exclusivity)
3. [Date Rules](#date-rules-single-authoritative-date)
4. [Typography Rules](#typography-rules-professional-correspondence)
5. [Vertical Rhythm](#vertical-rhythm-fixed-spacing-rules)
6. [Complete HTML Skeleton](#complete-html-skeleton)
7. [Section Reference](#section-reference)
8. [CSS Classes](#css-classes)
9. [Placeholder Variables](#placeholder-variables)
10. [Pagination Behavior](#pagination-behavior)
11. [Usage Examples](#usage-examples)

---

## Typography Rules (Professional Correspondence)

Professional business letters must follow strict typography standards to match traditional correspondence.

### Alignment Rules

| Element | Alignment | Notes |
|---------|-----------|-------|
| **Body text** | Left-aligned | Ragged right edge |
| **Paragraphs** | Left-aligned | No indentation |
| **Subject line** | Left-aligned | Bold |
| **Letterhead** | Center (exception) | Logo/org name only |
| **Footer** | Center (optional) | Confidentiality notice |

### Prohibited Styles

| Style | Reason |
|-------|--------|
| `text-align: justify` | Creates uneven spacing, looks unprofessional |
| `text-align: center` (in body) | Not appropriate for correspondence |
| Decorative fonts | Reduces readability and professionalism |
| Multiple font families | Creates visual inconsistency |

### Font Rules

| Rule | Value |
|------|-------|
| Font family | Times New Roman, Times, Georgia, serif |
| Font size | 12pt |
| Line height | 1.5 |
| Color | Black (#000) |

### Subject Line (Reference Line)

The subject line (RE: line) must be:
- **Bold** (`font-weight: bold`)
- **Left-aligned** (`text-align: left`)
- Positioned after recipient block, before salutation

```css
.letter-reference,
.reference-line {
  font-weight: bold;
  text-align: left;
  margin-bottom: 12pt;
}
```

### CSS Enforcement

The unified styles explicitly prohibit justification:

```css
.letter-body,
.letter-body * {
  text-align: left !important;
  text-justify: none !important;
}
```

---

## AI Content Boundaries

### System-Controlled Sections (AI MUST NOT Generate)

| Section | CSS Class | Reason |
|---------|-----------|--------|
| `letterhead` | `.letter-letterhead` | Branding from organization profile |
| `date_block` | `.letter-date` | System date, standardized format |
| `recipient_block` | `.letter-recipient` | User form input |
| `reference` | `.letter-reference` | User form input |
| `salutation` | `.letter-salutation` | User form input + formatting |
| `closing` | `.letter-closing` | Standard phrases |
| `signature_block` | `.letter-signature` | User profile data |
| `footer` | `.letter-footer` | Organization settings |

### AI-Editable Sections (AI MAY Generate)

| Section | CSS Class | What AI Can Do |
|---------|-----------|----------------|
| `body` | `.letter-body` | Draft paragraphs, rewrite text, adjust tone |
| `statutory_block` | `.statutory-language` | Draft legal language with required citations |

### AI Restrictions

**AI MUST NOT:**
- Insert headers
- Insert dates
- Insert logos
- Insert addresses
- Control spacing
- Modify layout

**AI MAY ONLY:**
- Draft paragraph content
- Suggest tone refinements
- Rewrite body text
- Include statutory language (for legal letters)

### Validation

The system validates AI content with `detectSystemSectionIntrusion()`:
1. Detects date block patterns
2. Detects letterhead classes
3. Detects recipient/signature patterns
4. Detects address block formats
5. Strips intrusions and logs violations

**Layout is SYSTEM-CONTROLLED, not AI-controlled.**

---

## Vertical Rhythm (Fixed Spacing Rules)

All letters use a consistent vertical rhythm based on the **12pt baseline** to create a traditional business letter feel.

### Spacing Tokens

| Token | Value | CSS Variable | Use Case |
|-------|-------|--------------|----------|
| **XS** | 6pt (0.5 line) | `--letter-space-xs` | Within blocks, tight grouping |
| **SM** | 12pt (1 line) | `--letter-space-sm` | Between paragraphs |
| **MD** | 18pt (1.5 lines) | `--letter-space-md` | Between sections |
| **LG** | 24pt (2 lines) | `--letter-space-lg` | Major separations |
| **XL** | 36pt (3 lines) | `--letter-space-xl` | After letterhead, signature space |

### Section Spacing

| Section | Top Spacing | Bottom Spacing | Notes |
|---------|-------------|----------------|-------|
| **Letterhead** | 0 | 36pt (XL) | Clear separation from date |
| **Date Block** | 0 | 24pt (LG) | Space before recipient |
| **Recipient Block** | 0 | 18pt (MD) | Compact address block |
| **Reference/RE Line** | 0 | 12pt (SM) | Tight to salutation |
| **Salutation** | 0 | 12pt (SM) | Tight to body |
| **Body Paragraphs** | 0 | 12pt (SM) | Standard paragraph spacing |
| **Section Headings** | 18pt (MD) | 6pt (XS) | Keep heading with content |
| **Signature Block** | 24pt (LG) | 0 | Space from body |
| **Closing ("Sincerely")** | 0 | 36pt (XL) | Space for wet signature |
| **Footer** | 24pt (LG) | 0 | Separator from content |

### Page Break Rules

| Rule | Description |
|------|-------------|
| Signature blocks | MUST stay together (never split across pages) |
| Signature with content | MUST stay with at least one body paragraph |
| First element on new page | No top margin (prevents excessive whitespace) |
| Orphans/widows | Minimum 3 lines per page |
| Section headings | Keep with following content |

### Visual Comparison

**Correct (Rhythmic):**
```
[Letterhead]
          [36pt - 3 lines]
January 7, 2026
          [24pt - 2 lines]
John Doe
ABC Corp
123 Main St
          [18pt - 1.5 lines]
Dear Mr. Doe:
          [12pt - 1 line]
Body paragraph...
          [12pt - 1 line]
Body paragraph...
          [24pt - 2 lines]
Sincerely,
          [36pt - signature space]
_______________
John Smith
Investigator
```

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

## Letter Type Content Separation

### Body-Only Generators (letterBodyGenerators.ts)

Letter type generators define **CONTENT ONLY**, not layout:

| Generator | Defines | Does NOT Define |
|-----------|---------|-----------------|
| `generateFOIABodyContent()` | Statutory language, request paragraphs, fee waiver text | Headers, dates, addresses, signatures |
| `generateStatePRABodyContent()` | State-specific statutory text, request details | Layout elements |
| `generatePublicRecordsBodyContent()` | Legal authority citations, format preferences | Headers, dates, addresses |
| `generateNDABodyContent()` | Terms, obligations, definitions | Title formatting, external signatures |
| `generateCorrespondenceBodyContent()` | Body paragraphs, closing line | All layout elements |

### Letter Assembly Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    LETTER ASSEMBLY FLOW                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  letterBodyGenerators.ts           letterDocumentEngine.ts       │
│  ─────────────────────────         ──────────────────────        │
│                                                                  │
│  generateFOIABodyContent()   ──►   createLetterDocument()        │
│    ├─ Statutory language              ├─ Letterhead (SYSTEM)     │
│    ├─ Request paragraphs              ├─ Date block (SYSTEM)     │
│    ├─ Fee waiver language             ├─ Recipient block (SYSTEM)│
│    └─ Appeal language                 ├─ Salutation (SYSTEM)     │
│                                       ├─ [BODY CONTENT] ◄────────┤
│  renderFOIABodyHtml()                 ├─ Closing (SYSTEM)        │
│    └─ Returns HTML paragraphs         ├─ Signature block (SYSTEM)│
│                                       └─ Footer (SYSTEM)         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Example Flow

```typescript
// 1. Generate body content (paragraphs only)
const bodyContent = generateFOIABodyContent(formData);
const bodyHtml = renderFOIABodyHtml(bodyContent);

// 2. System assembles complete letter with layout
const letter = createLetterDocument(bodyHtml, branding, org, {
  recipient: { 
    name: 'FOIA Officer', 
    organization: 'Department of Justice',
    address: '950 Pennsylvania Avenue NW\nWashington, DC 20530' 
  },
  subject: 'FOIA Request',
  salutation: 'Dear FOIA Officer',
  closing: 'Sincerely,'
});
```

### Why This Matters

| Benefit | Description |
|---------|-------------|
| **Visual Consistency** | All letters use identical layout rules regardless of type |
| **Maintainability** | Change layout once in `letterDocumentEngine.ts`, applies everywhere |
| **AI Safety** | AI can only modify body content, never layout elements |
| **Separation of Concerns** | Content generators focus on text, engine handles presentation |
| **Testability** | Body content can be tested independently of layout |

---

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/letterBodyGenerators.ts` | Body-only content generators (NEW) |
| `src/lib/letterGenerators.ts` | DEPRECATED full letter generators |
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
| 1.1 | 2026-01-07 | Added Letter Type Content Separation section, body-only generators |
| 1.0 | 2026-01-07 | Initial skeleton documentation |

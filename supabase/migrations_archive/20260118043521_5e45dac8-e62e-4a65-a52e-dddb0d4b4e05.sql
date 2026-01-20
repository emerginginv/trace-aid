-- Insert Reports & Exports documentation
INSERT INTO public.help_articles (
  title,
  slug,
  content,
  category_id,
  summary,
  related_feature,
  is_active,
  display_order
) VALUES (
  'Reports and Exports: Professional Documentation',
  'reports-exports-professional-documentation',
  '# Reports and Exports: Professional Documentation

CaseWyze''s reporting system transforms investigation work into professional, court-ready deliverables. This guide explains report types, data sourcing, and how the system supports legal and insurance use cases while preserving audit integrity.

---

## Why Professional Reports Matter

Investigation reports serve critical purposes beyond simple documentation:

| Purpose | Requirement |
|---------|-------------|
| **Client Delivery** | Clear, professional presentation of findings |
| **Legal Proceedings** | Court-admissible documentation with evidence chain |
| **Insurance Claims** | Structured data for claim evaluation |
| **Regulatory Compliance** | Demonstrable work product for licensing |
| **Billing Support** | Justification for invoiced services |

Poor reports create risks:

| Risk | Consequence |
|------|-------------|
| Missing information | Case dismissed, claim denied |
| Inconsistent data | Credibility challenged |
| No audit trail | Evidence excluded |
| Unprofessional format | Client confidence lost |

---

## Report Types

CaseWyze supports three primary reporting mechanisms:

### 1. DOCX Template Reports (Primary)

Custom Word document templates with merge variables that pull live case data.

| Feature | Description |
|---------|-------------|
| **Format** | Microsoft Word (.docx) |
| **Customization** | Organization-branded templates |
| **Variables** | 50+ merge fields for case data |
| **Output** | Downloadable Word document |
| **Storage** | Saved to case record with audit trail |

**Best For**: Client-facing reports, court filings, formal deliverables

### 2. PDF Case Summaries

Standardized PDF exports generated from case data.

| Feature | Description |
|---------|-------------|
| **Format** | PDF |
| **Customization** | Configurable sections |
| **Content** | Case header, timeline, activities, attachments |
| **Output** | Immediate download |
| **Storage** | Not saved (generated on-demand) |

**Best For**: Quick summaries, internal reviews, case handoffs

### 3. CSV Data Exports

Raw data exports for external analysis.

| Feature | Description |
|---------|-------------|
| **Format** | CSV (spreadsheet-compatible) |
| **Content** | Time entries, expenses, activities, subjects |
| **Output** | Immediate download |
| **Use Case** | External analysis, accounting import |

**Best For**: Financial reconciliation, bulk analysis, third-party tools

---

## DOCX Template Reports: Deep Dive

### How Templates Work

1. **Administrator uploads** Word document with merge variables
2. **System validates** and catalogs recognized variables
3. **User generates** report from case detail page
4. **System resolves** all variables with live case data
5. **Output saved** to case record with audit trail

### Available Merge Variables

CaseWyze provides 50+ merge variables organized by category:

#### Case Variables

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{{Case.case_number}}` | Case number | 2024-0042 |
| `{{Case.case_status}}` | Current status | Active |
| `{{Case.notes}}` | Notes & instructions | Full text content |
| `{{Case.due_on}}` | Due date | 2024-02-15 |
| `{{Case.due_on_long}}` | Due date (formatted) | February 15, 2024 |
| `{{Case.created_on}}` | Creation date | 2024-01-10 |
| `{{Case.budget_hours}}` | Budget in hours | 40 |
| `{{Case.budget_money}}` | Budget in dollars | $4,000.00 |
| `{{Case.primary_subject}}` | Primary subject name | John D. Smith |
| `{{Case.expense_total}}` | Total expenses | $1,234.56 |
| `{{Case.expense_hour_total}}` | Total hours | 32.5 |
| `{{Case.invoice_total}}` | Total invoiced | $3,250.00 |

#### Client Variables

| Variable | Description |
|----------|-------------|
| `{{Client.name}}` | Client/account name |
| `{{Client.address}}` | Full address |
| `{{Client.email}}` | Email address |
| `{{Client.phone}}` | Phone number |

#### Contact Variables

| Variable | Description |
|----------|-------------|
| `{{Contact.name}}` | Contact full name |
| `{{Contact.email}}` | Contact email |
| `{{Contact.phone}}` | Contact phone |
| `{{Contact.title}}` | Contact job title |

#### Subject Variables

| Variable | Description |
|----------|-------------|
| `{{Subject.name}}` | Subject full name |
| `{{Subject.dob}}` | Date of birth |
| `{{Subject.address}}` | Current address |
| `{{Subject.ssn_last4}}` | Last 4 of SSN (if authorized) |

#### Investigator Variables

| Variable | Description |
|----------|-------------|
| `{{Investigator.name}}` | Assigned investigator name |
| `{{Investigator.license}}` | License number |
| `{{Investigator.phone}}` | Contact phone |

#### Narrative Variables

| Variable | Description |
|----------|-------------|
| `{{Updates.all}}` | All updates combined |
| `{{Updates.surveillance}}` | Surveillance updates only |
| `{{Updates.latest}}` | Most recent update |
| `{{Timeline.all}}` | Combined activity timelines |

#### Organization Variables

| Variable | Description |
|----------|-------------|
| `{{Organization.name}}` | Firm name |
| `{{Organization.address}}` | Firm address |
| `{{Organization.phone}}` | Firm phone |
| `{{Organization.license}}` | Firm license number |

### Creating Effective Templates

**Template Structure Best Practices**:

```
[ORGANIZATION LETTERHEAD]

INVESTIGATION REPORT

Case Number: {{Case.case_number}}
Report Date: {{Report.generated_date}}
Prepared By: {{Investigator.name}}

CLIENT INFORMATION
{{Client.name}}
{{Client.address}}

SUBJECT INFORMATION
Name: {{Subject.name}}
Date of Birth: {{Subject.dob}}
Address: {{Subject.address}}

CASE SUMMARY
{{Case.notes}}

INVESTIGATION NARRATIVE
{{Updates.all}}

ACTIVITY TIMELINE
{{Timeline.all}}

CONCLUSIONS AND RECOMMENDATIONS
[Custom text section]

_______________________
{{Investigator.name}}
License #{{Investigator.license}}
{{Report.generated_date}}
```

---

## How Data Is Sourced

### Data Resolution Process

When a report is generated, CaseWyze:

1. **Identifies** the template and its variables
2. **Queries** the database for current case state
3. **Resolves** each variable to its current value
4. **Formats** data according to variable type
5. **Populates** the template with resolved values
6. **Generates** the final document
7. **Saves** the output with audit metadata

### Data Sources by Variable Category

| Category | Primary Table | Related Tables |
|----------|---------------|----------------|
| **Case** | `cases` | `case_types`, `case_lifecycle_statuses` |
| **Client** | `accounts` | `account_locations` |
| **Contact** | `contacts` | — |
| **Subject** | `case_subjects` | `subject_types` |
| **Updates** | `case_updates` | — |
| **Timeline** | `case_updates.activity_timeline` | `case_activities` |
| **Financial** | `time_entries`, `expense_entries` | `invoices` |
| **Investigator** | `profiles`, `case_investigators` | — |
| **Organization** | `organizations` | — |

### Data Freshness

| Scenario | Data State |
|----------|------------|
| **Report Generation** | Live data at moment of generation |
| **Saved Report** | Frozen at generation time |
| **Report Variables** | Saved with report for audit |

---

## What Is Included and Excluded

### Included in Reports

| Data Type | What''s Included |
|-----------|-----------------|
| **Case Information** | Number, status, dates, budget, instructions |
| **Subject Details** | Names, DOB, addresses (per permissions) |
| **Client Information** | Account, contact, billing details |
| **Investigator Data** | Names, license numbers, assignments |
| **Updates** | Narrative content, timestamps, authors |
| **Timelines** | Chronological activity logs |
| **Financial Summaries** | Totals (hours, expenses, invoiced) |
| **Attachment References** | File names, descriptions, counts |

### Excluded from Reports (by Default)

| Data Type | Reason for Exclusion |
|-----------|---------------------|
| **Full SSNs** | Sensitive PII protection |
| **Internal Notes** | Not for client distribution |
| **Billing Rates** | Internal pricing information |
| **Audit Logs** | System-level data |
| **Draft Updates** | Unpublished content |
| **Void Entries** | Cancelled/rejected items |
| **Other Case Data** | Organization isolation |

### Configurable Inclusions

Some content can be optionally included:

| Option | Default | When to Include |
|--------|---------|-----------------|
| **Attachment Thumbnails** | Off | Visual evidence reports |
| **Full Activity Timelines** | Off | Detailed surveillance reports |
| **Financial Line Items** | Off | Billing-focused reports |
| **SSN Last 4** | Off | Identity verification reports |

---

## Legal and Insurance Use Cases

### Court Proceedings

CaseWyze reports support legal proceedings with:

| Requirement | How CaseWyze Delivers |
|-------------|----------------------|
| **Authenticity** | SHA-256 file hashes on evidence |
| **Chain of Custody** | Upload logs, access logs, generation logs |
| **Contemporaneous Records** | Timestamps on all entries |
| **Author Attribution** | User IDs on updates, activities, entries |
| **Immutability** | Saved reports cannot be modified |
| **Verifiability** | Variables used are saved with report |

**Court-Ready Report Elements**:

- Clear investigator identification with license numbers
- Chronological timeline with precise timestamps
- Evidence references with file integrity verification
- Professional formatting meeting court standards
- Signature blocks with generation dates

### Insurance Claims

CaseWyze reports support insurance workflows with:

| Requirement | How CaseWyze Delivers |
|-------------|----------------------|
| **Claim Reference** | Custom reference fields for claim numbers |
| **Subject Identification** | Comprehensive subject data fields |
| **Activity Documentation** | Detailed surveillance timelines |
| **Photographic Evidence** | Attachment references with metadata |
| **Financial Summary** | Hours and expenses for cost justification |
| **Professional Format** | Branded templates meeting industry standards |

**Insurance-Specific Templates**:

Firms often create specialized templates for:

- Workers'' compensation surveillance reports
- Disability claim investigation reports
- SIU (Special Investigations Unit) summaries
- Fraud investigation documentation
- Asset search and background reports

---

## Accuracy Assurance

### Data Validation

CaseWyze ensures report accuracy through:

| Mechanism | Purpose |
|-----------|---------|
| **Live Resolution** | Variables pull current database values |
| **Type Formatting** | Dates, currency, numbers formatted consistently |
| **Null Handling** | Missing data shows placeholder, not errors |
| **Template Validation** | Unrecognized variables flagged at upload |

### Preventing Inaccuracies

| Risk | Prevention |
|------|------------|
| **Stale Data** | Reports generate from live database |
| **Manual Errors** | Merge variables eliminate transcription |
| **Inconsistent Formatting** | Templates enforce standardization |
| **Missing Information** | Variable validation during template setup |

### Quality Assurance Workflow

1. **Template Review**: Admin verifies template structure and variables
2. **Test Generation**: Generate test report before client use
3. **Preview Check**: Review generated report before saving
4. **Manager Approval**: Optional review step before delivery
5. **Saved Record**: Final version preserved for reference

---

## Defensibility Features

### Audit Trail Preservation

Every generated report creates an audit record:

| Field | Purpose |
|-------|---------|
| **report_id** | Unique identifier |
| **case_id** | Source case reference |
| **template_id** | Template used |
| **user_id** | Who generated |
| **generated_at** | When generated |
| **variables_used** | All resolved values saved |
| **output_file_path** | Storage location |

### Variables Preservation

The exact values used in each report are saved:

```json
{
  "Case.case_number": "2024-0042",
  "Case.case_status": "Active",
  "Subject.name": "John D. Smith",
  "Client.name": "ABC Insurance Co.",
  "Investigator.name": "Jane Investigator",
  "Report.generated_date": "January 15, 2024"
}
```

This enables:

- **Verification**: Confirm what data appeared in report
- **Comparison**: Check if case data changed after report
- **Testimony**: Reference exact values used
- **Disputes**: Prove report contents at generation time

### Immutability

| Document State | Modification Allowed |
|----------------|---------------------|
| **Generated Report** | ❌ Cannot be modified |
| **Source Template** | ⚠️ Creates new version |
| **Case Data** | ✅ Can change (next report reflects) |
| **Saved Variables** | ❌ Preserved permanently |

---

## Report Generation Workflow

### Standard Workflow

1. **Navigate** to case detail → Reports tab
2. **Click** "Generate Report"
3. **Select** template from available options
4. **Configure** optional inclusions (attachments, timelines)
5. **Preview** if desired
6. **Generate** and download
7. **Report saved** to case record automatically

### Batch Report Generation

For multiple cases (Enterprise feature):

1. **Select** cases from case list
2. **Choose** "Batch Export"
3. **Select** template
4. **Generate** all reports
5. **Download** as ZIP archive

### Scheduled Reports (Enterprise)

Automated report generation:

- Daily activity summaries
- Weekly case status reports
- Monthly financial summaries
- Custom scheduled templates

---

## Permission Requirements

| Action | Required Role |
|--------|---------------|
| **View Reports** | Investigator+ (assigned cases only) |
| **Generate Reports** | Manager, Admin |
| **Download Reports** | Manager, Admin |
| **Manage Templates** | Admin |
| **Batch Generation** | Admin (Enterprise) |

---

## Best Practices

### For Template Design

| Practice | Why |
|----------|-----|
| **Use organization letterhead** | Professional appearance |
| **Include license numbers** | Legal requirement in many jurisdictions |
| **Add signature blocks** | Authentication and accountability |
| **Test all variables** | Ensure proper resolution |
| **Version templates** | Track changes over time |
| **Keep backups** | Protect template investments |

### For Report Generation

| Practice | Why |
|----------|-----|
| **Review before saving** | Catch errors early |
| **Use descriptive titles** | Easy to find later |
| **Generate at milestones** | Preserve case state at key points |
| **Match template to purpose** | Court vs. client vs. internal |
| **Verify subject data** | Accuracy is critical |

### For Legal Defensibility

| Practice | Why |
|----------|-----|
| **Generate contemporaneously** | Reports closer to events are stronger |
| **Don''t backdate** | Timestamps are audited |
| **Include all relevant updates** | Completeness supports credibility |
| **Reference evidence properly** | Chain of custody matters |
| **Maintain consistency** | Same template for same case type |

---

## Common Mistakes and How to Avoid Them

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| **Generating too late** | Report doesn''t reflect investigation state | Generate at milestones |
| **Wrong template** | Missing required sections | Verify template before generating |
| **Incomplete updates** | Thin narrative content | Complete documentation first |
| **No review** | Errors reach client | Always preview before delivery |
| **Unrecognized variables** | Blank sections in report | Validate templates at upload |
| **Ignoring saved versions** | Lost report history | Use Reports tab for all generations |
| **Editing downloaded file** | Breaks audit trail | Regenerate if changes needed |

---

## Export Formats Reference

### DOCX (Word)

| Aspect | Details |
|--------|---------|
| **Compatibility** | Microsoft Word, Google Docs, LibreOffice |
| **Editability** | Fully editable after download |
| **Formatting** | Full template formatting preserved |
| **Best For** | Client-facing reports, court filings |

### PDF

| Aspect | Details |
|--------|---------|
| **Compatibility** | Universal (any PDF reader) |
| **Editability** | Read-only |
| **Formatting** | Standardized layout |
| **Best For** | Quick summaries, internal reviews |

### CSV

| Aspect | Details |
|--------|---------|
| **Compatibility** | Excel, Google Sheets, databases |
| **Editability** | Full data manipulation |
| **Formatting** | Raw data, no styling |
| **Best For** | Financial analysis, bulk processing |

---

## Summary

CaseWyze''s reporting system is built on three pillars:

### 1. Accuracy

- Live data resolution from current case state
- Merge variables eliminate transcription errors
- Template validation catches issues early
- Consistent formatting across all reports

### 2. Defensibility

- Complete audit trail for every generation
- Variables preserved with each report
- Immutable saved versions
- Chain of custody maintained

### 3. Professionalism

- Organization-branded templates
- Court-ready formatting
- Industry-standard structure
- Comprehensive variable library

When you need to present investigation findings to clients, courts, or insurance carriers, CaseWyze reports provide the documentation that withstands scrutiny. Every variable traces to verified case data, every generation is logged, and every report reflects the professional standards your firm represents.',
  '9465f035-71fe-43e1-b505-1ccab82412ac',
  'Complete guide to CaseWyze reports and exports. Learn about DOCX templates, PDF summaries, CSV exports, available merge variables, and how the system supports legal and insurance use cases with accuracy, defensibility, and audit trail preservation.',
  'reports',
  true,
  5
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category_id = EXCLUDED.category_id,
  summary = EXCLUDED.summary,
  related_feature = EXCLUDED.related_feature,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = now();
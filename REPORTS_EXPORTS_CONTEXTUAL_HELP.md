# Reports & Exports Contextual Help Reference

This document contains all help content, tooltips, warnings, and guidance for report generation and export functionality. Use this as a reference for maintaining consistency across the application.

---

## Report Types Overview

| Report Type | Format | Purpose | Data Scope |
|-------------|--------|---------|------------|
| **DOCX Case Report** | .docx | Professional client deliverables, legal submissions | Template-driven, selective evidence |
| **PDF Case Summary** | .pdf | Internal review, quick reference, print-ready | Section-selectable overview |
| **CSV Export** | .csv | Data analysis, spreadsheet integration | Table-level data export |
| **PDF List Export** | .pdf | Formatted printable records | Table-level formatted export |
| **Organization Data Export** | .json/.zip | Compliance backup, data portability | Full organization archive |

---

## Core Principles

### Accuracy
- Reports capture point-in-time snapshots
- Verify data before generation
- Changes after generation are not reflected
- Template variables populated from live database records

### Defensibility
- All reports are timestamped and attributed
- Linked attachments create evidence chains
- Activity timelines provide contemporaneous documentation
- Clear chain of custody for all generated documents

### Audit Trail Preservation
- Generation events are permanently logged
- Deletions are recorded but don't affect external copies
- Each report shows who generated what and when
- Immutable records once generated

---

## DOCX Report Generation

### Dialog Description
"Generate a professional case report using your organization's templates. Reports capture a point-in-time snapshot of case data - changes made after generation are not reflected in previously generated reports."

### Field Tooltips

| Element | Tooltip |
|---------|---------|
| Template Selector | "Select the DOCX template that defines your report structure and formatting. Templates are managed in Settings → Report Templates." |
| Variables Badges | "These placeholders will be replaced with actual case data when the report is generated." |
| Include Activity Timelines | "Activity timelines capture minute-by-minute field observations from updates. Only updates with timelines attached will contribute data." |

### Pre-Generation Reminder
"Verify all updates, expenses, and attachments are complete before generating. Reports cannot be modified after creation."

---

## Attachment Evidence Selector

### Section Title
"Select which attachments to include as evidence references in your report."

### Filter Tooltips

| Filter | Tooltip |
|--------|---------|
| All | "Show all case attachments regardless of type or linking status" |
| Linked | "Attachments associated with case updates - provides evidence chain for defensibility" |
| Documents | "PDFs, Word documents, and text files" |
| Images | "Photos and image evidence files" |

### Linked Badge
"This attachment is linked to a case update, creating a clear evidence chain."

### Unlinked Warning
"Unlinked attachments lack context. Attachments not associated with updates may be harder to explain in legal proceedings. Consider linking key evidence to updates before generating reports."

---

## PDF Case Summary

### Dialog Description
"Create a comprehensive PDF summary for internal use or client distribution. Select which sections to include. Excluded sections will not appear in the generated document."

### Section Tooltips

| Section | What's Included | What's Excluded |
|---------|-----------------|-----------------|
| General Information | Case number, title, status, dates, classification | Internal notes |
| Client & Contact Details | Client organization, claim reference, contacts | Billing information |
| Subjects | All case subjects with profile details | Internal risk assessments |
| Budget Summary | Budget allocations, consumption percentages | Internal rate information |
| Financial Details | Time entries, expenses, invoice status | - |
| Activities | Scheduled and completed activities with assignees | - |
| Notes & Updates | Case updates with timestamps, activity timelines | - |
| Attachments | List of attached files with metadata | Actual file contents |
| Related Cases | Links to connected cases | - |

### Snapshot Guidance
"The PDF captures current case data at the moment of generation. Updates made after generation will not appear in downloaded summaries. For official client deliverables, consider using DOCX templates which offer more formatting control."

### Preview Environment Warning
"PDF download requires the production environment. In preview mode, use Print Preview to review the output. Print Preview renders the same content that would appear in the PDF."

---

## CSV/PDF List Exports

### Dropdown Tooltip
"Export the current view to a file for offline use or external analysis."

### Export Option Tooltips

| Option | Tooltip |
|--------|---------|
| Export as CSV | "Download raw data as a spreadsheet file. Includes visible columns only - can be opened in Excel or Google Sheets for further analysis." |
| Export as PDF | "Download a formatted PDF document. Layout matches the current table view with headers and totals where applicable." |

### Context-Specific Guidance

| Export Context | What's Included | What's Excluded |
|----------------|-----------------|-----------------|
| Cases List | Case numbers, titles, statuses, dates | Case contents, updates, financials |
| Subjects List | Names, types, associated cases | Profile images, sensitive identifiers |
| Invoices List | Numbers, amounts, statuses, dates | Line item details |
| Time Entries | Dates, hours, rates, descriptions | Internal notes |
| Expenses | Dates, amounts, categories, descriptions | Receipt attachments |

---

## Organization Data Export

### Export Types

| Type | Tooltip |
|------|---------|
| Full Export | "Complete organization archive: cases, subjects, users, settings, attachments, and all related records. Use for disaster recovery or regulatory compliance." |
| Cases Only | "All case data including subjects, activities, updates, and financial records. Excludes user profiles and organization settings." |
| Attachments Only | "All uploaded files and documents. Does not include case metadata or text content." |

### Processing Warning
"Large exports may take time. Full organization exports can take several hours depending on data volume. You'll receive an email notification when your export is ready for download."

### Availability
"Exports are securely generated and available for download for 7 days after completion."

---

## Generated Reports List

### Panel Description
"Previously generated reports are stored for audit purposes. Each report represents case data at the time of generation and is immutable."

### Column Tooltips

| Column | Tooltip |
|--------|---------|
| Report Title | "Report name based on template and generation date" |
| Generated | "When this snapshot was created - data reflects this timestamp" |
| Generated By | "User who initiated report generation - logged for audit trail" |

### Action Tooltips

| Action | Tooltip |
|--------|---------|
| Download | "Download the original generated file" |
| Delete | "Remove from list. Note: Deletion is logged but does not affect external copies already downloaded." |

### Empty State
"No reports have been generated for this case yet. Generate a report to create professional documentation from your case data. Generated reports are stored here for future access and audit purposes."

---

## Warnings and Exclusions

### What Gets Excluded by Report Type

| Report Type | Exclusions |
|-------------|------------|
| DOCX Report | Only data matching template variables is included. Custom fields not in the template will not appear. |
| PDF Summary | Deselected sections are completely omitted. Financial details are rounded to 2 decimal places. |
| CSV Export | Only visible table columns are exported. Hidden columns and nested data are excluded. |
| Attachments in Reports | Attachment references only - actual files are not embedded. Recipients need case access to view files. |

### Assumptions Made

| Context | Assumption |
|---------|------------|
| Financial Totals | Totals include approved entries only. Pending entries are excluded from calculations. |
| Activity Timelines | Timelines are sorted chronologically by entry time, not creation time. |
| Subject Data | Subject details reflect current state. Historical changes are not tracked in reports. |

---

## When to Use Each Report Type

| Use Case | Recommended Report | Why |
|----------|-------------------|-----|
| Client Deliverable | DOCX Template Report | Professional formatting, branded layout, selective content |
| Attorney Submission | DOCX with Activity Timelines | Defensible documentation with chronological evidence |
| Internal Review | PDF Summary | Quick overview, section-selectable, no template needed |
| Data Analysis | CSV Export | Opens in spreadsheets, supports formulas and filtering |
| Compliance Audit | Full Organization Export | Complete data capture for regulatory requirements |
| Backup/Archive | Organization Data Export | Disaster recovery, data portability |

---

## Key Messages Summary

### Why Reports Must Be Accurate
- Creates legally defensible documentation
- Supports client billing and case closeout
- Preserves evidence for potential litigation
- Demonstrates professional due diligence

### Why Linking Matters
- Creates audit trail proving work was performed
- Enables clear evidence chain for attachments
- Supports defensibility when challenged
- Improves report completeness and quality

### What Happens If Data Is Missing
- Reports will have gaps that may raise questions
- Unlinked attachments harder to defend in proceedings
- Missing activity timelines reduce chronological clarity
- Incomplete financial data affects billing accuracy

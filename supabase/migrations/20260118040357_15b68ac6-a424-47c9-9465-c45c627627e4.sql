
-- CaseWyze Help Center Complete Restructure
-- Clean slate approach: remove old data first, then insert new structure

-- Delete all existing articles first (foreign key constraint)
DELETE FROM help_articles;

-- Delete all existing categories
DELETE FROM help_categories;

-- Create 12 new categories
INSERT INTO help_categories (name, slug, description, icon, display_order, is_active) VALUES
('Getting Started', 'getting-started', 'First-time orientation and platform fundamentals for all new users', 'Rocket', 1, true),
('Case Requests and Intake', 'case-requests-intake', 'Public intake forms through case creation workflows', 'Inbox', 2, true),
('Case Management', 'case-management', 'Day-to-day case operations for investigators and managers', 'Briefcase', 3, true),
('Case Lifecycle and Status', 'case-lifecycle-status', 'Status system, phase management, and workflow controls', 'GitBranch', 4, true),
('Activities and Scheduling', 'activities-scheduling', 'Tasks, events, calendar, and time tracking', 'CalendarDays', 5, true),
('Updates and Documentation', 'updates-documentation', 'Case narratives, activity timelines, and investigative documentation', 'FileText', 6, true),
('Evidence and Attachments', 'evidence-attachments', 'File management, chain of custody, and evidence integrity', 'FileCheck', 7, true),
('Billing and Finances', 'billing-finances', 'Time tracking, expenses, invoicing, and retainers', 'DollarSign', 8, true),
('Reports and Exports', 'reports-exports', 'Document generation, professional deliverables, and data exports', 'FileOutput', 9, true),
('Security and Access Control', 'security-access-control', 'Permissions, audit trails, and compliance', 'Shield', 10, true),
('External Access', 'external-access', 'Vendor portal and client-facing features', 'ExternalLink', 11, true),
('Organization Settings', 'organization-settings', 'System configuration and organization management', 'Settings', 12, true);

-- CATEGORY 1: Getting Started (8 articles)
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Welcome to CaseWyze', 'welcome-to-casewyze', 
'Platform overview, core concepts, and navigation primer',
'# Welcome to CaseWyze

CaseWyze is a professional case management platform designed for investigative organizations.

## Core Concepts

### Cases
A case is the central unit of work. Each case represents an investigation, claim, or matter being handled. Cases contain subjects, activities, updates, evidence, and financial records.

### Subjects
Subjects are the people, vehicles, locations, or items being investigated. A case can have multiple subjects, with one designated as primary.

### Activities
Activities represent work performed on a case—tasks (action items with due dates) and events (scheduled appointments or field work).

### Updates
Updates are narrative documentation of investigative findings, created manually or generated automatically from activity completions.

### Evidence
Evidence includes all files and attachments. CaseWyze maintains cryptographic hashes for integrity verification.

## Navigation
The sidebar provides access to Dashboard, Cases, Calendar, Requests, Reports, and Settings.

## Your Role
Access levels: Administrator (full access), Manager (oversight), Investigator (field work), Vendor (limited external access).', 1, true
FROM help_categories c WHERE c.slug = 'getting-started';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Quick Start for Investigators', 'quick-start-investigators',
'Role-specific onboarding for field investigators',
'# Quick Start for Investigators

## Your Dashboard
Shows My Cases, Today''s Activities, and Recent Updates.

## Daily Workflow

### 1. Check Assignments
Review dashboard for overdue tasks, scheduled events, and new assignments.

### 2. Complete Activities
Navigate to case detail, find the activity, mark complete with notes.

### 3. Document Your Work
Create updates with investigative narratives and attached evidence.

### 4. Upload Evidence
Use the Attachments tab to upload files—system automatically calculates hashes for integrity.

## Key Permissions
You can: view assigned cases, complete activities, create updates, upload evidence, record time/expenses.
You cannot: create/delete cases, assign investigators, approve budgets, generate invoices.', 2, true
FROM help_categories c WHERE c.slug = 'getting-started';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Quick Start for Case Managers', 'quick-start-case-managers',
'Role-specific onboarding for supervisors and managers',
'# Quick Start for Case Managers

## Responsibilities
- Review and approve incoming case requests
- Assign investigators to cases
- Monitor case progress and status
- Manage budgets and billing
- Quality review of updates and deliverables

## Daily Workflow

### 1. Review Case Requests
Check the Requests queue, review pending submissions, match clients, approve or decline.

### 2. Monitor Case Progress
Filter cases by status, check budget warnings, review overdue activities.

### 3. Assign Work
Add investigators, create activities with clear instructions.

### 4. Review and Approve
Verify update quality, check evidence integrity, approve status changes.

## Key Permissions
Full case access, create/delete cases, assign team, approve budgets, change statuses, generate reports/invoices.', 3, true
FROM help_categories c WHERE c.slug = 'getting-started';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Quick Start for Administrators', 'quick-start-administrators',
'Role-specific onboarding for system administrators',
'# Quick Start for Administrators

## Responsibilities
- User accounts and role assignments
- Organization settings and branding
- Custom status and service configuration
- Public intake form setup
- Security and access policies

## Initial Setup

### 1. Configure Organization
Settings > Organization: name, branding, logo, contact info.

### 2. Set Up Team
Settings > Team: invite users, assign roles, configure permissions.

### 3. Customize Statuses
Settings > Case Statuses: review defaults, create custom statuses.

### 4. Define Services
Settings > Services: create billable service catalog with pricing.

### 5. Create Intake Forms
Settings > Case Request Forms: design public forms, configure branding.

## Security Best Practices
Limit admin access, review audit logs, enforce strong passwords, remove access for departing staff.', 4, true
FROM help_categories c WHERE c.slug = 'getting-started';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Understanding User Roles', 'understanding-user-roles',
'Admin, Manager, Investigator, and Vendor role capabilities',
'# Understanding User Roles

## The Four Roles

### Administrator
Full system access: all cases, user management, system settings, billing, audit logs.
**Typical users**: Office managers, IT administrators, business owners

### Manager
Case oversight: view all cases, create/delete cases, assign investigators, approve budgets, change statuses, generate reports.
**Typical users**: Case managers, supervisors, senior investigators

### Investigator
Field work: view assigned cases, complete activities, create updates, upload evidence, record time.
**Typical users**: Field investigators, researchers, analysts

### Vendor
Limited external access: view shared cases, submit updates, upload attachments.
**Typical users**: Subcontractors, external specialists, partner firms

## Role Hierarchy
Administrator > Manager > Investigator > Vendor

Higher roles inherit lower role capabilities.', 5, true
FROM help_categories c WHERE c.slug = 'getting-started';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Navigating the Dashboard', 'navigating-dashboard',
'Layout, sidebar navigation, and quick actions',
'# Navigating the Dashboard

## Main Layout

### Sidebar Navigation
- Dashboard: Personalized overview
- Cases: Full case list with filtering
- Calendar: Activity schedule view
- Requests: Case request queue (managers+)
- Reports: Document generation
- Settings: Configuration

### Top Bar
Search, Notifications, Help, Profile menu.

## Dashboard Sections
- **My Cases**: Assigned cases
- **Today''s Activities**: Due tasks and scheduled events
- **Recent Updates**: Latest case updates
- **Pending Requests**: Incoming requests (managers)

## Quick Actions
New Case button, click activities to navigate, global search.

## Keyboard Shortcuts
/ - Focus search, g+d - Dashboard, g+c - Cases, ? - Help', 6, true
FROM help_categories c WHERE c.slug = 'getting-started';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Switching Organizations', 'switching-organizations',
'Multi-organization support and context switching',
'# Switching Organizations

## Multi-Organization Access
You may have access to multiple organizations if you work for related companies, provide consulting, or are a vendor.

## Switching
1. Click profile icon
2. Select "Switch Organization"
3. Choose from available organizations

## What Changes
Cases, team, settings, and role are organization-specific.

## What Stays the Same
Login credentials, personal profile, notification preferences.

## Best Practices
Always verify you''re in the correct organization before creating records.', 7, true
FROM help_categories c WHERE c.slug = 'getting-started';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Getting Help and Support', 'getting-help-support',
'Using the help center and accessing support',
'# Getting Help and Support

## Help Center
Search for topics or browse categories. Contextual help icons (?) provide page-specific guidance.

## Common Questions

**Can''t see a case?**
Check organization, verify assignment, contact manager.

**Can''t perform an action?**
Check role permissions, verify status conditions, contact administrator.

**Found a bug?**
Note steps to reproduce, take screenshot, contact administrator.

## Administrator Support
Contact your organization administrator for access issues, configuration questions, and feature requests.', 8, true
FROM help_categories c WHERE c.slug = 'getting-started';

-- CATEGORY 2: Case Requests and Intake (10 articles)
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'How Case Requests Work', 'how-case-requests-work',
'End-to-end workflow from submission to case creation',
'# How Case Requests Work

## Overview
Case requests are submissions proposing new investigative work, going through review before becoming active cases.

## Request Sources
- **Public Forms**: External clients submit without authentication
- **Internal Requests**: Staff-initiated for approval workflow

## Request Lifecycle

### 1. Submission
Requestor completes form. System assigns request number, records metadata, sends notifications.

### 2. Pending Review
Request enters queue with "Pending" status. Visible to managers/admins.

### 3. Under Review
Staff claims request, performs client matching, gathers information.

### 4. Decision
- **Approved**: Case created, data transferred
- **Declined**: Marked with reason, no case created
- **Needs Info**: Returns to pending

## Data Flow on Approval
Client → Account, Contact → Contact, Subjects → Case Subjects, Files → Attachments

## Audit Trail
Every request maintains complete history: submission, status changes, review actions, decisions.', 1, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Creating Public Intake Forms', 'creating-public-intake-forms',
'Form builder and field configuration',
'# Creating Public Intake Forms

## Access
Navigate to Settings > Case Request Forms.

## Creating a Form
1. Click "Create New Form"
2. Enter form name (internal)
3. Configure settings
4. Save to generate public URL

## Form Settings
- Form Name, Form Slug, Active toggle
- Organization Display Name, Header Instructions, Success Message

## Field Configuration
Configure client info, contact info, subject info, case details, file uploads.

Each field: Required, Visible, Label, Placeholder.

## Multi-Step Forms
Enable multi-step mode, assign fields to steps, configure step titles.

## Publishing
Set Active, copy public URL, share with clients.

URL format: https://[domain]/request/[form-slug]', 2, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Customizing Form Branding', 'customizing-form-branding',
'Logo, colors, and organization display',
'# Customizing Form Branding

## Branding Options

### Organization Logo
Upload in form settings. Recommended: 200x60px, PNG/JPG, max 2MB.

### Organization Name
Display name shown on forms—can differ from internal name.

### Primary Color
Brand color for buttons, links, highlights.

### Contact Information
Phone, website, address displayed on form.

## Content Customization

### Header Instructions
Guidance text explaining the form purpose and expectations.

### Success Message
Confirmation shown after submission with next steps.

## Multiple Brands
Create separate forms with different branding for each brand.', 3, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Configuring Form Notifications', 'configuring-form-notifications',
'Email confirmations and staff alerts',
'# Configuring Form Notifications

## Notification Types

### Confirmation Emails
Sent to requestor: confirms receipt, provides reference number, sets expectations.

### Staff Notifications
Sent to your team: alerts designated recipients with request details and direct link.

## Confirmation Email Setup
Enable "Send Confirmation Email", customize subject line and body, set reply-to address.

## Staff Notification Setup
Enable "Notify Staff on Submission", add recipient emails, review notification content.

## Timing
Both send immediately after submission.

## Troubleshooting
Verify addresses, check spam folders, confirm settings enabled.', 4, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Reviewing Incoming Requests', 'reviewing-incoming-requests',
'Request queue management and filtering',
'# Reviewing Incoming Requests

## Access
Navigate to Case Requests in sidebar.

## Queue Display
Request Number, Submitted date, Client, Contact, Status, Source.

## Request Statuses
- **Requested (Pending)**: Awaiting review
- **Under Review**: Being actively reviewed
- **Approved**: Case created
- **Declined**: Rejected with reason
- **Needs Info**: More information required

## Filtering
By status, date range, form source, assignee.

## Taking Action
- **Claim**: Click "Review" to change to Under Review
- **View**: See full details and uploaded files
- **Decide**: Approve, Decline, or Need Info

## Priority Handling
Handle oldest first, consider client priority and urgency.', 5, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Client and Contact Matching', 'client-contact-matching',
'Linking requests to existing client records',
'# Client and Contact Matching

## Why Matching Matters
Preserves client history, prevents duplicates, maintains relationships.

## Automatic Match Suggestions
System searches based on company name, email, phone, address.

## Match Confidence
- **High**: Exact matches on unique identifiers
- **Medium**: Partial matches requiring verification
- **Low**: Similar but not identical information

## Reviewing Matches
Compare submitted info to existing records. Verify with requestor if uncertain.

## Actions
- **Link to Existing**: Connect to matched account
- **Create New**: Create new account from submission
- **Skip**: Handle manually later

## Post-Approval Corrections
If matching was incorrect: open case, navigate to Account section, unlink and relink correct record.', 6, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Approving and Converting Requests', 'approving-converting-requests',
'Converting approved requests to active cases',
'# Approving and Converting Requests

## Before Approving
Review all submitted information, verify client matching, confirm case type and services.

## Approval Process

### Step 1: Open Request Detail
Navigate from queue to full detail view.

### Step 2: Review Summary
Confirm client, contact, subject, services, budget, files.

### Step 3: Configure Case Creation
Set case type, assigned manager, initial status, budget.

### Step 4: Approve
Click "Approve" to create the case.

## What Happens
- Case record created with number and status
- Account linked or created
- Contact linked or created
- Subjects copied
- Files transferred
- Request marked Approved with case link

## Post-Approval
Case appears in list, manager notified, work can begin.', 7, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Declining and Archiving Requests', 'declining-archiving-requests',
'Handling rejected submissions',
'# Declining and Archiving Requests

## When to Decline
- Outside service scope
- Conflict of interest
- Requestor ineligible
- Insufficient information
- Appears fraudulent

## Decline Process
1. Document reason
2. Click "Decline"
3. Enter reason (recorded, may be shared)
4. Confirm

## Example Decline Reasons
- "Requested service type outside our offerings"
- "Conflict of interest prevents acceptance"
- "Insufficient information provided"

## Communication
Automatic notification if configured, or manual follow-up for sensitive declines.

## Record Retention
Declined requests retained for audit trail, pattern analysis, compliance.', 8, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Internal Case Requests', 'internal-case-requests',
'Staff-initiated requests vs public submissions',
'# Internal Case Requests

## When to Use
- Work needs management approval
- Referral requires vetting
- Documentation of decision needed
- Standard approval workflow required

## Creating Internal Requests
Dashboard > New Request > Internal Request, or Cases > New > Case Request.

## Differences from Public
- No public form branding
- Submitter is known user
- May have streamlined fields

## Similarities
Same review workflow, approval process, data structure, audit trail.

## Use Cases
- Lead vetting from sales
- External referral processing
- Work authorization before field work', 9, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Case Request History and Audit', 'case-request-history-audit',
'Tracking request lifecycle events',
'# Case Request History and Audit

## What Is Tracked
- Submission events (date, source, IP, user agent)
- Status changes (from, to, timestamp, user, reason)
- Review actions (claimed, duration, actions)
- Matching decisions
- Final disposition

## Viewing History
Open request detail > History tab > chronological event log.

## Audit Reporting
Generate reports for date ranges, by status, reviewer, or form source.

## Compliance Uses
Intake process audits, response time analysis, reviewer performance, conflict documentation.

## Data Retention
Retained for duration of record, cannot be deleted by users.

## Immutability
Cannot be edited, deleted, or altered. Timestamps and user attribution are automatic.', 10, true
FROM help_categories c WHERE c.slug = 'case-requests-intake';

-- CATEGORY 3: Case Management (11 articles)
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Creating a New Case', 'creating-new-case',
'Manual case creation vs request conversion',
'# Creating a New Case

## Direct Creation
Cases > New Case > complete required fields (title, type, client, manager) > Save.

## Request Conversion
Review request > configure parameters > Approve > case created with transferred data.

## When to Use Each
- **Direct**: Established clients, internal investigations, immediate need
- **Request**: New clients, approval required, external submissions

## Case Numbers
Assigned automatically, unique, cannot be changed.

## Initial Status
New cases start in configured default status (usually "New" category).

## Post-Creation
Add subjects, assign investigators, create activities, upload documents, set budget.', 1, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Case Detail Overview', 'case-detail-overview',
'Understanding the case detail page',
'# Case Detail Overview

## Page Header
Case number, title, status badge, quick actions.

## Tabs
- **Overview**: Summary, key dates, team, recent activity, budget
- **Subjects**: People, vehicles, locations, items
- **Activities**: Tasks and events
- **Updates**: Investigative narratives
- **Attachments**: Evidence and files
- **Finances**: Budget, time, expenses, invoices
- **Team**: Managers and investigators
- **History**: Audit trail

## Quick Actions
Edit Case, Change Status, Add Subject, Add Activity, Add Update.

## Sidebar
Account/client info, contacts, related cases, important dates.', 2, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Case Types and Workflows', 'case-types-workflows',
'Understanding case type configuration',
'# Case Types and Workflows

## What Are Case Types
Categories of work: Insurance, Legal, Corporate, Background Check, etc.

## Type Configuration
Name, description, default status, available services, custom fields.

## Type-Specific Behavior
Different statuses, service catalogs, required fields, report templates, budget defaults.

## Changing Case Type
Edit case > select new type > save. May affect available services and fields.

## Custom Types
Settings > Case Types > New Type > configure > activate.

## Reporting
Filter and group reports by case type for volume, revenue, duration analysis.', 3, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Assigning Case Managers', 'assigning-case-managers',
'Primary and secondary manager assignment',
'# Assigning Case Managers

## Manager Role
Oversight, assignment, budget management, status changes, client communication, quality review.

## Primary Manager
Every case has one. Assigned during creation, main accountability, receives all notifications.

## Assigning
During creation: select from dropdown. After: Team tab > Change Manager.

## Secondary Managers
Add via Team tab > Add Manager. Provides backup coverage, specialized oversight.

## Manager Permissions
View full details, modify case, change status, assign investigators, approve budgets, generate reports.

## Best Practices
Assign backups, document responsibilities, review assignments regularly.', 4, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Adding and Managing Investigators', 'managing-investigators',
'Team member assignment and removal',
'# Adding and Managing Investigators

## Investigator Role
Field work, surveillance, evidence collection, interviews, activity completion, documentation.

## Assigning
Case detail > Team tab > Add Investigator > search and select.

## Investigator Permissions
View case, complete activities, create updates, upload attachments, view budget (not modify).

## Multiple Investigators
Assign specialists, split coverage, provide backup.

## Removing
Team tab > find investigator > Remove. Work history preserved.

## Reassignment
When unavailable: add replacement, reassign pending activities.

## Investigator View
Dashboard "My Cases", filtered case list, calendar for scheduled work.', 5, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Working with Case Subjects', 'working-with-subjects',
'Person, vehicle, location, and item subjects',
'# Working with Case Subjects

## Subject Types
- **Person**: Name, DOB, description, contact, address
- **Vehicle**: Make, model, year, color, plate, VIN
- **Location**: Address, coordinates, type, access notes
- **Item**: Description, serial numbers, value

## Adding Subjects
Subjects tab > Add Subject > select type > complete form.

## Primary Subject
Mark one as primary—appears in header, used in reports.

## Editing
Click subject name > update fields > save.

## Removing
Subjects tab > find subject > delete icon > confirm.

## Custom Fields
Organization can add case-type specific or organization-wide custom fields.', 6, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Subject Detail Pages', 'subject-detail-pages',
'Comprehensive subject information',
'# Subject Detail Pages

## Access
Click any subject name to open detail view.

## Header
Subject type icon, name/identifier, primary badge, case association.

## Sections
- **Basic Information**: Core identifying data
- **Additional Details**: Extended info, custom fields
- **Photo/Image**: Visual documentation
- **Activity Timeline**: Associated activities
- **Updates**: Updates mentioning subject
- **Attachments**: Related files

## Linking
Subjects can link to other subjects, accounts, other cases.

## History
View change history: what, when, who, previous values.

## Reports
Generate subject-specific summaries, activity logs, evidence manifests.', 7, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Linking Accounts and Contacts', 'linking-accounts-contacts',
'Client relationships and case contacts',
'# Linking Accounts and Contacts

## Difference
- **Accounts**: Business entities (companies, law firms)
- **Contacts**: Individual people at accounts

## Relationships
Account has many Contacts. Case links to one Account and multiple Contacts.

## Linking Account
During creation: search and select. After: case detail > Account section > change.

## Linking Contacts
Case Contacts section > Add Contact > search or create > select relationship type.

## Contact Types
Primary Contact, Billing Contact, Case Contact, Requesting Contact.

## Creating New
Click "Create New Account/Contact" > enter details > links automatically.

## Impact
Affects invoices, report recipients, communication records, historical reporting.', 8, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Related Cases', 'related-cases',
'Linking cases and case hierarchies',
'# Related Cases

## Relationship Types
- **Parent-Child**: Hierarchical (main case with sub-cases)
- **Related**: Peer relationship (shared context)
- **Duplicate**: Marks accidental duplications

## Creating Links
Related Cases section > Add Related Case > search > select relationship.

## Viewing
Related cases appear in sidebar and Related Cases section.

## Use Cases
- Multi-subject investigation with child cases per subject
- Recurring client work linking to prior cases
- Split cases maintaining connection

## Removing Links
Find link > click remove > confirm. Does not affect either case.

## Reporting
Related cases appear in case summaries and client history reports.', 9, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Case Notes and Internal Comments', 'case-notes-comments',
'Non-billable internal communications',
'# Case Notes and Internal Comments

## Notes vs Updates
- **Updates**: Formal narratives, may be in reports, can be billable
- **Notes**: Internal communication, never in client reports, not billable

## Adding Notes
Click "Add Note" > type content > optionally attach files > save.

## Features
- **Mentions**: @name to tag team members
- **Priority**: Normal, Important, Urgent
- **Pinning**: Pin important notes to top

## Visibility
Visible to assigned team, managers, administrators. NOT to vendors or external parties.

## Editing/Deleting
Edit your own notes. Delete with confirmation. History may be preserved.

## Use Cases
Status updates, questions for manager, reminders, coordination, non-billable observations.', 10, true
FROM help_categories c WHERE c.slug = 'case-management';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Archiving and Deleting Cases', 'archiving-deleting-cases',
'Data retention and case removal',
'# Archiving and Deleting Cases

## End States
- **Closed**: Work complete, fully accessible, can reopen
- **Archived**: Stored for retention, read-only, searchable
- **Deleted**: Permanently removed, requires admin

## Archiving
Ensure Closed status > click Archive > confirm. Removed from default lists.

## Restoring Archived
Find with archive filter > Restore > returns to Closed status.

## Deleting
Requires administrator. Cannot delete cases with invoices. Enter confirmation.

## Data Retention
Organization policy determines active duration, archiving timing, retention period.

## Compliance
Before deleting: check legal holds, regulatory requirements, litigation needs, contracts.

## Audit Trail
Case existence may be logged even after deletion.', 11, true
FROM help_categories c WHERE c.slug = 'case-management';

-- CATEGORY 4: Case Lifecycle and Status (10 articles)
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Understanding Case Phases', 'understanding-case-phases',
'Intake, Execution, and Completion phases',
'# Understanding Case Phases

## What Are Phases
High-level stages affecting available actions:
- **Intake Phase**: Initial setup and preparation
- **Execution Phase**: Active investigation work
- **Completion Phase**: Wrap-up and closure

## Intake Phase
From case creation until active work begins. Full editing, team assembly, budget setup.

## Execution Phase
From first active status through investigation. Activities performed, updates created, evidence collected, billing occurs.

## Completion Phase
After active work ends through closure. Final updates, reports, invoicing, becoming read-only.

## Phase Transitions
Status changes trigger phase transitions. May require approval.

## Phase-Based Restrictions
Different phases enable different actions. Completion limits new activities and billing.', 1, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Status Categories Explained', 'status-categories-explained',
'New, Active, Complete, and Closed categories',
'# Status Categories Explained

## The Four Categories

### New (Intake)
Created but not yet active. Awaiting setup, not assigned, no billing.

### Active (Execution)
Ongoing work. Investigation in progress, billing occurring.

### Complete (Wrap-up)
Work finished. Pending billing or closure, limited new activities.

### Closed (Terminal)
Finalized. Read-only, can be reopened with approval.

## Category Behavior
- **New**: Full editing, no budget warnings
- **Active**: Normal operations, budget monitoring
- **Complete**: Final billing, restricted editing
- **Closed**: View-only, no new billing

## Category Colors
New (Blue), Active (Green), Complete (Yellow), Closed (Gray).

## Reporting
Filter by category: Open = New + Active, Historical = Closed.', 2, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Creating Custom Statuses', 'creating-custom-statuses',
'Organization-specific status configuration',
'# Creating Custom Statuses

## Structure
Name, Category (required), Description, Color, Restrictions.

## Creating
Settings > Case Statuses > Create Status > configure > save.

## Example Statuses

**New Category**: Pending Assignment, Awaiting Info, Under Review

**Active Category**: In Progress, Active Surveillance, Field Investigation, On Hold

**Complete Category**: Work Complete, Pending Billing, Under QA Review

**Closed Category**: Closed - Resolved, Closed - No Results, Closed - Cancelled

## Settings
- **Read-Only**: Prevents modifications
- **Requires Reason**: Documents status change
- **Manager Only**: Restricts to managers

## Deactivating
Toggle Active off. Hidden from selection, existing cases unaffected.', 3, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Status Transition Rules', 'status-transition-rules',
'How statuses can move between categories',
'# Status Transition Rules

## Default Rules
- **From New**: → Active (start work), → Closed (cancel)
- **From Active**: → New (reset), → Complete (finish), → Closed (close directly)
- **From Complete**: → Active (more work), → Closed (finalize)
- **From Closed**: → Complete (reopen)

## Within-Category
Usually unrestricted, no approval needed.

## Cross-Category
May require approval, triggers system actions, may restrict future actions.

## Backward Transitions
Moving to earlier category usually requires approval and documented reason.

## Effects
- Entering Active: starts budget monitoring, enables billing
- Entering Complete: may lock activities, triggers billing reminders
- Entering Closed: makes read-only, locks billing

## History
All transitions recorded with from/to, timestamp, user, reason.', 4, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Status-Based Feature Restrictions', 'status-based-restrictions',
'What gets locked at each status',
'# Status-Based Feature Restrictions

## Why Restrictions
Protect data integrity, billing accuracy, audit compliance, workflow consistency.

## By Category

### New
Minimal restrictions. Full editing, subject additions, team changes, budget setup.

### Active
Some restrictions. Normal workflow, budget warnings enforce.

### Complete
Work-ending restrictions. New activities limited, subjects locked, team limited. Final updates and invoicing available.

### Closed
Maximum restrictions. No new activities, time entry, subject/team/budget changes. View and report only.

## Feature Matrix
| Feature | New | Active | Complete | Closed |
|---------|-----|--------|----------|--------|
| Create Activities | ✓ | ✓ | Limited | ✗ |
| Create Updates | ✓ | ✓ | Final only | ✗ |
| Time/Expenses | ✓ | ✓ | Limited | ✗ |
| Generate Reports | ✗ | ✓ | ✓ | ✓ |', 5, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Read-Only Statuses', 'read-only-statuses',
'Terminal and locked status behavior',
'# Read-Only Statuses

## What Is Read-Only
Can view but cannot modify. Preserves data integrity, maintains audit compliance.

## When Applied
All Closed statuses. Any status marked read-only (legal hold, audit hold).

## Cannot Do
Add/edit activities, create/edit updates, modify subjects, change team, enter time/expenses, modify budget.

## Can Do
View all information, search, generate reports, view attachments, export data, view history.

## Administrative Actions
Administrators can change status (exit read-only), export for compliance, delete with authority.

## Exiting Read-Only
Request approval > change to non-read-only status > document reason.

## Legal Holds
Special read-only that requires specific authorization to remove.', 6, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Status Visibility for Clients', 'status-visibility-clients',
'What external parties see vs internal staff',
'# Status Visibility for Clients

## Visibility Levels
- **Exact Status**: Client sees specific status name
- **Category Only**: Client sees category (Active vs specific status)
- **Hidden**: Client does not see status

## Why Control
Status names may reveal investigation tactics, internal processes, billing stages.

## Configuration
- Organization level: default visibility
- Status level: override per status
- Case level: override for specific case

## What Clients See
Portal view: status per visibility rules. Reports: per rules. Notifications: may use category terminology.

## Best Practices
Hide tactical statuses (Surveillance - Day 1, Subject Located). Show process statuses (In Progress, Complete).

## External Parties
Same rules apply to vendors, client portal, notifications, external reports.', 7, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Status History and Audit Trail', 'status-history-audit-trail',
'Tracking all status changes',
'# Status History and Audit Trail

## What Is Recorded
Previous status, new status, timestamp, user, reason, IP address, session info.

## Viewing
Case History tab > filter "Status Changes" > chronological list.

## Duration Tracking
Time in each status, time in each category, total case duration.

## Immutability
Cannot edit, delete, or alter. Timestamps system-generated, user attribution automatic.

## Reporting
- Status Duration Report: average time per status
- Transition Analysis: common paths, bottlenecks
- User Activity: changes by user

## Export
CSV for analysis, PDF for documentation, filtered by date/status.

## Compliance Use
Demonstrates when work occurred, who took actions, proper workflow followed.', 8, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Reopening Closed Cases', 'reopening-closed-cases',
'When and how cases can be reopened',
'# Reopening Closed Cases

## When to Reopen
New information, client requests more work, supplemental investigation, verify findings, closure error.

## Who Can Reopen
Manager role or higher, assigned to case, documented reason.

## Process
1. Find closed case (include Closed filter)
2. Click "Reopen Case"
3. Enter reason
4. Select target status
5. Approval if required
6. Case reopens

## What Happens
Status changes, case becomes editable, notifications sent, reopen recorded in history.

## Target Status Options
Active (immediate work), Complete (billing adjustments), New (significant rework).

## Restrictions
Legal hold cases require special process. Archived: restore first. Deleted: cannot recover.

## Best Practices
Document thorough reason, notify team, review previous work, set new budget if needed.', 9, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Configuring Workflow Behavior', 'configuring-workflow-behavior',
'Automation, monitoring, and due dates',
'# Configuring Workflow Behavior

## Status Monitoring
Duration warnings: set max time in status, cases exceeding flagged.
Escalation rules: notify manager after X days, admin after Y days.

## Due Date Behavior
Case due dates: default offset, warnings.
Activity due dates: default from creation, overdue highlighting.

## Automated Actions
On status change: send notifications, create activities.
On conditions: budget threshold, time exceeded.

## Notification Settings
Who receives: manager (always), investigators, administrators.
Delivery: immediate, daily digest, weekly summary.

## SLA Configuration
Define per case type, response/resolution targets, breach actions.

## Workflow Templates
Default status progression, activities created, team assignments.

## Best Practices
Start simple, document rules, review effectiveness regularly.', 10, true
FROM help_categories c WHERE c.slug = 'case-lifecycle-status';

-- CATEGORY 5-12: Abbreviated key articles
-- Activities and Scheduling
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Tasks vs Events', 'tasks-vs-events', 'Understanding activity types', 'Tasks are action items with due dates. Events are scheduled calendar blocks with start/end times. Use tasks when work can be done anytime before deadline. Use events when specific time commitment is needed.', 1, true
FROM help_categories c WHERE c.slug = 'activities-scheduling';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Creating and Managing Tasks', 'creating-managing-tasks', 'Task lifecycle and completion', 'Create from case Activities tab or quick add. Set title, assignee, due date, priority. Complete by clicking checkbox and adding notes.', 2, true
FROM help_categories c WHERE c.slug = 'activities-scheduling';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Scheduling Events', 'scheduling-events', 'Calendar events and appointments', 'Create from case or calendar. Set start/end times, location, assignee. Events appear on calendar, can be dragged to reschedule.', 3, true
FROM help_categories c WHERE c.slug = 'activities-scheduling';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Using the Calendar', 'using-calendar', 'Day, week, and month views', 'Navigate with arrows or date picker. Day/Week/Month views. Filter by user, case, or activity type. Click time slots to create events.', 4, true
FROM help_categories c WHERE c.slug = 'activities-scheduling';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Linking Activities to Services', 'linking-activities-services', 'Connecting work to billing', 'Link activities to billable services for accurate billing and budget tracking. Select service when creating activity.', 5, true
FROM help_categories c WHERE c.slug = 'activities-scheduling';

-- Updates and Documentation
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Writing Case Updates', 'writing-case-updates', 'Creating investigative narratives', 'Updates document findings. Use rich text editor. Be objective, complete, organized, professional. Link to activities and evidence.', 1, true
FROM help_categories c WHERE c.slug = 'updates-documentation';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Event-Driven vs Manual Updates', 'event-driven-manual-updates', 'Auto-generated vs created updates', 'Event-driven updates generate from activity completion. Manual updates created intentionally. Enrich auto-updates with additional detail.', 2, true
FROM help_categories c WHERE c.slug = 'updates-documentation';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Activity Timelines in Updates', 'activity-timelines-updates', 'Chronological event logs', 'Timelines provide chronological structure. Add entries with timestamp and description. Use for surveillance reports and observation logs.', 3, true
FROM help_categories c WHERE c.slug = 'updates-documentation';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Update Visibility and Permissions', 'update-visibility-permissions', 'Who can view and edit', 'Visibility levels: Internal, Team Only, Manager Only, Custom. Authors can always edit. Managers and admins have broader access.', 4, true
FROM help_categories c WHERE c.slug = 'updates-documentation';

-- Evidence and Attachments
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Uploading Evidence Files', 'uploading-evidence-files', 'Supported formats and upload', 'Drag and drop or click to browse. Various formats supported. Size limits apply. Bulk upload available.', 1, true
FROM help_categories c WHERE c.slug = 'evidence-attachments';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Evidence Integrity and Hashing', 'evidence-integrity-hashing', 'SHA-256 verification', 'System calculates SHA-256 hash at upload for integrity verification. Supports chain of custody requirements.', 2, true
FROM help_categories c WHERE c.slug = 'evidence-attachments';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Organizing Files with Folders', 'organizing-files-folders', 'Folder structure management', 'Create folders to organize evidence. Drag files between folders. Use consistent naming conventions.', 3, true
FROM help_categories c WHERE c.slug = 'evidence-attachments';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Sharing Files Externally', 'sharing-files-externally', 'Secure access links', 'Create time-limited, token-based links for external sharing. Revoke access when no longer needed. Audit all access.', 4, true
FROM help_categories c WHERE c.slug = 'evidence-attachments';

-- Billing and Finances
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Understanding Case Budgets', 'understanding-case-budgets', 'Budget structure and tracking', 'Budgets set limits by hours or dollars. Track consumption against limits. Warnings at thresholds. Hard caps can prevent overage.', 1, true
FROM help_categories c WHERE c.slug = 'billing-finances';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Recording Time Entries', 'recording-time-entries', 'Manual and activity-linked time', 'Record time manually or link to activities. Specify date, hours, description, service. Billable by default.', 2, true
FROM help_categories c WHERE c.slug = 'billing-finances';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Recording Expenses', 'recording-expenses', 'Expense types and receipts', 'Record expenses with date, amount, category, description. Attach receipt images. Link to services for billing.', 3, true
FROM help_categories c WHERE c.slug = 'billing-finances';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Service-Based Billing', 'service-based-billing', 'Services and pricing', 'Services define billable work categories. Each case has service instances. Pricing rules determine rates.', 4, true
FROM help_categories c WHERE c.slug = 'billing-finances';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Creating Invoices', 'creating-invoices', 'Invoice generation', 'Create invoices from billable items. Review line items, add adjustments. Finalize and send to client.', 5, true
FROM help_categories c WHERE c.slug = 'billing-finances';

-- Reports and Exports
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Report Types Overview', 'report-types-overview', 'DOCX, PDF, and CSV options', 'DOCX: templated documents with merge fields. PDF: formatted summaries. CSV: data exports for analysis.', 1, true
FROM help_categories c WHERE c.slug = 'reports-exports';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Uploading Document Templates', 'uploading-document-templates', 'DOCX templates with variables', 'Upload DOCX templates with placeholder variables. System merges case data when generating reports.', 2, true
FROM help_categories c WHERE c.slug = 'reports-exports';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Template Variables Reference', 'template-variables-reference', 'Available merge fields', 'Variables for case info, subjects, activities, updates, finances. Format: {{variable_name}}.', 3, true
FROM help_categories c WHERE c.slug = 'reports-exports';

-- Security and Access Control
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Role-Based Access Control Overview', 'rbac-overview', 'How permissions work', 'Four roles with hierarchical permissions. Administrators have full access. Each role inherits lower role capabilities.', 1, true
FROM help_categories c WHERE c.slug = 'security-access-control';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Configuring Permissions', 'configuring-permissions', 'Granular permission toggles', 'Administrators can customize permissions beyond default roles. Override specific capabilities per user.', 2, true
FROM help_categories c WHERE c.slug = 'security-access-control';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Audit Logs and Compliance', 'audit-logs-compliance', 'Activity logging', 'System logs all significant actions. View in audit log. Use for compliance, investigation, troubleshooting.', 3, true
FROM help_categories c WHERE c.slug = 'security-access-control';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Security Best Practices', 'security-best-practices', 'Recommendations', 'Limit admin access, review logs, enforce strong passwords, remove access for departing staff, document changes.', 4, true
FROM help_categories c WHERE c.slug = 'security-access-control';

-- External Access
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Vendor Portal Overview', 'vendor-portal-overview', 'External partner access', 'Vendors see assigned cases only. Can submit updates, upload attachments. Limited compared to internal staff.', 1, true
FROM help_categories c WHERE c.slug = 'external-access';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Client Status Visibility', 'client-status-visibility', 'What clients see', 'Clients may see category only (Active) vs exact status. Protects operational details from external view.', 2, true
FROM help_categories c WHERE c.slug = 'external-access';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Managing External Access', 'managing-external-access', 'Creating and revoking access', 'Create secure links for file sharing. Set expiration. Revoke when no longer needed. Audit all access.', 3, true
FROM help_categories c WHERE c.slug = 'external-access';

-- Organization Settings
INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Organization Profile', 'organization-profile', 'Name, branding, contact', 'Settings > Organization. Configure name, logo, contact info for use across system and public forms.', 1, true
FROM help_categories c WHERE c.slug = 'organization-settings';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Managing Team Members', 'managing-team-members', 'Inviting and role assignment', 'Settings > Team. Invite by email, assign roles, configure permissions, deactivate departing staff.', 2, true
FROM help_categories c WHERE c.slug = 'organization-settings';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Service Catalog Setup', 'service-catalog-setup', 'Billable services and pricing', 'Settings > Services. Define your service catalog with names, descriptions, billing codes, pricing rules.', 3, true
FROM help_categories c WHERE c.slug = 'organization-settings';

INSERT INTO help_articles (category_id, title, slug, summary, content, display_order, is_active)
SELECT c.id, 'Notification Preferences', 'notification-preferences', 'Alert configuration', 'Configure organization-wide notification defaults. Users can customize their own preferences.', 4, true
FROM help_categories c WHERE c.slug = 'organization-settings';

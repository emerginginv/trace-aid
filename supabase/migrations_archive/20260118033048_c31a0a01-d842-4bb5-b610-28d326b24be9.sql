-- CaseWyze Professional Help Documentation
-- Comprehensive content for the help center

-- First, let's update existing articles with professional, detailed content
-- and add new articles for comprehensive coverage

-- =====================================================
-- GETTING STARTED CATEGORY (2adcb057-e9ab-4b0e-87b2-1f1a3209d63f)
-- =====================================================

-- Update Welcome article with comprehensive content
UPDATE help_articles 
SET content = '# Welcome to CaseWyze

CaseWyze is a professional case management platform designed for investigative firms, legal teams, and compliance organizations. This system provides the structure, accountability, and audit trail your work demands.

## What CaseWyze Does

CaseWyze organizes your investigative and case management work into a structured workflow:

- **Case Intake**: Requests flow through a formal review process before becoming active cases
- **Case Execution**: Active cases move through defined status phases with full audit trails
- **Evidence Management**: Files and documents are stored with chain-of-custody tracking
- **Time and Expense Tracking**: Billable activities are logged with budget controls
- **Reporting**: Court-ready reports can be generated from case data

## Key Concepts

### Cases vs. Case Requests
A **Case Request** is a submitted inquiry that must be reviewed and approved before becoming an active case. This separation ensures proper intake procedures and prevents unauthorized case creation.

### Status-Driven Behavior
Case status controls what actions are permitted. For example, time entries cannot be logged until a case reaches "Active" status, and "Closed" cases become read-only. This protects data integrity and ensures compliance with your operational procedures.

### Role-Based Access
Your access to features depends on your assigned role. Administrators have full access, while other roles may have restricted views or editing capabilities. If you cannot access a feature you expect to use, contact your organization administrator.

## Getting Help

Use the search bar at the top of this panel to find specific topics, or browse categories below for comprehensive guidance on each feature area.',
    summary = 'Introduction to CaseWyze platform and key concepts'
WHERE slug = 'welcome-to-casewyze';

-- Update Quick Start Guide
UPDATE help_articles 
SET content = '# Quick Start Guide

This guide covers the essential steps to begin working in CaseWyze. Complete these steps in order for the best experience.

## Step 1: Review Your Dashboard

After logging in, you will see your personal dashboard. This shows:

- **My Cases**: Cases assigned to you
- **Pending Requests**: Case requests awaiting review (if you have intake permissions)
- **Recent Activity**: Latest updates across your assigned cases
- **Alerts**: Budget warnings, overdue tasks, and system notifications

## Step 2: Understand Your Permissions

Your role determines what you can do in CaseWyze. Common roles include:

| Role | Typical Permissions |
|------|---------------------|
| Admin | Full system access, user management, settings |
| Manager | Case creation, team assignment, reporting |
| Investigator | Work on assigned cases, log time and updates |
| Client | View assigned cases, limited data visibility |

If an action is unavailable, it may be restricted by your role. Contact your administrator for access changes.

## Step 3: Navigate the Interface

**Main Navigation** (left sidebar):
- Dashboard: Your personalized overview
- Cases: Browse and manage all accessible cases
- Activities: View tasks and scheduled events
- Reports: Generate and export reports
- Settings: Configure your preferences

**Case Navigation** (within a case):
- Overview: Case summary and status
- Subjects: People, vehicles, or items being investigated
- Updates: Activity log and notes
- Attachments: Evidence and documents
- Expenses: Time entries and costs
- Budget: Financial controls and tracking

## Step 4: Start Working

**To work on an existing case:**
1. Go to Cases from the main menu
2. Click on a case to open it
3. Review the Overview tab for current status
4. Use tabs to add updates, attach files, or log time

**To request a new case:**
1. Go to Cases → New Request
2. Complete the intake form
3. Submit for review
4. An administrator will approve or decline the request

## Best Practices for New Users

- **Check your notifications daily** for assigned tasks and budget alerts
- **Log time promptly** to ensure accurate billing records
- **Attach files to the correct case** to maintain evidence integrity
- **Use descriptive titles** when creating updates or activities',
    summary = 'Essential first steps for new CaseWyze users'
WHERE slug = 'quick-start-guide';

-- Update Navigation article
UPDATE help_articles 
SET content = '# Navigating the Dashboard

Your dashboard is designed to surface the most important information without requiring you to search for it. Understanding its layout will help you work more efficiently.

## Dashboard Sections

### My Cases Panel
Displays cases where you are assigned as the case manager or investigator. Cases are sorted by priority and last activity date. Click any case to open it directly.

**Status indicators:**
- 🟢 Active: Currently in progress
- 🟡 On Hold: Paused, awaiting action
- 🔴 Overdue: Has past-due activities or budget concerns
- ⚪ Completed: Finished but not yet closed

### Pending Actions
Lists items requiring your attention:
- **Requests for Review**: Case intake requests awaiting your decision
- **Overdue Tasks**: Activities past their due date
- **Budget Alerts**: Cases approaching or exceeding limits

Click any item to navigate directly to the relevant section.

### Recent Activity Feed
A chronological log of updates across all your accessible cases. This includes:
- Status changes
- New attachments uploaded
- Updates and notes added
- Time entries logged

Use this to stay informed about case progress without opening each case individually.

## Quick Actions

The dashboard header provides quick access buttons:
- **New Request**: Start a case intake request
- **Search**: Find cases, subjects, or documents
- **Notifications**: View system alerts and messages

## Keyboard Shortcuts

For faster navigation:
- **/** : Focus search bar
- **G then D**: Go to Dashboard
- **G then C**: Go to Cases list
- **G then A**: Go to Activities
- **Esc**: Close current panel or dialog

## Customizing Your View

Dashboard widgets can be collapsed or expanded based on your preference. Your layout preferences are saved automatically and persist across sessions.',
    summary = 'Understanding the main interface and navigation patterns'
WHERE slug = 'navigating-dashboard';

-- =====================================================
-- CASES CATEGORY (3573a1a8-8ffa-4d52-a98a-953470b4ebe4)
-- =====================================================

-- Update Creating a New Case
UPDATE help_articles 
SET content = '# Creating a New Case

In CaseWyze, cases are created through a formal request process. This ensures proper oversight, consistent data entry, and appropriate authorization before work begins.

## The Case Request Process

### Why Requests Exist
Case requests serve several important purposes:
- **Compliance**: Ensures all cases are properly authorized
- **Data Quality**: Required fields prevent incomplete records
- **Budgeting**: Allows budget approval before work begins
- **Client Matching**: Links cases to existing client records

### Submitting a Request

1. Navigate to **Cases → New Request** or click **New Request** from your dashboard
2. Complete the intake form:
   - **Client Information**: Select existing client or enter new details
   - **Contact Person**: Who will receive updates and reports
   - **Case Type**: The category of investigation or matter
   - **Subject(s)**: People, vehicles, or items to be investigated
   - **Services Requested**: Type of work to be performed
   - **Budget**: Proposed hours and dollar limits
   - **Instructions**: Special handling notes or client requirements

3. Review all information for accuracy
4. Click **Submit Request**

### What Happens Next

After submission:
1. Request enters "Requested" status
2. Designated reviewers receive notification
3. Reviewer evaluates the request
4. Request is **Approved** (becomes active case) or **Declined** (with reason)

You will be notified of the decision via email and in-app notification.

## Request Statuses Explained

| Status | Meaning |
|--------|---------|
| Requested | Submitted, awaiting initial review |
| Under Review | Actively being evaluated |
| Approved | Converted to active case |
| Declined | Rejected (reason provided) |

## Important Notes

- **You cannot work on a case until it is approved.** Requests in pending status do not allow time entries, updates, or expenses.
- **Declined requests are retained** for audit purposes but cannot be resubmitted without creating a new request.
- **Client matching** helps prevent duplicate records. If CaseWyze finds a potential match, review carefully before creating a new client.',
    summary = 'How to submit case requests and the approval workflow'
WHERE slug = 'creating-new-case';

-- Update Case Status Workflow
UPDATE help_articles 
SET content = '# Case Status Workflow

Case status is the authoritative control for what actions are permitted on a case. Understanding this workflow is essential for proper case management.

## The Case Lifecycle

### Phase 1: Intake (Request Phase)

Cases begin as requests before becoming active:

| Status | Description | Allowed Actions |
|--------|-------------|-----------------|
| Requested | New submission awaiting review | View only |
| Under Review | Being evaluated by intake staff | View only |
| Approved | Converted to active case | Proceeds to New status |
| Declined | Rejected with reason | View only, no further action |

### Phase 2: Case Execution

Once approved, cases move through execution statuses:

| Status | Description | Allowed Actions |
|--------|-------------|-----------------|
| New | Just created, awaiting assignment | Assign investigators, set budget |
| Assigned | Investigator assigned, not started | Begin work, schedule activities |
| Active | Work in progress | Full editing: time, updates, expenses, attachments |
| On Hold | Temporarily paused | Limited updates, no new time entries |
| Awaiting Client | Waiting for client response | View updates, limited new entries |
| Awaiting Records | Waiting for external records | View updates, limited new entries |
| Completed | Work finished, pending closure | Final review, report generation |
| Closed | Case finalized | Read-only (admin override available) |
| Cancelled | Terminated before completion | Read-only |

## Status Transition Rules

### Allowed Transitions
Status changes follow a defined path. You cannot skip statuses arbitrarily. For example:
- **New → Assigned → Active** ✓
- **New → Active** ✗ (must assign first)
- **Closed → Active** ✗ (requires reopening)

### Permission Requirements
Changing case status requires the "Modify Case Status" permission. If you cannot change a status, contact your administrator.

### Read-Only Statuses
**Closed** and **Cancelled** cases are read-only by design. This protects completed work from accidental modification. Administrators can reopen cases if necessary.

## What Status Controls

Status affects these behaviors:
- **Time entry availability**: Only allowed in Active status
- **Event scheduling**: Blocked in Completed/Closed
- **Update creation**: Limited in hold statuses
- **Report generation**: Available in Completed and later
- **Billing**: Only Active cases are billable

## Reopening Cases

Closed cases can only be reopened if:
1. The current status allows reopening (is_reopenable = true)
2. User has reopen permission
3. A valid reason is provided

When reopened, a new case is created with a shared series ID, preserving the closed case''s integrity while allowing continued work.',
    summary = 'Understanding case statuses and their effect on case behavior'
WHERE slug = 'case-status-workflow';

-- =====================================================
-- CASE MANAGERS CATEGORY (83124fd8-d899-4d85-973c-ec85583770c5)
-- =====================================================

-- Update Assigning Case Managers
UPDATE help_articles 
SET content = '# Assigning Case Managers

Case managers are responsible for oversight, client communication, and ensuring cases progress through completion. Proper assignment is critical for accountability.

## What Case Managers Do

The assigned case manager:
- Receives notifications for all case activity
- Is responsible for case progress and deadlines
- Serves as primary point of contact for internal questions
- Reviews work quality and approves deliverables
- Manages budget and resource allocation

## How to Assign a Case Manager

### During Case Creation
The intake form includes a Case Manager field. Select from available team members based on:
- Expertise in the case type
- Current workload
- Client relationship history

### After Case Creation
1. Open the case and navigate to the **Team** or **Overview** tab
2. Click **Assign Manager** or edit the current assignment
3. Select the new case manager from the dropdown
4. Optionally add a note explaining the assignment
5. Save changes

The new manager receives an immediate notification.

## Reassigning Cases

Cases can be reassigned at any time before closure. When reassigning:
- The previous manager loses primary responsibility
- All historical assignments are preserved in the audit log
- Active notifications transfer to the new manager

**Note**: Only users with case management permissions appear in the assignment dropdown.

## Multiple Assignments

CaseWyze supports:
- **One Primary Manager**: Required for every case
- **Additional Team Members**: Investigators, assistants, or specialists

The primary manager retains accountability even when work is distributed among team members.

## Best Practices

1. **Match expertise to case type**: Assign managers with relevant experience
2. **Balance workloads**: Check capacity before assigning new cases
3. **Document handoffs**: Add a note when reassigning to explain context
4. **Set clear expectations**: Ensure the manager understands deliverables and deadlines',
    summary = 'How to assign and manage case manager responsibilities'
WHERE slug = 'assigning-case-managers';

-- Update Team Collaboration
UPDATE help_articles 
SET content = '# Team Collaboration

Effective case work often requires multiple team members. CaseWyze provides tools for coordinating work while maintaining clear accountability.

## Team Roles on Cases

### Case Manager
- Overall responsibility for case progress
- Receives all notifications by default
- Approves major deliverables and status changes
- Primary client contact

### Investigators
- Perform field work and research
- Log time and expenses
- Upload evidence and attachments
- Create updates and reports

### Specialists
- Subject matter experts assigned for specific tasks
- May have limited case access
- Contribute to specific portions of work

## Adding Team Members

1. Open the case and go to the **Team** tab
2. Click **Add Team Member**
3. Select the user from the organization roster
4. Assign their role (Investigator, Specialist, etc.)
5. Set their access level if needed
6. Save the assignment

## Communication Within Cases

### Updates Tab
The primary location for case-related communication:
- All team members can see updates
- Updates are timestamped and attributed
- Rich text formatting is supported
- Attachments can be added to updates

### @ Mentions
Type **@username** in any update to directly notify a team member. They will receive:
- An in-app notification
- An email notification (if enabled)

### Activity Comments
Individual activities (tasks, events) have their own comment threads for task-specific discussion.

## Workload Visibility

Managers can view team workload through:
- **Team Dashboard**: Shows all team member assignments
- **Availability Calendar**: Displays scheduled activities
- **Capacity Reports**: Summarizes current commitments

## Access Control

Not all team members see the same information:
- **Client-sensitive data** may be restricted by role
- **Budget details** are often manager-only
- **Internal notes** can be marked as restricted

Ensure appropriate access levels are set when adding team members.',
    summary = 'Coordinating work across team members on shared cases'
WHERE slug = 'team-collaboration';

-- =====================================================
-- EVIDENCE & ATTACHMENTS (cdd7ba68-f0f1-45fd-9862-6c0d82beda69)
-- =====================================================

-- Update Uploading Evidence Files
UPDATE help_articles 
SET content = '# Uploading Evidence Files

Evidence integrity is critical in investigative work. CaseWyze provides secure file storage with full audit trails to support court-ready documentation.

## Uploading Files

### Basic Upload
1. Open the case and navigate to the **Attachments** tab
2. Click **Upload Files** or drag files into the upload zone
3. Select files from your device (multiple selection allowed)
4. Files upload automatically with progress indicator
5. Add descriptions and tags when prompted (recommended)

### Supported Formats
CaseWyze accepts most common file types:
- **Documents**: PDF, DOC, DOCX, TXT, RTF
- **Images**: JPG, PNG, GIF, TIFF, BMP
- **Video**: MP4, MOV, AVI, WMV
- **Audio**: MP3, WAV, M4A
- **Archives**: ZIP, RAR (for bundled files)

Maximum file size: 100MB per file

### Bulk Upload
For large evidence sets:
1. Use the **Bulk Upload** option
2. Select a folder or multiple files
3. CaseWyze processes files sequentially
4. Review upload summary for any failures

## Organizing Evidence

### Folders
Create folders to organize evidence logically:
- By date
- By subject
- By type (surveillance, documents, records)
- By source (client-provided, field-collected)

To create a folder:
1. Click **New Folder** in the Attachments tab
2. Name the folder descriptively
3. Drag files into the folder, or use **Move To** command

### Tags
Apply tags for cross-folder searching:
- Select one or more files
- Click **Add Tags**
- Enter or select tag names
- Tags are searchable across all cases

## Evidence Metadata

Each file automatically records:
- **Upload date and time**
- **Uploading user**
- **Original filename**
- **File size and type**
- **Checksum/hash** (for integrity verification)

This metadata cannot be edited, ensuring evidence authenticity.

## Important Notes

- **Once uploaded, files cannot be deleted**—only archived. This preserves evidence integrity.
- **File access is logged**. Every view and download is recorded with timestamp and user.
- **Virus scanning is automatic**. Suspicious files are quarantined pending review.',
    summary = 'How to securely upload and organize evidence files'
WHERE slug = 'uploading-evidence-files';

-- Update Sharing Attachments Securely
UPDATE help_articles 
SET content = '# Sharing Attachments Securely

CaseWyze provides controlled sharing mechanisms that maintain security while enabling necessary collaboration with clients and external parties.

## Internal Sharing

### Team Member Access
All assigned team members can access case attachments by default. Access is controlled by:
- Case assignment (must be on the case team)
- Role permissions (some roles have view-only access)
- Folder-level restrictions (if configured)

### Viewing and Downloading
Team members can:
- Preview files directly in the browser
- Download files for offline use
- All access is logged in the audit trail

## External Sharing

### Secure Links
To share files with external parties (clients, attorneys, etc.):

1. Select the file(s) to share
2. Click **Create Share Link**
3. Configure link settings:
   - **Expiration**: Set when the link becomes invalid
   - **Password Protection**: Require a password to access
   - **Download Limit**: Maximum number of downloads allowed
   - **View Only**: Prevent downloads, allow viewing only
4. Copy and send the generated link

### Link Management
View and manage active share links from **Settings → Shared Links**:
- See access statistics
- Revoke links immediately
- Extend expiration if needed

### Access Logging
All external access is recorded:
- Date and time of access
- IP address
- Downloads vs. views
- Password attempts (if protected)

## Client Portal Access

If your organization uses the Client Portal:
- Clients can view designated files directly
- No share links required for portal users
- Access is controlled by case permissions
- Clients cannot see internal-only attachments

## Security Best Practices

1. **Set expiration dates**: Never create permanent share links
2. **Use passwords for sensitive files**: Add an extra layer of protection
3. **Limit downloads**: Restrict to the minimum necessary
4. **Review active links regularly**: Revoke unused or old links
5. **Mark files as internal**: Prevent accidental external sharing

## Audit Trail

Every sharing action is logged:
- Link creation (who, when, what settings)
- Link access attempts
- Successful and failed downloads
- Link revocations

This audit trail is available for compliance reporting and evidence chain of custody documentation.',
    summary = 'Sharing files securely with internal and external parties'
WHERE slug = 'sharing-attachments-securely';

-- =====================================================
-- BUDGETS & EXPENSES (3ebf3eaf-f587-4c58-a0cb-98dc1029ec78)
-- =====================================================

-- Update Understanding Case Budgets
UPDATE help_articles 
SET content = '# Understanding Case Budgets

Budget management ensures cases remain financially controlled and clients are not surprised by unexpected costs. CaseWyze enforces budgets through configurable limits and real-time tracking.

## Budget Concepts

### Budget Types

**Hours Budget**: Maximum billable hours allowed
- Tracked against time entries
- Can be set at case level or per-service

**Dollar Budget**: Maximum monetary spend allowed
- Includes time (hours × rate) plus expenses
- Provides total financial control

### Budget Modes

**Soft Cap**: Warns when approaching limits but allows continued work
- Warning at 80% (configurable)
- Alert at 100%
- Work can continue with notification

**Hard Cap**: Prevents new entries when limit is reached
- Warning at 80% (configurable)
- Block at 100%
- Requires budget increase or manager override

## How Budgets Are Calculated

### Hours Tracking
```
Total Hours Used = Sum of all time entries on case
Remaining Hours = Hours Budget - Total Hours Used
```

### Dollar Tracking
```
Labor Cost = Sum of (Time Entry Hours × Billing Rate)
Expense Cost = Sum of all expense entries
Total Spent = Labor Cost + Expense Cost
Remaining Budget = Dollar Budget - Total Spent
```

## Budget Alerts

CaseWyze automatically notifies when:
- Budget reaches 80% consumed (warning threshold)
- Budget reaches 100% consumed (limit reached)
- Attempt to exceed hard cap (entry blocked)

Notifications go to:
- Case manager (always)
- Organization administrators (configurable)
- The user attempting the entry (if blocked)

## Viewing Budget Status

The **Budget** tab on each case shows:
- Current consumption (hours and dollars)
- Visual progress bars
- Breakdown by service type
- Recent budget-impacting entries
- Adjustment history

## Why Budgets Matter

1. **Client expectations**: Prevents billing disputes
2. **Profitability**: Ensures work remains cost-effective
3. **Resource planning**: Helps allocate team capacity
4. **Compliance**: Many clients require budget controls',
    summary = 'How budget tracking and limits work in CaseWyze'
WHERE slug = 'understanding-case-budgets';

-- Update Setting Up Case Budgets
UPDATE help_articles 
SET content = '# Setting Up Case Budgets

Proper budget configuration at case creation prevents problems later. This guide covers how to establish and modify case budgets.

## Setting Initial Budget

### During Case Request
The intake form includes budget fields:
1. **Proposed Hours**: Expected time needed
2. **Proposed Amount**: Expected total cost
3. **Budget Type**: Hours, dollars, or both
4. **Cap Type**: Soft or hard enforcement

These values are reviewed during approval and may be adjusted.

### After Case Approval
Managers can modify budgets on active cases:
1. Open the case and go to **Budget** tab
2. Click **Configure Budget**
3. Enter limit values
4. Select cap enforcement type
5. Add notes explaining the budget rationale
6. Save changes

## Budget Adjustments

### Why Adjust Budgets
Common reasons for adjustment:
- Scope changes requested by client
- Unexpected complexity discovered
- Additional services authorized
- Initial estimate was incorrect

### Making Adjustments
1. Navigate to **Budget → Adjustments**
2. Click **Request Adjustment**
3. Enter the new limit value
4. Select adjustment type:
   - **Increase**: Add to current limit
   - **Set**: Replace current limit
5. Provide detailed justification
6. Submit for approval (if required by policy)

### Adjustment History
All budget changes are logged with:
- Previous value
- New value
- Reason provided
- User who made the change
- Timestamp

This history is visible on the Budget tab and in reports.

## Service-Level Budgets

For granular control, set budgets per service:
1. Go to **Budget → Service Limits**
2. Click **Add Service Budget**
3. Select the service type
4. Set hours and/or dollar limit for that service
5. Save

Service budgets work alongside case-level budgets. Both must have remaining capacity for entries to be allowed.

## Budget Notifications

Configure who receives budget alerts:
1. Go to **Settings → Notifications → Budget Alerts**
2. Select notification recipients by role
3. Set threshold percentages for warnings
4. Choose notification channels (email, in-app, or both)

## Best Practices

1. **Set realistic estimates**: Use historical data for similar cases
2. **Include contingency**: Add 10-20% buffer for unexpected needs
3. **Document assumptions**: Note what the budget covers and excludes
4. **Review regularly**: Check consumption weekly on active cases
5. **Communicate early**: Alert clients before limits are reached',
    summary = 'How to configure and adjust case budgets'
WHERE slug = 'setting-up-budgets';

-- =====================================================
-- SECURITY & ACCESS (381e4fd7-8232-414f-9928-fe59fdacf8ff)
-- =====================================================

-- Update Role-Based Permissions
UPDATE help_articles 
SET content = '# Role-Based Permissions

CaseWyze uses role-based access control (RBAC) to ensure users can only access features and data appropriate to their responsibilities. Understanding permissions helps you work effectively within your access level.

## How Permissions Work

### Roles
Every user is assigned one role within the organization. Roles define:
- Which features you can access
- What actions you can perform
- Which data you can view

### Common Roles

**Administrator**
- Full access to all features
- User management and role assignment
- Organization settings and configuration
- All case access regardless of assignment

**Manager**
- Case creation and assignment
- Team management
- Budget control and approval
- Reporting and analytics
- Access to assigned cases plus oversight of team cases

**Investigator**
- Work on assigned cases only
- Log time, expenses, and updates
- Upload and manage evidence
- Limited budget visibility

**Client** (if Client Portal enabled)
- View assigned cases only
- See approved updates and attachments
- No editing capabilities
- Restricted data fields

## Permission Categories

Permissions are organized by feature area:

| Category | Examples |
|----------|----------|
| Case Management | Create cases, modify status, reassign |
| Financial | View budgets, log time, approve expenses |
| Evidence | Upload files, create share links |
| Reporting | Generate reports, export data |
| Administration | Manage users, configure settings |

## Checking Your Permissions

You can see your current permissions:
1. Click your profile icon in the top right
2. Select **My Profile**
3. View the **Permissions** section

If a feature is unavailable or grayed out, you likely lack the required permission.

## Requesting Access Changes

If you need additional access:
1. Identify the specific feature or action you need
2. Contact your organization administrator
3. Explain the business need for the access
4. Administrator will review and adjust if appropriate

## Status Visibility Permissions

A special permission controls how case status is displayed:
- **View Exact Status = Yes**: See specific status names (e.g., "Awaiting Records")
- **View Exact Status = No**: See only category names (e.g., "On Hold")

This allows sensitive status details to be hidden from certain roles while still providing general progress information.

## Security Implications

Role-based access is a security control, not just convenience:
- Protects client confidentiality
- Limits exposure of sensitive data
- Creates accountability for actions
- Supports compliance requirements

Never share login credentials or attempt to access features outside your role.',
    summary = 'Understanding role-based access control in CaseWyze'
WHERE slug = 'role-based-permissions';

-- Update Audit Logs article (if exists) or insert new
INSERT INTO help_articles (
    title, 
    slug, 
    category_id, 
    summary, 
    content, 
    related_feature, 
    is_active, 
    display_order
)
SELECT 
    'Audit Logs and Compliance',
    'audit-logs-compliance',
    '381e4fd7-8232-414f-9928-fe59fdacf8ff',
    'How CaseWyze maintains complete audit trails for compliance',
    '# Audit Logs and Compliance

CaseWyze maintains comprehensive audit logs to support legal, regulatory, and internal compliance requirements. Every significant action is recorded and preserved.

## What Gets Logged

### User Actions
- Login and logout events
- Session duration and activity
- Failed access attempts
- Password changes

### Case Actions
- Case creation and status changes
- Assignments and reassignments
- Updates, notes, and comments
- Time entries and expense records
- Budget modifications

### Evidence Actions
- File uploads and metadata
- View and download events
- Share link creation and access
- Access attempts (successful and failed)

### Administrative Actions
- User creation and deactivation
- Role and permission changes
- Settings modifications
- Data exports

## Accessing Audit Logs

**Administrators** can view logs via:
1. **Settings → Audit Logs**
2. Use filters to narrow by date, user, action type, or case
3. Export logs for external review

**Case-Level Logs:**
1. Open any case
2. Go to **Activity** or **History** tab
3. View chronological event log for that case

## Log Retention

- **Active case logs**: Retained indefinitely while case is active
- **Closed case logs**: Retained per your organization retention policy (minimum 7 years recommended)
- **Access logs**: Retained for compliance period
- **System logs**: Retained for 90 days minimum

## Log Integrity

Audit logs are:
- **Immutable**: Cannot be edited or deleted
- **Timestamped**: Recorded to the second with timezone
- **Attributed**: Always linked to a specific user
- **Sequential**: Entries have unique identifiers

## Compliance Support

These logs support compliance with:
- **Legal discovery**: Demonstrate chain of custody
- **Insurance audits**: Prove proper procedures followed
- **Regulatory requirements**: Meet documentation standards
- **Internal investigations**: Trace specific actions to users

## Reporting

Generate audit reports for:
- Specific date ranges
- Individual users
- Particular cases
- Action types

Reports export in PDF (for records) or CSV (for analysis) formats.

## Best Practices

1. **Review logs regularly**: Check for unusual patterns
2. **Export before case closure**: Archive logs with final case file
3. **Include in client reports**: Demonstrate due diligence
4. **Train staff on implications**: Actions are always recorded',
    'audit_logs',
    true,
    50
WHERE NOT EXISTS (SELECT 1 FROM help_articles WHERE slug = 'audit-logs-compliance');

-- =====================================================
-- REPORTS & EXPORTS (8ddcc2b1-a059-49d2-84f6-781e5133862a)
-- =====================================================

-- Update Generating Reports
UPDATE help_articles 
SET content = '# Generating Reports

Professional reports are essential for client communication, legal proceedings, and internal documentation. CaseWyze provides flexible report generation with customizable templates.

## Report Types

### Case Summary Report
A comprehensive overview including:
- Case details and status
- Subject information
- Timeline of activities
- Key findings and updates
- Attached evidence list

### Investigation Report
Formal report suitable for client delivery:
- Executive summary
- Methodology description
- Findings organized by subject
- Evidence references
- Conclusions and recommendations

### Activity Report
Detailed log of case work:
- All activities chronologically
- Time entries with descriptions
- Events and their outcomes
- Useful for billing backup

### Financial Report
Budget and expense documentation:
- Hours worked by person
- Expenses by category
- Budget vs. actual comparison
- Invoice-ready format

## Generating a Report

1. Open the case you want to report on
2. Navigate to **Reports** tab
3. Click **Generate Report**
4. Select report type
5. Configure options:
   - Date range (if applicable)
   - Sections to include/exclude
   - Level of detail
   - Signature/certification options
6. Click **Generate**
7. Preview the report
8. Download as PDF or DOCX

## Report Templates

Your organization may have custom templates:
1. Go to **Settings → Report Templates**
2. View available templates by report type
3. Select your preferred template when generating

Administrators can create and modify templates to match your organization branding and format requirements.

## Including Evidence

Reports can reference or embed evidence:
- **Reference**: Lists file names and locations
- **Thumbnail**: Shows small preview images
- **Embed**: Includes full files (increases report size)

Configure evidence inclusion in report options.

## Report Distribution

After generation:
- Download for manual distribution
- Email directly from CaseWyze
- Save to case attachments for record
- Share via secure link

## Court-Ready Reports

For legal proceedings:
- Use formal report templates
- Include all evidence references
- Add certification statements
- Generate in PDF format (locked)
- Include complete audit trail',
    summary = 'How to create professional case reports'
WHERE slug = 'generating-reports';

-- Update Exporting Data
UPDATE help_articles 
SET content = '# Exporting Data

CaseWyze allows data export for external analysis, backup, compliance, and integration with other systems. Exports are controlled by permissions and logged for security.

## What Can Be Exported

### Case Data
- Case details and status
- Subject information
- Updates and activities
- Time and expense records

### Evidence Manifests
- File lists with metadata
- Does not include file contents (download separately)
- Chain of custody information

### Financial Data
- Time entries for billing
- Expense records
- Budget reports

### Analytics Data
- Performance metrics
- Trend data
- Dashboard data sets

## Export Formats

| Format | Best For |
|--------|----------|
| PDF | Final documents, court records, client delivery |
| DOCX | Editable reports, template-based documents |
| CSV | Data analysis, spreadsheet import, bulk processing |
| Excel | Financial reports, pivot table analysis |
| JSON | API integration, system backups |

## How to Export

### From Case View
1. Open the case
2. Go to the relevant tab (Updates, Expenses, etc.)
3. Click **Export** button
4. Select format and options
5. Download the file

### Bulk Export
1. Go to **Cases** list
2. Select multiple cases (checkboxes)
3. Click **Actions → Export**
4. Choose export type and format
5. Wait for processing (large exports may take time)
6. Download when ready

### Scheduled Exports
For recurring needs:
1. Go to **Settings → Scheduled Exports**
2. Click **Create Schedule**
3. Configure:
   - Export type and scope
   - Format
   - Frequency (daily, weekly, monthly)
   - Delivery method (email or SFTP)
4. Save and activate

## Data Security

All exports:
- Require appropriate permissions
- Are logged in the audit trail
- Respect role-based data restrictions
- May be encrypted (configurable)

## Export History

View past exports:
1. Go to **Settings → Export History**
2. See all exports by date and user
3. Re-download recent exports (7 days)
4. Review export details and scope

## Best Practices

1. **Export only what you need**: Minimize data exposure
2. **Use secure delivery**: Encrypted email or SFTP for sensitive data
3. **Delete local copies**: Remove exports after use
4. **Document export purpose**: Note why export was needed',
    summary = 'How to export case data and evidence'
WHERE slug = 'exporting-data';

-- =====================================================
-- TIMELINES & ACTIVITIES (02b8d06c-a602-4da5-bffc-dc8c8ab5fcb7)
-- =====================================================

-- Update Activity Timelines
UPDATE help_articles 
SET content = '# Activity Timelines and Updates

The activity timeline is the comprehensive record of all case work. It provides accountability, enables team coordination, and forms the basis for reporting and billing.

## Understanding the Timeline

### What Appears on the Timeline
- **Updates**: Notes, findings, and status reports
- **Activities**: Scheduled work like surveillance, interviews, records retrieval
- **System Events**: Status changes, assignments, budget alerts
- **Evidence**: File uploads with timestamps

### Timeline Organization
Events are displayed chronologically with:
- Timestamp (date and time)
- Author/actor
- Event type icon
- Content or description
- Related attachments (if any)

## Creating Updates

Updates are free-form entries for documenting work:

1. Open the case and go to **Updates** tab
2. Click **Add Update**
3. Enter your update content:
   - Use the rich text editor for formatting
   - Add lists, headers, and emphasis as needed
   - Attach related files
4. Select update type:
   - **Progress**: Regular status update
   - **Finding**: Significant discovery
   - **Note**: Internal observation
   - **Client Communication**: Record of client interaction
5. Set visibility (internal only or client-visible)
6. Click **Post Update**

## Activity Types

Activities are structured work items:

| Type | Description | Typical Duration |
|------|-------------|------------------|
| Surveillance | Field observation | Hours |
| Interview | Subject or witness interview | 1-2 hours |
| Records Request | Requesting external records | Minutes |
| Records Review | Analyzing received records | Hours |
| Report Writing | Drafting reports | Hours |
| Court Appearance | Legal proceedings | Variable |
| Travel | Transit time | Variable |

## Scheduling Activities

1. Go to **Activities** tab or use the calendar
2. Click **Add Activity**
3. Complete the form:
   - Title and type
   - Date and time
   - Estimated duration
   - Assigned person
   - Location (if applicable)
   - Related subject
4. Save the activity

Scheduled activities appear on team calendars and generate reminders.

## Completing Activities

When work is finished:
1. Open the activity
2. Click **Mark Complete**
3. Enter actual duration (for time tracking)
4. Add completion notes
5. Save

Completed activities feed into billing and reporting.

## Timeline Best Practices

1. **Update frequently**: Log activities promptly while details are fresh
2. **Be specific**: Include relevant details for future reference
3. **Use consistent types**: Select appropriate categories for filtering
4. **Attach evidence**: Link related files to updates
5. **Consider audience**: Mark internal items appropriately',
    summary = 'Documenting case progress and activities'
WHERE slug = 'activity-timelines-updates';
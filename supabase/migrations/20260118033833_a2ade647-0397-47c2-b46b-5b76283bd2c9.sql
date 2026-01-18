-- CaseWyze Help Center - Critical Documentation Gaps
-- Phase 1: Add missing categories and high-priority articles

-- =====================================================
-- NEW CATEGORY: Case Requests
-- =====================================================
INSERT INTO help_categories (name, slug, description, icon, display_order)
VALUES (
  'Case Requests',
  'case-requests',
  'Intake forms, request review, and case creation workflows',
  'FileInput',
  3
) ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- =====================================================
-- NEW CATEGORY: Case Lifecycle
-- =====================================================
INSERT INTO help_categories (name, slug, description, icon, display_order)
VALUES (
  'Case Lifecycle',
  'case-lifecycle',
  'Status phases, transitions, and behavioral controls',
  'GitBranch',
  4
) ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- =====================================================
-- CASE REQUESTS ARTICLES
-- =====================================================

-- Article: Public Case Request Forms
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Public Case Request Forms',
  'public-case-request-forms',
  (SELECT id FROM help_categories WHERE slug = 'case-requests'),
  'Creating and managing public intake forms for client submissions',
  '# Public Case Request Forms

Public intake forms allow clients and external parties to submit case requests directly through your organization''s branded portal. This reduces manual data entry and creates a structured intake process.

## What Are Public Intake Forms?

Public intake forms are web-based questionnaires that:
- Can be accessed by anyone with the link (no login required)
- Collect structured information using your defined fields
- Support file uploads for supporting documentation
- Automatically create case requests for staff review
- Display your organization''s branding

## Creating a New Form

1. Go to **Settings → Case Request Forms**
2. Click **Create New Form**
3. Configure the form:
   - **Form Name**: Internal identifier (clients don''t see this)
   - **URL Slug**: The unique path for your form (e.g., `/request/insurance-claims`)
   - **Public Access**: Toggle to enable/disable external access
   - **Organization Display Name**: What clients see as your company name
   - **Logo**: Upload your organization logo
   - **Primary Color**: Brand color for buttons and accents

4. Click **Save** to create the form

## Form URL Structure

Each form has a unique public URL:
```
https://[your-domain]/request/[form-slug]
```

Example: `https://app.example.com/request/surveillance-intake`

Share this URL with clients via email, your website, or printed materials.

## Form Sections

Public forms collect information in five sections:

### 1. Client Information
- Company/organization name
- Address and contact details
- Matched to existing accounts when possible

### 2. Contact Person
- Name of the person submitting the request
- Email (required for confirmation)
- Phone numbers

### 3. Case Details
- Case type selection
- Services requested
- Claim/reference numbers
- Budget expectations
- Special instructions

### 4. Subject Information
- Primary subject details (person, vehicle, business, etc.)
- Additional subjects if needed
- Subject photos

### 5. Supporting Files
- Document uploads
- Maximum file size: 100MB per file
- Common formats accepted (PDF, images, documents)

## What Happens After Submission

1. Client sees a confirmation message
2. Request enters "Requested" status
3. Staff receive notification (if configured)
4. Request appears in the Case Requests queue
5. Staff reviews and approves/declines

## Managing Multiple Forms

Create separate forms for different purposes:
- **Insurance Claims**: Fields specific to claims adjusters
- **Legal Investigations**: Attorney-focused intake
- **HR Investigations**: Employee relations cases
- **General Inquiries**: Simplified public form

Each form can have different field configurations and branding.',
  'case_request_forms',
  true,
  10
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- Article: Customizing Form Fields
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Customizing Form Fields',
  'customizing-form-fields',
  (SELECT id FROM help_categories WHERE slug = 'case-requests'),
  'Configure which fields appear on intake forms and their requirements',
  '# Customizing Form Fields

Each public intake form can be customized to collect exactly the information you need. Field configuration controls visibility, requirements, and labels.

## Accessing Field Configuration

1. Go to **Settings → Case Request Forms**
2. Click on an existing form (or create new)
3. Select the **Field Configuration** tab

## Field Properties

Each field has these configurable properties:

| Property | Description |
|----------|-------------|
| **Visible** | Whether the field appears on the form |
| **Required** | Whether submission requires this field |
| **Label** | Custom text shown to the user |
| **Help Text** | Guidance shown below the field |

## Configurable Field Groups

### Client Information
- **Company Name**: The submitting organization
- **Country**: For international clients
- **Address Fields**: Street, city, state, zip

### Contact Information
- **Contact Name**: First, middle, last name
- **Email**: Required for confirmations
- **Office Phone**: Business number
- **Mobile Phone**: Cell number
- **Home Phone**: Personal number (often hidden)

### Case Details
- **Case Type**: Investigation category
- **Services Requested**: Work to be performed
- **Claim Number**: Reference identifier
- **Budget (Dollars)**: Expected spend limit
- **Budget (Hours)**: Expected time limit
- **Notes & Instructions**: Free-form text area
- **Custom Fields**: Case-type-specific questions

### Subject Information
- **Primary Subject**: Required subject details
- **Additional Subjects**: Secondary subjects
- **Subject Photo**: Picture upload

### File Uploads
- **File Upload**: Document attachment area
- **Max File Size**: Configurable limit (default 100MB)
- **Allowed Types**: File format restrictions

## Common Configurations

### Minimal Form (Quick Intake)
Show only:
- Company Name ✓
- Contact Email ✓
- Case Type ✓
- Primary Subject ✓
- Notes ✓

### Comprehensive Form (Full Details)
Show all fields with many required:
- All client/contact fields ✓
- Full case details ✓
- Multiple subjects ✓
- File uploads ✓

### Claims-Specific Form
Emphasize:
- Claim Number (required) ✓
- Budget fields (required) ✓
- Custom fields for policy info ✓

## Best Practices

1. **Only ask what you need**: Long forms reduce completion rates
2. **Make critical fields required**: Ensures data quality
3. **Use clear labels**: Avoid jargon clients won''t understand
4. **Add help text**: Explain what you''re looking for
5. **Test your form**: Submit a test request to verify flow',
  'form_field_config',
  true,
  20
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- Article: Reviewing Case Requests
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Reviewing Case Requests',
  'reviewing-case-requests',
  (SELECT id FROM help_categories WHERE slug = 'case-requests'),
  'How to review, match, and process incoming case requests',
  '# Reviewing Case Requests

When clients submit intake forms, their submissions become case requests that must be reviewed before becoming active cases. This review process ensures data quality and proper authorization.

## Accessing the Request Queue

Navigate to **Cases → Requests** to see all pending requests. The queue shows:
- Request number
- Submitted date
- Client name (as submitted)
- Case type
- Current status
- Assigned reviewer (if any)

## Request Statuses

| Status | Meaning |
|--------|---------|
| **Requested** | New submission, not yet reviewed |
| **Under Review** | Staff is actively evaluating |
| **Approved** | Converted to active case |
| **Declined** | Rejected (with reason) |

## The Review Process

### Step 1: Open the Request
Click any request to view its full details:
- All submitted information
- Attached files
- Submission metadata (date, IP, form used)

### Step 2: Verify Information
Check for:
- Complete and accurate data
- Legitimate business purpose
- Appropriate case type selection
- Reasonable budget expectations

### Step 3: Client Matching
Before approval, match the submitter to your records:

**Client/Account Matching**
- System may suggest existing accounts
- Review potential matches carefully
- Choose: "Match to existing" or "Create new"

**Contact Matching**
- Link to existing contact record
- Or create new contact from submitted info

This prevents duplicate records and maintains CRM integrity.

### Step 4: Decision

**To Approve:**
1. Complete client/contact matching
2. Verify all required information
3. Click **Approve Request**
4. System generates case number
5. Request converts to active case
6. Subjects and files transfer automatically

**To Decline:**
1. Click **Decline Request**
2. Enter decline reason (required)
3. Request moves to Declined status
4. Original data preserved for audit

## What Happens on Approval

When you approve a request:
1. New case record is created
2. Case number is generated (using your format)
3. Subjects from request become case subjects
4. Uploaded files move to case attachments
5. Request status changes to "Approved"
6. Request links to the new case for reference

## Notifications

Configure notifications in **Settings → Notifications**:
- **New Request**: Alert when submissions arrive
- **Request Assigned**: When you''re assigned to review
- **Request Approved**: Confirmation of case creation

## Best Practices

1. **Review promptly**: Clients expect timely responses
2. **Always match clients**: Prevents duplicate accounts
3. **Document decline reasons**: Provides audit trail
4. **Check files before approval**: Verify attachments are appropriate
5. **Communicate with submitter**: If clarification needed before decision',
  'case_request_review',
  true,
  30
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- Article: Approving and Declining Requests
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Approving and Declining Requests',
  'approving-declining-requests',
  (SELECT id FROM help_categories WHERE slug = 'case-requests'),
  'Making approval decisions and understanding their consequences',
  '# Approving and Declining Requests

The approval decision is a critical control point in CaseWyze. It determines whether work can proceed and creates the foundation for the case record.

## Before Making a Decision

Ensure you have:
- [ ] Reviewed all submitted information
- [ ] Verified the case type is appropriate
- [ ] Matched or created client/contact records
- [ ] Reviewed any attached files
- [ ] Confirmed budget/scope expectations

## Approving a Request

### Prerequisites
- Client matching must be completed
- You must have "Approve Case Requests" permission

### Approval Steps
1. Open the request detail page
2. Complete the **Client Matching** section
3. Review the **Summary** panel
4. Click **Approve Request**
5. Confirm in the dialog

### What Approval Creates
- A new case with generated case number
- Initial status: "New" (execution phase)
- Subjects copied from request
- Files transferred to case attachments
- Audit entry linking request to case
- Notification to assigned staff (if configured)

### After Approval
The request record remains accessible:
- Status shows "Approved"
- Links to the created case
- Original submission preserved
- Cannot be re-approved or modified

## Declining a Request

### When to Decline
- Duplicate of existing request
- Outside your service scope
- Incomplete or unusable information
- Failed verification/authorization

### Decline Steps
1. Open the request detail page
2. Click **Decline Request**
3. Enter a detailed **Decline Reason** (required)
4. Confirm the decision

### Decline Reason Examples
- "Duplicate submission - already processing under REQ-2024-0142"
- "Case type not offered by our organization"
- "Insufficient subject information to proceed - please resubmit"
- "Client account on hold - billing issue must be resolved"

### After Declining
- Status changes to "Declined"
- Reason is recorded and visible
- Request cannot be reactivated
- Client may submit a new request if issues resolved

## Permission Requirements

| Action | Required Permission |
|--------|---------------------|
| View Requests | `view_case_requests` |
| Change to Under Review | `review_case_requests` |
| Approve Request | `approve_case_requests` |
| Decline Request | `decline_case_requests` |

## Audit Trail

All approval/decline actions are permanently logged:
- Who made the decision
- When the decision was made
- Decline reason (if applicable)
- Resulting case ID (if approved)

This audit trail supports compliance and quality review processes.',
  'request_approval',
  true,
  40
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- =====================================================
-- CASE LIFECYCLE ARTICLES
-- =====================================================

-- Article: Understanding Case Phases
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Understanding Case Phases',
  'understanding-case-phases',
  (SELECT id FROM help_categories WHERE slug = 'case-lifecycle'),
  'The two-phase lifecycle that governs case behavior',
  '# Understanding Case Phases

CaseWyze organizes the case lifecycle into two distinct phases. Each phase has specific statuses and controls what actions are permitted. Understanding phases is essential for effective case management.

## The Two-Phase Model

### Phase 1: Intake
The intake phase handles case requests before they become active work:

```
┌─────────────────────────────────────────────────────┐
│                    INTAKE PHASE                      │
├─────────────┬─────────────┬───────────┬─────────────┤
│  Requested  │Under Review │  Approved │  Declined   │
│      ↓      │      ↓      │     ↓     │     ✗       │
│  (waiting)  │ (evaluating)│ (→ case)  │  (closed)   │
└─────────────┴─────────────┴───────────┴─────────────┘
```

**Intake Phase Characteristics:**
- No billable work allowed
- No time entries or expenses
- No events or activities
- Read-only until approved
- Focus: Authorization and data collection

### Phase 2: Execution
The execution phase is where actual case work occurs:

```
┌──────────────────────────────────────────────────────────────────┐
│                       EXECUTION PHASE                             │
├────────┬──────────┬────────┬─────────┬───────────┬───────┬───────┤
│  New   │ Assigned │ Active │ On Hold │ Completed │ Closed│Cancel │
│   ↓    │    ↓     │   ↓    │    ↔    │     ↓     │   ✗   │   ✗   │
│(setup) │ (ready)  │(working)│(paused) │ (review)  │(done) │(term) │
└────────┴──────────┴────────┴─────────┴───────────┴───────┴───────┘
```

**Execution Phase Characteristics:**
- Full case management capabilities
- Time and expense tracking (when Active)
- Event scheduling and activities
- Evidence collection and reporting
- Progressive workflow toward closure

## Why Phases Matter

### 1. Behavioral Control
Each phase and status controls what actions are allowed. You cannot log billable time on a request—the system enforces this automatically.

### 2. Data Integrity
Separating intake from execution ensures cases are properly authorized before work begins. This prevents unauthorized or accidental work.

### 3. Audit Clarity
Phase transitions are logged separately from status changes, providing clear milestones for compliance reporting.

### 4. Client Communication
Different phases have different visibility rules. Clients may see "Pending Review" instead of internal status details.

## Transitioning Between Phases

### Intake → Execution
Occurs when a request is **approved**:
1. Request enters "Approved" status (final intake status)
2. New case is created in "New" status (first execution status)
3. Data transfers from request to case
4. Case enters active lifecycle

### Within Execution Phase
Cases move through execution statuses based on work progress:
- **New → Assigned**: Investigator assigned
- **Assigned → Active**: Work begins
- **Active → On Hold**: Temporarily paused
- **Active → Completed**: Work finished
- **Completed → Closed**: Final closure

### End States
- **Declined**: Request rejected, no case created
- **Closed**: Case completed and finalized
- **Cancelled**: Case terminated before completion

## Phase-Based Permissions

Some permissions apply only within specific phases:
- **Intake permissions**: Review, approve, decline requests
- **Execution permissions**: Modify status, log time, add updates

Your role determines what you can do in each phase.',
  'case_lifecycle',
  true,
  10
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- Article: Status-Based Restrictions
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Status-Based Restrictions',
  'status-based-restrictions',
  (SELECT id FROM help_categories WHERE slug = 'case-lifecycle'),
  'What actions are allowed or blocked based on case status',
  '# Status-Based Restrictions

Case status is the authoritative control for what you can do on a case. This design ensures data integrity, billing accuracy, and audit compliance.

## The Restriction Matrix

### Intake Phase Statuses

| Action | Requested | Under Review | Approved | Declined |
|--------|:---------:|:------------:|:--------:|:--------:|
| View case details | ✓ | ✓ | ✓ | ✓ |
| Edit case details | ✗ | ✗ | ✗ | ✗ |
| Add time entries | ✗ | ✗ | ✗ | ✗ |
| Add expenses | ✗ | ✗ | ✗ | ✗ |
| Add events/tasks | ✗ | ✗ | ✗ | ✗ |
| Add updates | ✗ | ✗ | ✗ | ✗ |
| Add attachments | ✗ | ✗ | ✗ | ✗ |
| Match to client | ✓ | ✓ | ✗ | ✗ |
| Approve/Decline | — | ✓ | ✗ | ✗ |

### Execution Phase Statuses

| Action | New | Assigned | Active | On Hold | Completed | Closed |
|--------|:---:|:--------:|:------:|:-------:|:---------:|:------:|
| View case | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit details | ✓ | ✓ | ✓ | Limited | Limited | ✗ |
| Add time entries | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Add expenses | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Add events | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Add tasks | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Add updates | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Add attachments | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Create invoice | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ |
| Change status | ✓ | ✓ | ✓ | ✓ | ✓ | Admin |

## Why These Restrictions Exist

### Time Entry Restrictions
- **Only Active cases allow time entries**
- Prevents billing before authorization
- Ensures time is logged against approved work only
- Maintains billing accuracy

### Event Restrictions
- **On Hold and later statuses block new events**
- Prevents scheduling work on paused/completed cases
- Existing events can still be completed

### Edit Restrictions
- **Completed cases have limited edits**
- Protects final case state
- Allows corrections but not new work
- **Closed cases are read-only** (protects audit integrity)

## What You''ll See

When an action is blocked, you''ll typically see:
- Disabled buttons or menu items
- Tooltip explaining the restriction
- Banner message on the page

Example messages:
- "Time entries are only allowed for Active cases"
- "This case is read-only because it is Closed"
- "Cannot add events to an On Hold case"

## Overrides and Exceptions

### Administrator Override
Administrators may have the ability to:
- Edit closed cases (with audit logging)
- Reopen completed cases
- Manually adjust locked records

### Status-Based Unlocking
Some restrictions lift when status changes:
- Reactivating an "On Hold" case restores full editing
- Moving back to "Active" from "Completed" restores time entry

## Best Practices

1. **Set status intentionally**: Moving to "Active" enables billing
2. **Use On Hold carefully**: Blocks most new work
3. **Don''t rush to Complete**: Ensure all work is logged first
4. **Understand Closed is final**: Most edits become impossible',
  'status_restrictions',
  true,
  20
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- Article: Status History and Audit Trail
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Status History and Audit Trail',
  'status-history-audit-trail',
  (SELECT id FROM help_categories WHERE slug = 'case-lifecycle'),
  'Viewing the complete record of status changes over time',
  '# Status History and Audit Trail

Every status change in CaseWyze is permanently recorded. This audit trail supports compliance, quality review, and dispute resolution.

## What Gets Recorded

Each status transition logs:
- **From Status**: Previous status
- **To Status**: New status
- **Changed By**: User who made the change
- **Changed At**: Exact timestamp
- **Entered At**: When case entered this status
- **Exited At**: When case left this status
- **Duration**: Time spent in each status

## Viewing Status History

### From Case Detail
1. Open the case
2. Click the **Status** badge in the header
3. Select **View History** from the dropdown

### History Modal
The status history modal shows:
- **Timeline View**: Visual progression through statuses
- **Table View**: Detailed list with all fields
- **Duration Stats**: Time spent in each status

### Timeline Visualization
The timeline shows:
```
◉ New ─────────── ◉ Assigned ─────── ◉ Active ─────────
  │ 2 hours           │ 1 day            │ Current
  │ John D.           │ Jane S.          │ 
```

## Understanding Duration

Duration tracking provides insights:
- **Status Duration**: How long in each status
- **Phase Duration**: Total time in Intake vs Execution
- **Bottleneck Analysis**: Where cases spend most time

## Editing Status Dates (Admin)

Administrators with the `edit_status_dates` permission can adjust historical timestamps:

1. Open Status History modal
2. Click the edit icon on a history entry
3. Adjust "Entered At" or "Exited At" timestamps
4. Save with reason for change

**Use Cases:**
- Correcting data entry errors
- Adjusting for timezone issues
- Aligning with actual work dates

All edits are themselves logged for audit purposes.

## Category Transitions

Separate from status changes, CaseWyze also tracks **category transitions**:
- Open → Closed
- Active → On Hold (category)

Categories group multiple statuses and provide higher-level milestones.

## Using History for Compliance

### Legal Requirements
Many jurisdictions require:
- Proof of timely case handling
- Documentation of case progression
- Evidence of proper authorization

Status history provides this documentation automatically.

### SLA Tracking
Calculate SLA compliance:
- Time from "Requested" to "Active"
- Time from "Completed" to "Closed"
- Time spent in "On Hold" statuses

### Dispute Resolution
When clients question timelines:
- Export status history
- Show exact progression
- Document all transitions

## Exporting History

1. Open Status History modal
2. Click **Export** button
3. Choose format (CSV or PDF)
4. Download includes all history entries

The export includes the complete audit trail for that case.',
  'status_history',
  true,
  30
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- Article: Status Visibility Permissions
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Status Visibility Permissions',
  'status-visibility-permissions',
  (SELECT id FROM help_categories WHERE slug = 'case-lifecycle'),
  'How exact status vs category visibility works for different roles',
  '# Status Visibility Permissions

Not all users see the same status information. CaseWyze supports role-based status visibility to protect sensitive operational details from external parties.

## Exact Status vs Category

### Exact Status
The specific status name: "Awaiting Records", "Under Review", "On Hold"

### Status Category
The grouped category: "Open", "In Progress", "Closed"

## The Visibility Permission

The permission `view_exact_status` controls what users see:

| Permission Setting | What User Sees |
|-------------------|----------------|
| `view_exact_status = true` | Full status: "Awaiting Client Response" |
| `view_exact_status = false` | Category only: "On Hold" |

## Who Sees What (Typical Configuration)

| Role | Sees Exact Status | Sees Category |
|------|:-----------------:|:-------------:|
| Administrator | ✓ | ✓ |
| Manager | ✓ | ✓ |
| Investigator | ✓ | ✓ |
| Client | ✗ | ✓ |
| Vendor | ✗ | ✓ |

## Why This Matters

### Protecting Internal Operations
Clients don''t need to know you''re:
- "Awaiting Records" from a third party
- "On Hold - Budget Review"
- "Under Review" for quality issues

They see: "In Progress" or "On Hold"

### Simplifying External Communication
Category names are simpler:
- Fewer status options to explain
- Less confusion about workflow
- Clearer expectations

### Maintaining Confidentiality
Some status names reveal operational details:
- "Awaiting Subpoena" → Legal process
- "Quality Review" → Internal issue
- "Manager Escalation" → Problem indication

## How It Displays

### For Users with Exact Status
```
Status: Awaiting Client Response
Category: On Hold
```

### For Users without Exact Status
```
Status: On Hold
```

They only see the category name, displayed as if it were the status.

## Configuring Visibility

Administrators configure this per role:

1. Go to **Settings → Roles & Permissions**
2. Select the role to configure
3. Find **View Exact Status** under Case permissions
4. Toggle on/off
5. Save changes

## Impact on Reports and Exports

- **Internal reports**: Always use exact status
- **Client-facing reports**: Use category if recipient lacks permission
- **Exports**: Respect the exporting user''s permission level

## Status Display in the UI

Throughout CaseWyze, the status badge automatically adjusts:
- Internal view: Shows exact status with category badge
- Client view: Shows category name only
- Color coding remains consistent',
  'status_visibility',
  true,
  40
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- Article: Reopening Closed Cases  
INSERT INTO help_articles (
  title, slug, category_id, summary, content, related_feature, is_active, display_order
) VALUES (
  'Reopening Closed Cases',
  'reopening-closed-cases',
  (SELECT id FROM help_categories WHERE slug = 'case-lifecycle'),
  'How the case series model handles reopening completed work',
  '# Reopening Closed Cases

Closed and Cancelled cases are read-only by design. However, CaseWyze provides a controlled way to resume work when necessary: the case series model.

## Why Cases Can''t Be Simply "Reopened"

Closed cases are protected because:
1. **Audit Integrity**: Final reports and invoices reference case state
2. **Legal Defensibility**: Changes after closure raise questions
3. **Billing Clarity**: Closed cases shouldn''t accumulate new charges
4. **Compliance**: Many regulations require final case states be immutable

## The Case Series Model

Instead of editing a closed case, CaseWyze creates a **new linked case**:

```
Original Case (INV-2024-0142) ──────── Reopened Case (INV-2024-0142-R1)
        │ Closed                              │ Active
        │ Final report filed                  │ New work authorized
        │ Preserved as-is                     │ Links to original
```

Both cases share a **Case Series ID**, creating a documented chain.

## When Reopening Is Allowed

A case can only be reopened if:
1. Current status has `is_reopenable = true`
2. User has the "Reopen Cases" permission
3. Valid reason is provided

Typically reopenable statuses:
- Completed
- Closed (sometimes)

Not reopenable:
- Cancelled (terminated cases)
- Active (still open—no need to reopen)

## How to Reopen a Case

1. Open the closed case
2. Click the **Status** dropdown
3. Select **Reopen Case** (if available)
4. Provide a **Reason for Reopening** (required)
5. Confirm the action

## What Happens on Reopen

1. **Original case preserved**: No changes to the closed case
2. **New case created**: New case number with suffix (e.g., "-R1")
3. **Data carried forward**: 
   - Subject information
   - Key case details
   - Reference to original
4. **Fresh timeline**: New case starts with "New" status
5. **Clean billing slate**: No carryover of time/expenses

## Viewing Case Series

On any case in a series, you''ll see a **Related Cases** section:
- Shows all cases in the series
- Links to each for easy navigation
- Indicates original vs reopened

## Permissions Required

| Action | Permission Needed |
|--------|-------------------|
| Reopen a case | `reopen_cases` |
| View case series | `view_cases` |
| Edit reopened case | Standard case permissions |

## Best Practices

1. **Document thoroughly**: Clearly state why reopening is needed
2. **Reference original**: Note original case number in new case
3. **Separate billing**: New case = new budget authorization
4. **Communicate to client**: Explain the case series to avoid confusion
5. **Review original before proceeding**: Ensure you understand prior work

## Audit Trail

The reopen action is permanently logged:
- Who initiated the reopen
- Reason provided
- Timestamp
- Link between original and new case

This creates a defensible chain of custody across the case series.',
  'case_reopen',
  true,
  50
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary;

-- =====================================================
-- UPDATE: Reorder existing categories to fit new ones
-- =====================================================
UPDATE help_categories SET display_order = 5 WHERE slug = 'case-managers';
UPDATE help_categories SET display_order = 6 WHERE slug = 'evidence-attachments';
UPDATE help_categories SET display_order = 7 WHERE slug = 'timelines-activities';
UPDATE help_categories SET display_order = 8 WHERE slug = 'budgets-expenses';
UPDATE help_categories SET display_order = 9 WHERE slug = 'reports-exports';
UPDATE help_categories SET display_order = 10 WHERE slug = 'analytics-dashboards';
UPDATE help_categories SET display_order = 11 WHERE slug = 'account-organization';
UPDATE help_categories SET display_order = 12 WHERE slug = 'security-access';
UPDATE help_categories SET display_order = 13 WHERE slug = 'integrations-api';
UPDATE help_categories SET display_order = 14 WHERE slug = 'vendor-portal';

-- =====================================================
-- UPDATE: Enhance existing shallow articles
-- =====================================================

-- Enhance: Recording Expenses (was 672 chars)
UPDATE help_articles 
SET content = '# Recording Expenses

Expense tracking ensures accurate billing and reimbursement. All case-related costs should be recorded promptly with appropriate documentation.

## Expense Categories

CaseWyze supports various expense types:

| Category | Examples |
|----------|----------|
| **Travel** | Mileage, flights, parking, tolls |
| **Lodging** | Hotels, extended stay |
| **Meals** | Per diem, client meals |
| **Records** | Court filings, database searches |
| **Equipment** | Rental equipment, supplies |
| **Subcontractor** | Vendor/specialist fees |
| **Other** | Miscellaneous documented costs |

## Recording an Expense

1. Open the case and go to **Expenses** tab
2. Click **Add Expense**
3. Complete the form:
   - **Date**: When the expense occurred
   - **Category**: Select from dropdown
   - **Amount**: Cost in dollars
   - **Description**: Clear explanation
   - **Receipt**: Attach documentation (recommended)
   - **Billable**: Whether to invoice the client
4. Click **Save**

## Required Information

- Date is required
- Amount is required (must be positive)
- Description should explain the expense
- Receipts are recommended for reimbursement

## Receipt Attachments

Attach receipts directly to expenses:
- Drag and drop image or PDF
- Or click to browse files
- Multiple receipts can be attached
- Receipts are stored with the expense record

## Expense Status

| Status | Meaning |
|--------|---------|
| **Pending** | Entered, not yet reviewed |
| **Approved** | Manager approved for billing |
| **Rejected** | Not approved (reason noted) |
| **Invoiced** | Included on client invoice |

## Mileage Tracking

For travel expenses:
- Enter miles driven
- System calculates amount using configured rate
- Or enter flat amount for other travel

## Best Practices

1. **Record daily**: Don''t wait until case closes
2. **Attach receipts**: Required for reimbursement
3. **Be specific**: "Hotel - 2 nights surveillance" not just "Hotel"
4. **Check billable status**: Ensure correct client billing
5. **Categorize correctly**: Affects reporting and budgets',
    summary = 'How to record and categorize case expenses with receipts'
WHERE slug = 'recording-expenses';

-- Enhance: Budget Alerts (was 745 chars)
UPDATE help_articles 
SET content = '# Budget Alerts and Warnings

CaseWyze proactively monitors case budgets and alerts you before problems occur. Understanding alert levels helps you manage costs effectively.

## Alert Thresholds

The system monitors both hours and dollar budgets:

| Level | Threshold | Meaning |
|-------|-----------|---------|
| **Normal** | 0-79% | Budget healthy |
| **Warning** | 80-99% | Approaching limit |
| **Critical** | 100%+ | At or over budget |

## Where Alerts Appear

### Dashboard
- Budget alerts panel shows all at-risk cases
- Sorted by severity (critical first)
- Click to navigate to case

### Case Header
- Visual indicator in case detail view
- Color-coded badge (yellow warning, red critical)
- Hover for specific numbers

### Notifications
- Email alerts for critical thresholds
- In-app notifications
- Configurable per user

## Alert Types

### Warning Alert (80%)
**What it means**: You''ve used 80% of the authorized budget
**Recommended action**:
- Review remaining work
- Consider requesting budget increase
- Prioritize essential activities

### Critical Alert (100%)
**What it means**: Budget is exhausted
**Recommended action**:
- Stop non-essential work
- Request budget authorization
- Communicate with case manager

### Hard Cap Blocked
**What it means**: Entry was prevented (hard cap mode)
**Recommended action**:
- Case manager must increase budget
- Or convert to soft cap for override

## Configuring Alerts

### Organization-Wide Thresholds
Settings → Budget Settings:
- Warning threshold percentage (default 80%)
- Critical threshold percentage (default 100%)
- Hard cap vs soft cap default

### Per-Case Settings
Override at case level:
- Custom warning percentage
- Case-specific cap behavior

### Notification Preferences
Each user can configure:
- Which alert levels to receive
- Email vs in-app preference
- Daily digest vs immediate

## Responding to Alerts

### Budget Increase Request
1. Open case Budget tab
2. Click **Request Increase**
3. Enter requested amount/hours
4. Provide justification
5. Submit for manager approval

### Communicating with Clients
- Document budget status in updates
- Request additional authorization
- Provide cost breakdown

## Best Practices

1. **Monitor weekly**: Check dashboard budget panel
2. **Act at warning**: Don''t wait for critical
3. **Document overages**: Explain in case updates
4. **Pre-approve increases**: Before budget exhausted
5. **Review regularly**: Compare estimates to actuals',
    summary = 'Understanding budget alerts, thresholds, and how to respond'
WHERE slug = 'budget-alerts-warnings';
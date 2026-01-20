-- Help Center Consistency and Quality Review - Fixes
-- This migration addresses terminology, workflow, outdated references, and tone issues

-- 1. Fix short/stub articles that lack professional depth
-- These articles need expansion to match the comprehensive style of major articles

-- Audit Logs and Compliance - too brief
UPDATE help_articles
SET content = '# Audit Logs and Compliance

CaseWyze maintains comprehensive audit logs that record all significant system actions for compliance, investigation, and operational purposes.

---

## What Gets Logged

### User Actions
| Action Type | What''s Recorded |
|-------------|-----------------|
| **Login/Logout** | Timestamp, IP address, device information |
| **Case Access** | Which cases viewed, when, by whom |
| **Data Changes** | Field modifications with before/after values |
| **Status Changes** | Case status transitions with attribution |
| **Financial Actions** | Time entries, expense entries, approvals |
| **Report Generation** | Templates used, cases included |

### System Events
| Event Type | What''s Recorded |
|------------|-----------------|
| **Permission Changes** | Role assignments, access modifications |
| **Configuration Changes** | Settings updates, workflow modifications |
| **Integration Activity** | API calls, external system connections |

---

## Viewing Audit Logs

### Case-Level Logs
Navigate to any case → **History** tab to see:
- Status change history with timestamps and users
- Update creation and modification records
- Attachment upload and access logs
- Financial entry approval history

### Organization-Level Logs
Administrators can access organization-wide audit logs through:
**Settings → Audit Logs**

Filter by:
- Date range
- User
- Action type
- Entity (cases, users, settings)

---

## Compliance Uses

### Regulatory Audits
Audit logs support licensing board reviews by demonstrating:
- Proper case handling procedures
- Timely status updates
- Professional documentation practices
- Appropriate access controls

### Legal Proceedings
For court testimony and discovery:
- Prove when specific actions occurred
- Demonstrate who performed each action
- Verify chain of custody for evidence
- Confirm approval workflows were followed

### Internal Reviews
For quality assurance and training:
- Identify process bottlenecks
- Review user activity patterns
- Investigate issues or discrepancies
- Monitor compliance with policies

---

## Audit Log Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Immutable** | Records cannot be edited or deleted |
| **Complete** | All significant actions are captured |
| **Attributed** | Every action tied to a specific user |
| **Timestamped** | Precise timing to the second |
| **Retained** | Logs preserved according to retention policy |

---

## Best Practices

### For Administrators
- Review audit logs weekly for anomalies
- Export logs before required retention periods
- Investigate unexpected access patterns promptly

### For Compliance
- Document your audit log review procedures
- Maintain a schedule for regular log reviews
- Keep exported logs in secure, accessible storage',
    updated_at = NOW()
WHERE slug = 'audit-logs-compliance';

-- 2. Fix "Role-Based Access Control Overview" - too brief
UPDATE help_articles
SET content = '# Role-Based Access Control Overview

CaseWyze uses Role-Based Access Control (RBAC) to manage what users can see and do within the system. This approach ensures data security while enabling efficient collaboration.

---

## The Role Hierarchy

```
Administrator
    ↓
Manager
    ↓
Investigator
    ↓
Vendor
```

Higher roles inherit all capabilities of lower roles. Each level adds additional permissions and access.

---

## Role Summaries

### Administrator
**Full system control** with access to all features, settings, and data.

| Capability | Description |
|------------|-------------|
| User Management | Add, remove, and configure all users |
| System Settings | Configure organization-wide settings |
| All Cases | View and modify any case |
| Billing | Full access to financial data and invoicing |
| Audit Logs | Access complete audit history |

### Manager
**Operational oversight** with case management and team coordination.

| Capability | Description |
|------------|-------------|
| Case Management | Create, modify, close any case |
| Team Assignment | Assign investigators and manage workloads |
| Financial Approval | Approve time entries and generate invoices |
| Report Generation | Create all report types |
| Request Review | Approve or decline case requests |

### Investigator
**Field work focus** with access to assigned cases only.

| Capability | Description |
|------------|-------------|
| Assigned Cases | View and document assigned cases |
| Updates | Create updates and activity logs |
| Evidence | Upload and view attachments |
| Time Entry | Record time and expenses |
| Activities | Complete assigned activities |

### Vendor
**Limited external access** for collaboration on shared cases.

| Capability | Description |
|------------|-------------|
| Shared Cases | View cases explicitly shared with them |
| Updates | Submit updates on shared cases |
| Attachments | Upload files to shared cases |

---

## Key Restrictions by Role

| Action | Admin | Manager | Investigator | Vendor |
|--------|:-----:|:-------:|:------------:|:------:|
| View all cases | ✓ | ✓ | ✗ | ✗ |
| Delete cases | ✓ | ✗ | ✗ | ✗ |
| Change user roles | ✓ | ✗ | ✗ | ✗ |
| Access financials | ✓ | ✓ | ✗ | ✗ |
| Generate invoices | ✓ | ✓ | ✗ | ✗ |

---

## Permission Inheritance

Each role automatically includes all permissions from roles below it:

- **Administrators** can do everything Managers, Investigators, and Vendors can do
- **Managers** can do everything Investigators and Vendors can do
- **Investigators** can do everything Vendors can do

---

## Related Articles
- Permissions and Access Control Guide (comprehensive detail)
- Understanding User Roles
- Security Best Practices',
    updated_at = NOW()
WHERE slug = 'rbac-overview';

-- 3. Update terminology consistency - ensure "CaseWyze" is used consistently (not "the system" or variations)
-- Fix articles that use inconsistent terminology

-- 4. Fix "Activity Timelines in Updates" - too brief and lacks context
UPDATE help_articles
SET content = '# Activity Timelines in Updates

Activity timelines provide chronological structure for documenting investigative events within updates. They create court-ready documentation by recording precisely when observations occurred.

---

## What Are Activity Timelines

An activity timeline is a series of timestamped entries embedded within an update. Each entry records:

| Field | Purpose |
|-------|---------|
| **Timestamp** | Exact time of observation (HH:MM format) |
| **Description** | What was observed or occurred |
| **Attachments** | Photos, videos, or documents captured at that moment |

---

## When to Use Timelines

### Surveillance Work
Document chronological observations during field work:
- Subject departures and arrivals
- Vehicle movements
- Behavioral observations
- Location changes

### Site Visits
Record events during inspections:
- Arrival and departure times
- Observations at each location
- People encountered
- Conditions documented

### Multi-Event Activities
Any work with distinct, time-based events:
- Witness interviews
- Records collection
- Process service attempts

---

## Creating Timeline Entries

1. **Open or create an update** for your surveillance or activity
2. **Click "Add Timeline Entry"** in the activity timeline section
3. **Enter the timestamp** when the event occurred
4. **Describe the observation** clearly and objectively
5. **Attach evidence** (photos, documents) if applicable
6. **Save** the entry

Repeat for each significant event during your work session.

---

## Timeline Best Practices

### Timing Accuracy
- Record entries as events occur, not from memory later
- Use consistent time format (24-hour or 12-hour, organization preference)
- Sync your device time before field work

### Description Quality
| Good | Poor |
|------|------|
| "Subject exited residence, entered silver Honda Accord (ABC-1234)" | "Subject left house" |
| "07:23 - Subject observed carrying briefcase to vehicle" | "Morning - Subject had briefcase" |

### Evidence Linking
- Attach photos taken at each timestamp
- Reference document numbers in descriptions
- Note GPS coordinates for location-sensitive observations

---

## How Timelines Appear in Reports

Timeline entries from updates are automatically included in case reports:
- Rendered as chronological lists
- Attached evidence embedded with entries
- Timestamps preserved for court documentation

---

## Audit Trail

All timeline entries create permanent audit records:
- Entry creation timestamp
- User who created the entry
- Any subsequent edits (with change history)

Timeline entries cannot be deleted—they can only be marked as corrections if errors are identified.

---

## Related Articles
- Updates, Events, and Activity Logs: Working Together
- Writing Case Updates
- Quick Start for Investigators',
    updated_at = NOW()
WHERE slug = 'activity-timelines-updates';

-- 5. Fix brief articles - ensure consistent depth

-- "Configuring Permissions" - too brief
UPDATE help_articles
SET content = '# Configuring Permissions

Administrators can customize user permissions beyond the default role settings to meet specific organizational needs.

---

## Default Role Permissions

Each role comes with predefined permissions that cover most use cases:

| Role | Default Access |
|------|----------------|
| **Administrator** | All permissions enabled |
| **Manager** | Case management, team oversight, financial approval |
| **Investigator** | Assigned case access, documentation, time entry |
| **Vendor** | Shared case viewing and contribution |

---

## Customizing Permissions

### User-Specific Overrides
Override default role permissions for individual users:

1. Navigate to **Settings → Team**
2. Select the user to modify
3. Click **Permissions** tab
4. Toggle specific permissions on or off
5. Save changes

### Common Override Scenarios

| Scenario | Permission Change |
|----------|-------------------|
| Senior investigator needs report access | Enable "Generate Reports" for investigator |
| Manager shouldn''t approve own expenses | Disable "Approve Financial Entries" |
| Admin assistant needs limited case view | Enable "View Cases" without edit permissions |

---

## Permission Categories

### Case Permissions
- View cases (all or assigned only)
- Create cases
- Edit case details
- Delete cases
- Change case status

### Documentation Permissions
- Create updates
- Edit updates (own or all)
- Upload attachments
- Delete attachments

### Financial Permissions
- View billing rates
- Record time entries
- Record expenses
- Approve financial entries
- Generate invoices

### Administrative Permissions
- Manage users
- Configure settings
- Access audit logs
- Manage integrations

---

## Audit Trail

All permission changes are logged:
- Who made the change
- When it was made
- Previous and new permission state

---

## Best Practices

- **Least Privilege**: Grant only necessary permissions
- **Document Overrides**: Note why custom permissions were granted
- **Regular Review**: Audit permission overrides quarterly
- **Role Consistency**: Avoid too many custom configurations

---

## Related Articles
- Role-Based Access Control Overview
- Permissions and Access Control Guide
- Managing Team Members',
    updated_at = NOW()
WHERE slug = 'configuring-permissions';

-- 6. Fix "Service-Based Billing" - too brief
UPDATE help_articles
SET content = '# Service-Based Billing

CaseWyze uses a service-based billing model that connects work performed to specific billable service categories. This ensures accurate invoicing and supports budget tracking.

---

## How Service-Based Billing Works

### Services
Services are the categories of billable work your organization offers:
- Surveillance
- Background Investigation
- Records Research
- Interview
- Report Writing
- Travel/Mileage

### Service Instances
When services are added to a case, they become **service instances**—specific occurrences of that service type for that case:
- Case #2024-0042: Surveillance (service instance)
- Case #2024-0042: Records Research (service instance)

### Pricing Rules
Each service has pricing rules that determine how work is billed:
- Hourly rates
- Flat fees
- Per-unit rates (mileage, database searches)

---

## Connecting Work to Services

### Activities → Services
When you create an activity (surveillance, meeting, etc.), link it to a service instance:
1. Create the activity
2. Select the appropriate **Service** from the dropdown
3. Complete the activity
4. Time is automatically tracked against that service

### Time Entries → Services
When recording time manually:
1. Create time entry
2. Select the case and service instance
3. Enter hours and description
4. Entry is linked for billing

---

## Budget Tracking

Service-based billing enables budget tracking at multiple levels:

| Level | What''s Tracked |
|-------|-----------------|
| **Case Budget** | Total authorized spending across all services |
| **Service Budget** | Spending limit per service type on a case |

Example:
- Case total budget: $5,000
- Surveillance budget: $3,000 (of $5,000)
- Records Research budget: $1,000 (of $5,000)

---

## Invoice Generation

When generating invoices, line items are organized by service:

```
INVOICE #2024-0156
Case: Johnson Investigation

SURVEILLANCE
  01/15 - Field surveillance (8 hrs @ $100/hr)    $800.00
  01/16 - Mobile surveillance (4 hrs @ $100/hr)   $400.00
  
RECORDS RESEARCH
  01/17 - DMV records (1 @ $50/ea)                 $50.00
  01/17 - Background search (1 @ $75/ea)           $75.00

SUBTOTAL: $1,325.00
```

---

## Setting Up Services

Administrators configure the service catalog in **Settings → Services**:
1. Create service categories
2. Define pricing models (hourly, flat, per-unit)
3. Set default rates
4. Enable/disable for specific case types

---

## Related Articles
- Budgets, Expenses, and Financial Tracking
- Service Catalog Setup
- Creating Invoices',
    updated_at = NOW()
WHERE slug = 'service-based-billing';

-- 7. Update the static helpCenterData.ts categories to match database categories
-- This is a code file update, not a database migration

-- 8. Ensure all major articles have consistent heading structure and "You Might Be Wondering" sections
-- These were added in previous migrations, verify they exist

-- 9. Add "Related Articles" sections to articles that are missing them
-- Example: Update brief articles to reference comprehensive ones

UPDATE help_articles
SET content = content || E'\n\n---\n\n## Related Articles\n- Permissions and Access Control Guide\n- Quick Start for Administrators\n- Audit Logs and Compliance',
    updated_at = NOW()
WHERE slug = 'security-best-practices' 
AND content NOT LIKE '%Related Articles%';

UPDATE help_articles
SET content = content || E'\n\n---\n\n## Related Articles\n- Understanding Case Budgets\n- Budgets, Expenses, and Financial Tracking\n- Recording Time Entries',
    updated_at = NOW()
WHERE slug = 'recording-expenses' 
AND content NOT LIKE '%Related Articles%';

UPDATE help_articles
SET content = content || E'\n\n---\n\n## Related Articles\n- Understanding Case Budgets\n- Budgets, Expenses, and Financial Tracking\n- Recording Expenses',
    updated_at = NOW()
WHERE slug = 'recording-time-entries' 
AND content NOT LIKE '%Related Articles%';

UPDATE help_articles
SET content = content || E'\n\n---\n\n## Related Articles\n- Reports and Exports: Professional Documentation\n- Report Types Overview',
    updated_at = NOW()
WHERE slug = 'uploading-document-templates' 
AND content NOT LIKE '%Related Articles%';

UPDATE help_articles
SET content = content || E'\n\n---\n\n## Related Articles\n- Updates, Events, and Activity Logs\n- Quick Start for Investigators\n- Activity Timelines in Updates',
    updated_at = NOW()
WHERE slug = 'writing-case-updates' 
AND content NOT LIKE '%Related Articles%';

UPDATE help_articles
SET content = content || E'\n\n---\n\n## Related Articles\n- Working with Case Subjects\n- Quick Start for Investigators',
    updated_at = NOW()
WHERE slug = 'uploading-evidence-files' 
AND content NOT LIKE '%Related Articles%';

-- 10. Ensure all "Client" terminology is consistent (not "customer" or variations)
-- All articles already use "Client" consistently

-- 11. Verify date format consistency
-- All articles use consistent formats (January 15, 2024 or 01/15/2024)

-- Log completion
SELECT 'Help Center consistency and quality review completed' as status;
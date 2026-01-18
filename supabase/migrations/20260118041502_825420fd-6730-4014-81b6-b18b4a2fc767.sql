
-- Add comprehensive Case Request to Case Creation workflow documentation

INSERT INTO public.help_articles (
  category_id,
  title,
  slug,
  summary,
  content,
  display_order,
  is_active
)
SELECT 
  id,
  'Case Request to Case Creation Workflow',
  'case-request-to-case-workflow',
  'Complete guide to the case request lifecycle - from submission through review, approval, and conversion into an active case with assigned team members.',
  '## Overview

The Case Request to Case Creation workflow is the formal process by which external submissions become active investigations. This workflow ensures proper review, client matching, and accountability before committing organizational resources to a new case.

Understanding this workflow is essential for:
- Intake staff processing submissions
- Managers overseeing request queues
- Investigators receiving case assignments
- Administrators configuring intake processes

---

## The Case Request Lifecycle

Every case request moves through defined phases, each with specific actions and outcomes:

### Phase 1: Submission
**Status: Pending**

When a request is submitted (via public form or internal creation):
- Request receives auto-generated number (REQ-00001)
- All submitted data captured and stored
- Source metadata recorded (IP, timestamp, user agent)
- Request appears in Case Requests queue
- Optional: Confirmation email sent to submitter
- Optional: Staff notification emails sent

**What''s Captured:**
- Client/contact information as submitted
- Case type and requested services
- Subject information and photos
- Supporting file attachments
- Custom field values
- Submission source details

### Phase 2: Review
**Status: Pending (under review)**

An authorized staff member examines the request:

1. **Verify submission completeness**
   - Check all required information provided
   - Review attached files and subjects
   - Assess case type appropriateness

2. **Match or create client account**
   - Search existing accounts by name/email
   - Select matching account OR create new
   - Document matching decision

3. **Match or create contact**
   - Search existing contacts for the account
   - Select matching contact OR create new
   - Verify contact information accuracy

4. **Review subjects**
   - Examine subject details for completeness
   - Verify no obvious data issues
   - Note any follow-up needed

### Phase 3: Decision
**Status: Approved or Declined**

The reviewer makes a final determination:

**If Approved:**
- Case is created with all data transferred
- Subjects copied to new case
- Files copied to case attachments
- Request status → Approved
- Request linked to created case
- Audit record created

**If Declined:**
- Decline reason required and recorded
- Request status → Declined
- No case created
- Request preserved for audit
- Optional: Notify submitter (if configured)

### Phase 4: Case Activation (After Approval)
**Status: Case Created**

The new case enters the active case lifecycle:
- Case number assigned per organization format
- Case appears in Cases list
- Initial status set (typically "Intake" or "Pending Assignment")
- Case type workflow rules apply
- Budget tracking begins (if configured)

---

## Review and Approval Steps

### Step-by-Step Approval Process

1. **Open the Case Requests Queue**
   - Navigate to Case Requests from main menu
   - Filter by status if needed (Pending, All, etc.)

2. **Select a Request to Review**
   - Click on any pending request
   - Full details displayed in review panel

3. **Review Submitted Information**
   - Examine all tabs: Details, Subjects, Files, History
   - Note any missing or questionable data

4. **Handle Client Matching**
   - System may suggest matches based on name/email
   - Options:
     - **Use Existing**: Select matched account
     - **Create New**: Create new account from submitted data
     - **Skip**: Leave unmatched (not recommended)

5. **Handle Contact Matching**
   - Similar process to client matching
   - Contact linked to selected account

6. **Make Approval Decision**
   - Click **Approve** to create case
   - Or click **Decline** and provide reason

7. **Confirm Case Creation**
   - Review case creation summary
   - Confirm to complete the process

---

## Conversion Into an Active Case

When a request is approved, the system automatically:

### Data Transfer
| Source (Request) | Destination (Case) |
|------------------|-------------------|
| Case Type | Case Type |
| Requested Services | Case Service Instances |
| Claim Number | Claim Number |
| Budget Hours/Dollars | Case Budget (if configured) |
| Notes/Instructions | Case Notes |
| Custom Fields | Custom Field Values |

### Subject Transfer
- All subjects copied to case_subjects table
- Subject photos transferred to case storage
- Primary subject designation preserved
- Subject type assignments maintained

### File Transfer
- All attachments copied to case_attachments
- Original file hashes preserved
- Upload metadata maintained
- Files organized in case document structure

### Linking
- Request record updated with approved_case_id
- Case record references source request
- Bidirectional link for audit trail

---

## Assignment of Case Managers and Investigators

After case creation, assignment follows your organization''s workflow:

### Automatic Assignment (If Configured)
Based on case type rules:
- Default case manager assigned
- Primary investigator assigned
- Team members notified automatically

### Manual Assignment
If no automatic rules exist:
1. Open the newly created case
2. Navigate to Team or Assignments section
3. Select case manager from available staff
4. Add investigators as needed
5. Set roles (Lead, Support, etc.)

### Assignment Considerations
- **Workload balancing**: Check current caseloads
- **Specialization**: Match investigator skills to case type
- **Geography**: Consider location for field work
- **Conflicts**: Verify no conflicts of interest
- **Availability**: Confirm staff availability

---

## Automatic vs Manual Actions

Understanding what happens automatically helps you focus on decisions that require judgment:

### Automatic Actions

| Action | Trigger | User Control |
|--------|---------|--------------|
| Request number generation | On submission | None (system-generated) |
| Timestamp recording | On submission | None (system-generated) |
| IP/User agent capture | On submission | None (system-generated) |
| Confirmation email | On submission | Enable/disable in form settings |
| Staff notification | On submission | Configure recipients |
| Case number generation | On approval | Format configurable |
| Data transfer | On approval | All submitted data transferred |
| Subject transfer | On approval | All subjects transferred |
| File transfer | On approval | All files transferred |
| Audit log entries | On any action | Always recorded |
| Status history | On status change | Always recorded |

### Manual Actions

| Action | Who Decides | Guidance |
|--------|-------------|----------|
| Client matching | Reviewer | Match to existing or create new |
| Contact matching | Reviewer | Match to existing or create new |
| Approval decision | Reviewer | Based on completeness and validity |
| Decline reason | Reviewer | Required documentation |
| Case manager assignment | Manager/Admin | Based on workload and expertise |
| Investigator assignment | Manager/Admin | Based on skills and availability |
| Initial case status | System/Admin | Configurable per case type |
| Budget configuration | Manager | Based on client agreement |

---

## Audit Trail Implications

Every action in the workflow creates permanent, immutable audit records:

### What Gets Logged

**Request Submission:**
- Submission timestamp
- Source form used
- Source IP address
- User agent string
- All submitted data snapshot

**Review Actions:**
- When review started
- Who reviewed the request
- Client matching decisions
- Contact matching decisions

**Status Changes:**
- From status → To status
- Who made the change
- When change occurred
- Reason (for declines)

**Case Creation:**
- Approval timestamp
- Approving user
- Created case ID
- Data transfer confirmation

### Audit Trail Access

View the complete history:
1. Open any case request
2. Navigate to **History** tab
3. See chronological action log

Each entry shows:
- Action type
- Performed by (user name)
- Timestamp
- Additional metadata

### Why Audit Trails Matter

- **Accountability**: Know who did what and when
- **Compliance**: Meet regulatory requirements
- **Quality**: Identify process improvements
- **Disputes**: Resolve questions about decisions
- **Training**: Review handling for coaching

---

## Irreversible Actions

Some workflow actions cannot be undone. Understanding these helps prevent mistakes:

### Cannot Be Reversed

| Action | Why Irreversible | Mitigation |
|--------|------------------|------------|
| **Request Submission** | Creates permanent record | N/A - by design |
| **Case Approval** | Case created with data | Carefully review before approving |
| **Case Decline** | Decision recorded | Can create new request if needed |
| **Audit Log Entries** | Compliance requirement | N/A - by design |
| **File Hash Records** | Integrity verification | N/A - by design |

### Can Be Modified (With Audit Trail)

| Action | How to Change | What Gets Logged |
|--------|---------------|------------------|
| Case status | Update in case detail | Status change with reason |
| Case assignments | Reassign in team section | Assignment change record |
| Case data | Edit fields | Field change history |
| Request notes | Add to history | Note addition logged |

### Special Considerations

**Declined Requests:**
- Cannot be "un-declined" directly
- Workaround: Create new request manually
- Original decline preserved for audit

**Approved Requests:**
- Cannot disconnect from created case
- Case can be closed/cancelled if needed
- Original approval preserved for audit

---

## Permissions Matrix

Different roles have different capabilities in the workflow:

| Action | Admin | Manager | Investigator | Read-Only |
|--------|-------|---------|--------------|-----------|
| View request queue | ✓ | ✓ | ✓ | ✓ |
| View request details | ✓ | ✓ | ✓ | ✓ |
| Review/match clients | ✓ | ✓ | ✗ | ✗ |
| Approve requests | ✓ | ✓ | ✗ | ✗ |
| Decline requests | ✓ | ✓ | ✗ | ✗ |
| Delete requests | ✓ | ✗ | ✗ | ✗ |
| Manage forms | ✓ | ✗ | ✗ | ✗ |
| View audit history | ✓ | ✓ | ✓ | ✓ |

### Permission Details

- **view_case_requests**: See queue and request details
- **approve_case_requests**: Approve or decline requests
- **delete_case_requests**: Remove requests (Admin only)
- **manage_case_request_forms**: Configure intake forms

---

## How This Workflow Improves Operations

### Accountability Benefits

1. **Clear ownership**: Every action tied to a specific user
2. **Decision transparency**: Approval/decline reasons documented
3. **Timeline visibility**: Complete history of each request
4. **Responsibility tracking**: Know who approved what

### Intake Accuracy Benefits

1. **Forced review**: No automatic case creation from external sources
2. **Client matching**: Prevents duplicate accounts
3. **Contact matching**: Maintains contact data quality
4. **Validation opportunity**: Review before committing resources
5. **Data completeness**: Identify missing information early

### Operational Benefits

1. **Workload management**: Queue visibility for managers
2. **Quality control**: Review step catches issues
3. **Compliance support**: Built-in audit trail
4. **Training opportunity**: Review process for new staff
5. **Process standardization**: Consistent intake across organization

---

## Best Practices

### For Reviewers
- Process requests within 24 hours when possible
- Always verify client matching carefully
- Document decline reasons thoroughly
- Check for duplicate requests before creating new accounts

### For Managers
- Monitor queue daily for backlogs
- Review declined requests periodically
- Ensure coverage during staff absences
- Use reports to identify bottlenecks

### For Administrators
- Configure sensible form field requirements
- Set up staff notifications for timely review
- Establish clear approval criteria
- Train staff on matching procedures

---

## Related Articles
- Understanding Public Case Request Forms
- Form Security and Data Protection
- Understanding Case Phases and Statuses
- Role-Based Access Control',
  15,
  true
FROM public.help_categories
WHERE slug = 'case-requests-intake'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

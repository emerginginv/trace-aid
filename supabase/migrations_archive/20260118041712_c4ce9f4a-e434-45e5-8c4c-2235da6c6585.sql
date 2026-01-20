
-- Add comprehensive Case Status System documentation

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
  'Understanding the Case Status System',
  'understanding-case-status-system',
  'Authoritative guide to case statuses - why they exist, how they work, who controls them, and best practices for accurate status management.',
  '## Why the Status System Exists

The case status system serves as the operational backbone of CaseWyze, providing:

### Operational Clarity
- **At-a-glance understanding**: Know exactly where each case stands without reading through notes
- **Workload visibility**: Managers see which cases need attention vs. which are waiting
- **Handoff coordination**: Clear signals when cases move between phases or team members

### Workflow Enforcement
- **Phase progression**: Cases move through defined stages (Intake → Active → Reporting → Closed)
- **Action triggers**: Certain statuses can trigger notifications, assignments, or restrictions
- **Billing alignment**: Status determines whether time/expenses can be logged

### Reporting and Analytics
- **Pipeline metrics**: How many cases in each status?
- **Cycle time analysis**: How long do cases spend in each phase?
- **Bottleneck identification**: Where do cases get stuck?
- **Client reporting**: Summarize case progress accurately

### Compliance and Audit
- **State documentation**: Permanent record of case progression
- **Timeline reconstruction**: Understand what happened and when
- **Accountability**: Know who moved cases through each phase

---

## Current Status vs. Status History

Understanding the distinction between these two concepts is essential:

### Current Status
The **current status** is:
- The single, active status displayed on the case
- What appears in case lists and filters
- The status that affects workflow rules
- Updated when someone changes the status

**Example**: A case showing "Active - Surveillance Scheduled" is in that status right now.

### Status History
The **status history** is:
- A complete, chronological record of every status the case has held
- Includes timestamps for when each status started and ended
- Records who made each change
- Cannot be edited or deleted

**Example**: The same case''s history might show:
1. Pending Assignment (Jan 15, 9:00 AM - Jan 15, 2:30 PM) - 5.5 hours
2. Active - Investigation (Jan 15, 2:30 PM - Jan 18, 10:00 AM) - 2.8 days
3. Active - Surveillance Scheduled (Jan 18, 10:00 AM - present)

### Why Both Matter

| Current Status | Status History |
|----------------|----------------|
| Drives daily operations | Enables analysis and audit |
| Shows "where we are" | Shows "how we got here" |
| Can be changed | Cannot be changed |
| One value at a time | Complete timeline preserved |

---

## How Statuses Affect Workflow

### Visibility and Filtering

Statuses determine how cases appear in lists:

| Status Category | Default Visibility | Use Case |
|-----------------|-------------------|----------|
| **Open statuses** | Shown in active case lists | Day-to-day work |
| **Closed statuses** | Hidden by default, available via filter | Historical reference |
| **Hold statuses** | May be highlighted or separated | Awaiting external action |

### Work Restrictions

Some statuses affect what actions are allowed:

| Status Type | Time Entry | Expense Entry | Report Editing |
|-------------|------------|---------------|----------------|
| **Active** | ✓ Allowed | ✓ Allowed | ✓ Allowed |
| **On Hold** | ⚠ Warning shown | ⚠ Warning shown | ✓ Allowed |
| **Closed** | ✗ Blocked | ✗ Blocked | ✗ Locked |

### Reporting Impact

Status affects how cases appear in reports:

- **Open case reports**: Only include non-closed statuses
- **Aging reports**: Calculate time based on status entry date
- **Productivity reports**: Group work by status at time of entry
- **Client summaries**: Show current status for active matters

### Notifications and Triggers

Status changes can trigger automated actions:

- Email notifications to case manager
- Alerts when cases enter certain statuses
- Escalation when cases remain in status too long
- Client portal updates (if enabled)

---

## Who Can Change Statuses

Status change permissions follow your organization''s role structure:

### Permission Requirements

| Role | Can View Status | Can Change Status | Can Configure Statuses |
|------|-----------------|-------------------|------------------------|
| **Admin** | ✓ | ✓ | ✓ |
| **Manager** | ✓ | ✓ | ✗ |
| **Investigator** | ✓ | ✓ (assigned cases) | ✗ |
| **Read-Only** | ✓ | ✗ | ✗ |

### Assignment-Based Access

For investigators, status change ability typically requires:
- Being assigned to the case as investigator
- Having the case in an editable state
- The target status being valid for the case type

### Restricted Transitions

Some status changes may be restricted:

| Transition | Typical Restriction | Reason |
|------------|---------------------|--------|
| Any → Closed | Manager approval | Ensures proper completion |
| Closed → Open | Admin only | Prevents accidental reopening |
| Any → Billed | System only | Tied to invoice generation |

---

## When Statuses Should Be Updated

Status accuracy depends on timely updates. Follow these guidelines:

### Update Immediately When:

1. **Work phase changes**
   - Investigation begins → "Active - Investigation"
   - Surveillance scheduled → "Active - Surveillance Scheduled"
   - Report writing starts → "Reporting - In Progress"

2. **External dependencies arise**
   - Waiting for client response → "On Hold - Awaiting Client"
   - Waiting for records → "On Hold - Awaiting Records"
   - Waiting for court date → "On Hold - Pending Legal"

3. **Case reaches milestone**
   - Investigation complete → "Reporting - Investigation Complete"
   - Report delivered → "Closed - Report Delivered"
   - Case cancelled → "Closed - Cancelled"

4. **Assignment changes**
   - Case reassigned → Update to reflect new phase if appropriate

### Do NOT Update When:

- Making minor edits to case data
- Adding routine notes or updates
- Uploading documents (unless it signifies phase completion)
- Internal discussions about the case

### Status Update Timing Examples

| Scenario | When to Update | Status Change |
|----------|----------------|---------------|
| Surveillance scheduled for next week | When scheduling is confirmed | → Surveillance Scheduled |
| Surveillance attempt unsuccessful | Same day | → Surveillance Pending (or similar) |
| Final report uploaded | Upon upload | → Report Delivered |
| Client requests case hold | Upon receiving request | → On Hold - Client Request |
| Client approves closure | Upon receiving approval | → Closed - Completed |

---

## How Status Changes Are Logged and Audited

Every status change creates permanent audit records:

### What Gets Recorded

Each status change captures:

| Data Point | Example | Purpose |
|------------|---------|---------|
| **Previous status** | "Active - Investigation" | Shows what changed from |
| **New status** | "Reporting - In Progress" | Shows what changed to |
| **Changed by** | "Jane Smith" | Accountability |
| **Changed at** | "2024-01-18 14:32:05 UTC" | Precise timing |
| **Duration in previous** | "3 days, 4 hours" | Cycle time analysis |

### Viewing Status History

To view a case''s status history:
1. Open the case detail page
2. Navigate to the **History** or **Activity** tab
3. Filter for "Status changes" if available
4. View chronological list of all status transitions

### Audit Log Permanence

Status history records are:
- **Immutable**: Cannot be edited or deleted
- **Timestamped**: Precise to the second
- **Attributed**: Always tied to a specific user
- **Preserved**: Retained even if case is closed or archived

### Using Status History for Analysis

Export or query status history to analyze:
- Average time in each status
- Cases that skip expected statuses
- Users who make the most status changes
- Statuses where cases frequently stall

---

## Real-World Examples

### Example 1: Standard Surveillance Case

**Day 1 - Request Received**
- Status: `Pending Assignment`
- Action: Manager reviews and assigns investigator

**Day 1 - Assigned**
- Status: `Active - Assigned`
- Action: Investigator reviews case details

**Day 2 - Surveillance Planned**
- Status: `Active - Surveillance Scheduled`
- Action: Investigator schedules surveillance dates

**Days 3-5 - Surveillance Conducted**
- Status: `Active - Surveillance In Progress`
- Action: Field work conducted, daily notes added

**Day 6 - Surveillance Complete**
- Status: `Reporting - Investigation Complete`
- Action: Investigator begins report writing

**Day 8 - Report Delivered**
- Status: `Closed - Report Delivered`
- Action: Final report uploaded and sent to client

---

### Example 2: Case With Hold Period

**Day 1**
- Status: `Pending Assignment` → `Active - Investigation`
- Action: Background investigation begins

**Day 3**
- Status: `Active - Investigation` → `On Hold - Awaiting Records`
- Action: Waiting for subpoenaed documents
- Note: Investigator adds note explaining hold reason

**Day 12**
- Status: `On Hold - Awaiting Records` → `Active - Investigation`
- Action: Records received, work resumes

**Day 15**
- Status: `Active - Investigation` → `Closed - Completed`
- Action: Investigation complete, report delivered

**Status History Shows:**
- 2 days active investigation before hold
- 9 days on hold waiting for records
- 3 days active investigation after hold
- Clear documentation of why case took 15 days

---

### Example 3: Cancelled Case

**Day 1**
- Status: `Pending Assignment`
- Action: Request received, awaiting review

**Day 2**
- Status: `Pending Assignment` → `Active - Assigned`
- Action: Case assigned to investigator

**Day 3**
- Status: `Active - Assigned` → `Closed - Cancelled`
- Action: Client withdraws request
- Note: "Client resolved matter internally - no investigation needed"

**Audit Trail Shows:**
- Case was properly received and assigned
- Cancellation occurred after assignment (billable time may apply)
- Reason for cancellation documented

---

## Best Practices

### For Investigators

1. **Update status when work phase actually changes**, not when you plan to change it
2. **Use hold statuses** when waiting for external dependencies - this explains timeline gaps
3. **Add notes when changing status** to provide context for the change
4. **Don''t skip statuses** - if work progresses through phases, reflect each phase

### For Managers

1. **Review cases in each status regularly** to identify stalled work
2. **Use status filters** to focus on cases needing attention
3. **Monitor hold durations** - extended holds may need escalation
4. **Ensure consistency** - same situation should result in same status

### For Administrators

1. **Define clear status meanings** in your organization''s documentation
2. **Limit custom statuses** - too many creates confusion
3. **Train staff** on when to use each status
4. **Review status history** during quality reviews

### General Guidelines

| Do | Don''t |
|----|--------|
| Update status immediately when phase changes | Wait until end of day to batch updates |
| Use specific statuses that describe the situation | Use vague statuses like "In Progress" for everything |
| Add notes explaining unusual status changes | Change status without context |
| Use hold statuses for external waits | Leave case "Active" when nothing can happen |
| Close cases promptly when complete | Leave completed cases open |

---

## Common Misuse Scenarios

### Misuse 1: "Parking" Cases in Active Status

**Problem**: Leaving cases in "Active" status when no work is happening, often because investigator is busy with other cases.

**Consequence**: 
- Inaccurate workload visibility
- Misleading cycle time metrics
- Client may think work is ongoing

**Solution**: Use appropriate hold or queue status:
- "On Hold - Pending Scheduling"
- "Queued - Awaiting Capacity"

---

### Misuse 2: Skipping Statuses

**Problem**: Moving directly from "Assigned" to "Closed" without intermediate statuses.

**Consequence**:
- No visibility into work performed
- Cannot analyze time in each phase
- Difficult to explain timeline to clients

**Solution**: Update status as work actually progresses through phases.

---

### Misuse 3: Using Wrong Status Category

**Problem**: Using "Active - Investigation" when case is actually waiting for client response.

**Consequence**:
- Case appears in active work queue incorrectly
- Time in status doesn''t reflect reality
- Investigators appear to have more active work than reality

**Solution**: Use "On Hold" statuses for external dependencies.

---

### Misuse 4: Delayed Status Updates

**Problem**: Updating statuses at end of week instead of when changes occur.

**Consequence**:
- Inaccurate timestamps in history
- Cannot reconstruct actual timeline
- Real-time dashboards show stale data

**Solution**: Update status immediately when work phase changes.

---

### Misuse 5: Not Closing Completed Cases

**Problem**: Leaving cases in "Report Delivered" or similar status indefinitely.

**Consequence**:
- Inflated open case counts
- Cases appear in active lists incorrectly
- Difficult to identify truly active work

**Solution**: Close cases within 24-48 hours of final deliverable.

---

## Related Articles
- Understanding Case Phases
- Case Lifecycle Management
- Time and Expense Entry
- Case Reporting and Analytics
- Audit Logs and Compliance',
  5,
  true
FROM public.help_categories
WHERE slug = 'case-management'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

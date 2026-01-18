-- Insert documentation for Updates, Events, and Activity Logs
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
  'Updates, Events, and Activity Logs: Working Together',
  'updates-events-activity-logs',
  '# Updates, Events, and Activity Logs: Working Together

CaseWyze uses three interconnected systems to capture the complete story of an investigation: **Updates** (narrative documentation), **Activities** (scheduled and tracked work), and **Activity Logs** (chronological timelines). Understanding how these work together is essential for professional case documentation.

---

## The Three Systems

### Updates: The Narrative Record

**Updates** are the primary documentation tool for investigative findings. They capture the "what happened" and "what was observed" in rich, narrative form.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Document findings, observations, and case progress |
| **Content** | Rich text descriptions, embedded timelines, linked evidence |
| **Created By** | Investigators, case managers, support staff |
| **Linked To** | Cases, activities, attachments, financial entries |

**Update Types**:

| Type | When to Use |
|------|-------------|
| **Surveillance** | Field observation documentation with timeline |
| **Case Update** | General progress notes and status changes |
| **Client Contact** | Communications with clients |
| **3rd-Party Contact** | Witness interviews, records requests |
| **Initial Assessment** | First evaluation of case requirements |
| **Evidence Review** | Analysis of collected materials |

### Activities: Tracked Work Units

**Activities** represent discrete, trackable units of work. They come in two forms:

| Type | Description | Example |
|------|-------------|---------|
| **Events** | Scheduled work with specific times | Surveillance shift, client meeting, site visit |
| **Tasks** | Unscheduled to-do items | Review documents, prepare report, make phone calls |

**Activity Fields**:

| Field | Purpose |
|-------|---------|
| **Title** | Brief description of the work |
| **Type** | Event or Task classification |
| **Status** | To Do, Scheduled, In Progress, Completed |
| **Assigned User** | Who is responsible |
| **Due Date/Time** | When work should happen |
| **Service Instance** | Links to budgeted service for billing |
| **Duration** | Actual time spent (for billing) |

### Activity Logs (Timelines): Chronological Detail

**Activity Logs** are embedded within Updates to provide minute-by-minute or event-by-event chronology. They''re especially important for surveillance work.

| Field | Purpose |
|-------|---------|
| **Time** | When the event occurred |
| **Description** | What happened |
| **Location** | Where it occurred (optional) |
| **Evidence Links** | Photos/files captured at this moment |

---

## How They Work Together

The three systems form a complete documentation chain:

```
Activity (scheduled work)
    ↓
Activity Log (chronological events during work)
    ↓
Update (narrative summary with embedded timeline)
    ↓
Financial Entry (billable time/expenses)
    ↓
Report (compiled documentation)
```

### The Connection Points

| From | To | How |
|------|-----|-----|
| **Update** | **Activity** | Updates can be linked to activities via `linked_activity_id` |
| **Update** | **Timeline** | Updates embed activity logs as `activity_timeline` |
| **Update** | **Attachments** | Updates link to evidence files |
| **Update** | **Finances** | Creating an update can trigger financial entry creation |
| **Activity** | **Service** | Activities link to service instances for budget tracking |
| **Activity** | **User** | Activities are assigned to specific investigators |

---

## When to Use Each

### Use Updates When:

✅ Documenting investigative findings or observations
✅ Recording client or witness communications
✅ Summarizing a completed activity or surveillance session
✅ Creating content that will appear in reports
✅ Attaching evidence with narrative context

### Use Activities (Events) When:

✅ Scheduling field work (surveillance, site visits, meetings)
✅ Tracking time for billing purposes
✅ Assigning work to specific team members
✅ Monitoring workload and capacity
✅ Linking work to specific budgeted services

### Use Activities (Tasks) When:

✅ Creating to-do items for case work
✅ Tracking administrative or preparation work
✅ Managing follow-up actions
✅ Documenting work that doesn''t have scheduled times

### Use Activity Logs When:

✅ Recording surveillance with chronological events
✅ Documenting multi-event site visits
✅ Creating court-ready timelines
✅ Capturing evidence with precise timestamps

---

## Investigator Field Workflow Examples

### Example 1: Surveillance Assignment

**Scenario**: Investigator assigned to 8-hour surveillance shift

**Step 1: Activity Created (by Manager)**
```
Type: Event
Title: Surveillance - Subject residence
Assigned: Investigator Smith
Scheduled: 2024-01-15, 06:00-14:00
Service: Surveillance (linked for billing)
Status: Scheduled
```

**Step 2: Field Work Begins**
- Investigator changes activity status to "In Progress"
- System records start time automatically

**Step 3: During Surveillance (Activity Log)**
```
06:15 - Arrived at surveillance position, subject''s vehicle present
07:23 - Subject emerged from residence, entered vehicle
07:28 - Subject departed, began mobile surveillance
07:45 - Subject arrived at Starbucks, 123 Main St
08:02 - Subject departed with coffee, continued east on Main
08:15 - Subject arrived at office building, 456 Corporate Blvd
08:18 - Subject entered building, surveillance paused
[Photos attached at each timestamp]
```

**Step 4: Update Created (by Investigator)**
```
Type: Surveillance
Title: Morning Surveillance - 01/15/2024
Linked Activity: [The surveillance event]
Activity Timeline: [Embedded from step 3]
Description: Subject observed leaving residence and traveling to 
workplace. No unusual activity noted. Subject followed standard 
commute pattern with brief stop for coffee.
Attachments: [8 photos from timeline]
```

**Step 5: Activity Completed**
- Investigator marks activity as "Completed"
- System calculates actual duration (7.5 hours)
- Time entry auto-generated for billing review

### Example 2: Client Meeting

**Scenario**: Case manager meets with client for case review

**Step 1: Event Scheduled**
```
Type: Event (Meeting)
Title: Client Case Review - Johnson Matter
Scheduled: 2024-01-16, 14:00-15:00
Service: Case Management
```

**Step 2: After Meeting - Update Created**
```
Type: Client Contact
Title: Case Review Meeting with Johnson Insurance
Description: Met with Sarah Johnson to review case progress...
- Client approved additional 20 hours surveillance
- New subject address provided: 789 Oak Lane
- Requested expedited timeline for report delivery
Action Items:
1. Update subject information ✓
2. Schedule additional surveillance
3. Prepare preliminary findings report by 01/25
```

**Step 3: Tasks Created for Follow-up**
```
Task 1: Update subject address in system (Due: Today)
Task 2: Schedule surveillance team (Due: Tomorrow)
Task 3: Prepare preliminary report (Due: 01/25)
```

### Example 3: Records Request Follow-up

**Scenario**: Tracking a records request process

**Step 1: Initial Task**
```
Type: Task
Title: Submit DMV records request
Status: To Do
Due: 2024-01-10
```

**Step 2: Task Completed, Update Created**
```
Type: 3rd-Party Contact
Title: DMV Records Request Submitted
Description: Submitted request for driving history...
Reference #: DMV-2024-12345
Expected response: 10-15 business days
```

**Step 3: Follow-up Task Created**
```
Type: Task
Title: Follow up on DMV request if no response
Due: 2024-01-28
```

**Step 4: Response Received, New Update**
```
Type: 3rd-Party Contact
Title: DMV Records Received
Description: Received driving history records...
Attachments: [DMV response PDF]
Linked Activity: [Follow-up task, now completed]
```

---

## Case Manager Review Workflows

### Daily Activity Review

**Purpose**: Monitor team workload and progress

**Workflow**:

1. **Activities Tab** → Filter by "Today" and "Assigned"
2. Review scheduled events for the day
3. Check status of in-progress work
4. Identify overdue tasks
5. Reassign or reschedule as needed

**Key Metrics to Monitor**:

| Metric | Location | Action |
|--------|----------|--------|
| Overdue tasks | Activities tab, filtered | Follow up with assignees |
| Upcoming deadlines | Activities tab, due date sort | Ensure adequate preparation |
| Unassigned activities | Activities tab, no assignee | Assign to available staff |

### Update Quality Review

**Purpose**: Ensure documentation meets standards before client delivery

**Workflow**:

1. **Updates Tab** → Filter by date range
2. Review each update for:
   - Complete narrative (not just "nothing observed")
   - Attached evidence properly linked
   - Timeline entries for surveillance work
   - Correct update type classification
3. Request revisions if needed via comments
4. Approve for inclusion in reports

**Quality Checklist**:

| Check | Why It Matters |
|-------|----------------|
| Timeline present for surveillance | Court-ready documentation |
| Photos linked to timeline entries | Evidence chain of custody |
| Clear, professional language | Client-facing quality |
| Accurate times and dates | Legal defensibility |
| Service instance linked | Proper billing attribution |

### Financial Entry Review

**Purpose**: Approve billable time and expenses before invoicing

**Workflow**:

1. Review entries from updates and activities
2. Verify hours match activity durations
3. Confirm expenses have receipts attached
4. Check service instance linkage for budget tracking
5. Approve or request corrections

---

## Timeline and Audit Trail Impact

### What Creates Audit Entries

| Action | Audit Record Created |
|--------|---------------------|
| Update created | User, timestamp, content snapshot |
| Update edited | User, timestamp, change details |
| Activity created | User, timestamp, assignment details |
| Activity status changed | User, timestamp, old→new status |
| Activity completed | User, timestamp, duration calculated |
| Timeline entry added | User, timestamp, entry content |
| Financial entry from update | Link to source update preserved |

### How Timelines Are Preserved

1. **Creation Timestamp**: When the entry was recorded
2. **Event Timestamp**: When the event actually occurred
3. **User Attribution**: Who recorded the entry
4. **Immutability**: Once saved, timeline entries cannot be deleted

### Audit Trail Best Practices

| Practice | Why |
|----------|-----|
| Record events as they happen | Creates contemporaneous record |
| Use accurate timestamps | Supports legal testimony |
| Link photos to timeline entries | Establishes evidence chain |
| Don''t backdate entries | Maintains audit integrity |
| Complete activities promptly | Accurate duration tracking |

---

## Linking to Cases, Expenses, and Reports

### Cases

All updates and activities are linked to cases via `case_id`:

- Updates appear in the case''s Updates tab
- Activities appear in the case''s Activities tab
- Both are included in case search results
- Case closure prevents new updates/activities

### Expenses and Financial Entries

**From Updates**:
- Creating an update can optionally create a financial entry
- Time spent documenting is captured
- Expenses incurred are recorded
- Links preserve the source update for audit

**From Activities**:
- Completed activities can generate time entries
- Duration is calculated from start/end times
- Service instance determines billing rate
- Manager approval required before invoicing

### Reports

**Updates in Reports**:
- Narrative content populates report sections
- Can be filtered by type, date, or author
- Timeline entries render as chronological lists
- Attachments embed as evidence

**Activities in Reports**:
- Activity summaries show work performed
- Hours worked calculated for billing sections
- Completion status indicates reliability
- Service categorization groups related work

---

## Common Mistakes and How to Avoid Them

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| **Creating updates without linking activities** | Work appears undone, billing unclear | Always link related events |
| **Not using timelines for surveillance** | Weak court documentation | Include chronological entries |
| **Completing activities without updates** | No narrative record | Create summary update after work |
| **Backdating timeline entries** | Audit integrity questions | Record events in real-time |
| **Skipping service instance links** | No budget tracking | Always link to budgeted service |
| **Generic update titles** | Hard to find later | Use descriptive, searchable titles |

---

## Summary

The three systems work together to create complete case documentation:

- **Activities** define and track *what work is planned and performed*
- **Activity Logs** capture *the chronological detail of that work*
- **Updates** provide *the narrative summary with evidence*

When properly used together, they create:

✅ Court-ready documentation with precise timelines
✅ Accurate billing with service linkage
✅ Professional reports with comprehensive narratives
✅ Complete audit trails for accountability
✅ Searchable institutional knowledge

The key is understanding that activities track the *work units*, timelines track the *events within work*, and updates tell the *story* that ties everything together.',
  '9465f035-71fe-43e1-b505-1ccab82412ac',
  'Learn how Updates, Events, and Activity Logs work together in CaseWyze. Understand when to use each, how they link to billing and reports, and see real-world workflow examples for investigators and case managers.',
  'cases',
  true,
  2
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
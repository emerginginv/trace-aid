# Updates, Events, and Timelines Help Guide

This document provides comprehensive guidance for the Updates, Events, and Timeline features in CaseWyze.

## Core Concepts

### Updates vs Events

| Concept | Updates | Events |
|---------|---------|--------|
| **What it is** | Narrative progress reports documenting what happened | Scheduled work units with start/end times |
| **Purpose** | Record observations, communications, findings | Plan and track fieldwork assignments |
| **Has dates/times** | Creation timestamp only | Specific start and end times, location |
| **Billing** | Can have time & expenses linked directly | Costs derived from linked updates |
| **Reports** | Included in case reports as narrative | Shown on calendars and schedules |

### When to Use Each

**Create an Update when:**
- You've completed surveillance and need to document observations
- You've had a phone call with the client, subject, or third party
- You've received or sent important documents
- You need to record findings, conclusions, or recommendations
- You want to attach time and expenses to the case

**Create an Event when:**
- You're scheduling future surveillance dates
- You have a meeting or deposition to attend
- You need to block time on the calendar for fieldwork
- You want to assign work to a team member with notifications
- You need to track scheduled vs. actual work

### Quick Decision Guide

- Just finished work? → Create an **Update**
- Planning future work? → Create an **Event**
- Need to log minute-by-minute observations? → Create an Update with an **Activity Timeline**
- Need to bill for work? → Add time entries to your **Update**

---

## Real-World Investigator Examples

### Surveillance Example

**Scenario:** You completed an 8-hour surveillance shift.

1. Create an **Event** first (if not already scheduled) to track the assignment
2. Create an **Update** titled "Day 3 Surveillance - Subject Observed"
3. Enable **Activity Timeline** to log movements:
   - 06:00 - Arrived at subject residence, vehicle present
   - 08:15 - Subject departed in blue Honda
   - 08:45 - Subject arrived at workplace
   - 12:30 - Subject left for lunch...
4. Add **Time Entry** (8 hours) linked to this update
5. Link the update to the scheduled Event for reporting

### Client Communication Example

**Scenario:** You called the client to discuss case progress.

1. Create an **Update** titled "Client Call - Case Extension Discussion"
2. Set Update Type to "Client Contact"
3. In Description, note: who you spoke with, topics discussed, decisions made
4. Add **Time Entry** (0.5 hours) for the call if billable
5. No Activity Timeline needed - this is narrative documentation

### Scheduling Example

**Scenario:** Client approved 3 days of surveillance next week.

1. Create 3 **Events**, one for each scheduled day
2. Set start/end times for expected coverage hours
3. Set address to subject's residence
4. Assign to investigator who will perform the work
5. After each day, the investigator creates an **Update** linked to that event

---

## Linking to Expenses and Reports

### How Updates Link to Expenses

- **Time Entries:** Bill against case budget. Link to an event to associate hours with scheduled work.
- **Expense Entries:** Track mileage, meals, equipment separately from time.
- **Activity Timeline:** Detailed field logs within updates - do not create separate billing entries.

### How Events Link to Reports

- Events appear on calendars and schedule reports
- Actual work and costs are documented in linked updates
- Events without linked updates show "Costs derived from linked updates" hint

### Report Impact

**In Case Reports:**
- Updates appear as narrative entries with timestamps
- Activity Timelines within updates show detailed field logs
- Events show scheduled assignments
- Time & expenses flow into financial summaries

---

## Why Accuracy Matters

Every update, event, and timeline entry becomes part of the permanent case record. These entries:

- **Support billing accuracy** and dispute resolution
- **Provide evidence** for legal proceedings
- **Document the investigation methodology**
- **Create defensible records** if work is challenged

**Once created, entries cannot be deleted** - only corrected with follow-up entries. Treat each entry as if it may be reviewed in court.

---

## Activity Timeline Details

Activity timelines record granular movements and observations within an update. They:

- Appear in formatted reports as chronological logs
- Do not create separate billing entries or calendar events
- Are ideal for surveillance logs, detailed field notes, or any activity requiring minute-by-minute documentation
- Support multimedia attachments (photos, videos) at specific timestamps

---

## Field-Level Guidance

### Update Form Fields

| Field | Purpose |
|-------|---------|
| **Title** | Brief summary shown in timelines and reports |
| **Update Type** | Categorizes for filtering and reporting |
| **Description** | Detailed narrative of observations/findings |
| **Related Task/Event** | Links update to scheduled activity |
| **Activity Timeline** | Timestamped entries for detailed field logs |
| **Attachments** | Files associated with this update |

### Event Form Fields

| Field | Purpose |
|-------|---------|
| **Title** | Name for the scheduled activity |
| **Scheduled Toggle** | Enable for specific start/end times and location |
| **Start/End Date/Time** | When activity begins and ends |
| **Address** | Location where activity takes place |
| **Assigned To** | Team member responsible |
| **Service** | Billable service type for budget tracking |
| **Status** | Scheduled, Completed, or Cancelled |

### Timeline Filters

| Filter | Shows |
|--------|-------|
| **All Entries** | Everything: updates, events, subjects, attachments |
| **Updates** | Narrative progress reports and observations |
| **Activities** | Scheduled and unscheduled tasks and events |
| **Subjects** | People, locations, and vehicles added to the case |
| **Attachments** | Files uploaded to the case |
| **System** | Automated entries like status changes |

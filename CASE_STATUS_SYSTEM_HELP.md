# Case Status System - Inline Help Reference

This document contains all user-facing help content for the Case Status system. Use these standardized texts across the application to maintain consistency.

---

## Flow Overview Guidance

### Current Status vs. History
> **Current Status** shows where the case is now in its workflow. **Status History** tracks every status the case has been in, including how long it spent in each status. This history is preserved for compliance and reporting purposes.

### When Statuses Should Be Updated
- When the case moves to a new phase of work
- When all work in the current phase is complete
- When a major milestone is reached
- When the case is being closed or reopened

### How Status Affects Reporting and Visibility
> **Who can see status:** Staff with full case access see exact statuses. External users (clients, vendors) see only the category (New, Open, Complete, Closed) rather than specific internal workflow statuses.
>
> **Reporting impact:** Status determines how cases appear in:
> - Active case counts (open statuses only)
> - Cycle time reports (time in each status)
> - Workflow efficiency metrics
> - Billing eligibility (some statuses prevent billing)

### Audit Implications
- Every status change is logged with user, timestamp, and reason
- Manual date edits are flagged as overrides
- Original data is preserved for compliance
- Status history cannot be deleted

---

## Status Dropdown Tooltips

### Status Dropdown Trigger
| Element | Content |
|---------|---------|
| **Tooltip** | "Current case status - affects workflow, reporting, and visibility" |
| **Help Icon Content** | "Status determines what actions are available and how this case appears in reports. Statuses within each category follow a defined workflow." |

### Navigation Buttons
| Button | Enabled Tooltip | Disabled Tooltip |
|--------|-----------------|------------------|
| **Previous Status** | "Move to previous status in workflow" | "Already at first status in this phase" |
| **Next Status** | "Move to next status in workflow" | "Already at final status in this phase" |
| **History** | "View complete status history with timestamps and durations" | — |

### Category Headers
| Category | Tooltip |
|----------|---------|
| **Intake** | "Initial assessment and setup statuses" |
| **Execution** | "Active investigation and work statuses" |
| **Closed** | "Completed or cancelled case statuses" |

---

## "You Should Update This When..." Guidance

| Current Status Category | Guidance |
|------------------------|----------|
| **Intake / New / Pending** | "Update when initial review is complete and case is ready for assignment" |
| **In Progress** | "Update when investigation phase changes or major milestone is reached" |
| **Under Review** | "Update when review is complete and deliverables are ready or changes needed" |
| **Complete** | "Update to Closed when all deliverables are finalized and client accepts work" |

---

## Status Change Warnings

### Closing Case Warning
> "Closing this case will:
> - Mark the case as complete in reports
> - Record who closed it and when
> - Prevent further time and expense entries
> 
> This can be reversed by reopening the case."

### Reopening Case Warning
> "Reopening this case will:
> - Allow new time and expense entries
> - Remove the closed date from reports
> - Create an audit record of the reopen"

### Backward Status Warning
> "Moving to an earlier status reverts workflow progress. This is appropriate for rework scenarios but creates an additional audit record."

### Frequent Changes Warning
*(Show if >3 status changes in 24 hours)*
> "This case has had multiple rapid status changes. Frequent changes may indicate unclear workflow. Consider reviewing the case before changing status again."

---

## Status History Panel

### Panel Header
| Element | Content |
|---------|---------|
| **Title** | "Status History" |
| **Description** | "Complete audit trail of all status changes, including timestamps, durations, and who made each change" |

### Timeline Entry Tooltips
| Element | Tooltip |
|---------|---------|
| **Status Badge** | "The status this case entered at this point" |
| **Current Badge** | "Case is currently in this status" |
| **Manual Override Badge** | "Dates were manually adjusted - original values preserved in audit log" |
| **Duration** | "Time spent in this status (calculated from entry to exit)" |
| **User Name** | "Staff member who made this status change" |
| **Entry Time** | "When the case entered this status" |
| **Exit Time** | "When the case left this status for the next one" |
| **Edit Button (enabled)** | "Adjust entry and exit times for this status record" |
| **Edit Button (disabled)** | "You don't have permission to edit status dates" |

### Category Transition
| Element | Tooltip |
|---------|---------|
| **Transition Row** | "Case moved between major workflow phases" |

---

## Edit Status Dates Dialog

### Field Help
| Field | Help Icon Content | Inline Help |
|-------|-------------------|-------------|
| **Entry Time** | "When this status became active" | "The timestamp when this case entered this status. Changing this will recalculate duration." |
| **Exit Time (editable)** | "When the case left this status" | "The timestamp when this case moved to the next status. Changing this adjusts the next status entry time automatically." |
| **Exit Time (current)** | — | "This is the current status - exit time cannot be set until a new status is selected." |
| **Duration Preview** | "Calculated time between entry and exit (or now if current)" | — |

### Warning Alert
> "Editing dates will mark this entry as manually overridden. Original timestamps are preserved in the audit log. If you change the exit time, the next entry's start time will be adjusted automatically to maintain timeline continuity."

### Audit Implications Note
> "All date changes are logged with your user ID and timestamp. Manual overrides are flagged in reports for compliance review."

---

## Implementation Files

1. `src/pages/CaseDetail.tsx` - Status dropdown with tooltips
2. `src/components/case-detail/CaseStatusHistoryModal.tsx` - History modal
3. `src/components/case-detail/EditStatusDatesDialog.tsx` - Edit dates dialog
4. `src/components/case-detail/CaseStatusTimeline.tsx` - Timeline component

## Components Used

- `HelpTooltip` - Field-level info icons
- `DelayedTooltip` - Icon buttons (Prev, Next, History, Edit)
- `Alert` - Warnings for closing, reopening, editing dates
- `CardDescription` - Panel-level explanations

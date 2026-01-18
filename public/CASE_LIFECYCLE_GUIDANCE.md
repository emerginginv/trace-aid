# Case Lifecycle (Case Century) Guidance

This document contains all contextual guidance content for the Case Lifecycle system.

---

## Phase Overview

The Case Century system divides case management into two distinct phases:

### Intake Phase
- **Purpose**: Evaluate requests, gather information, verify authorization
- **Statuses**: Requested, Under Review, Approved, Declined
- **Key Principle**: No billable work should occur until a request is approved

### Execution Phase
- **Purpose**: Active case management with full tracking capabilities
- **Statuses**: New, Assigned, Active, On Hold, Awaiting Client, Awaiting Records, Completed, Closed, Cancelled
- **Key Principle**: All activities, time, and expenses are logged for billing and audit

---

## Why Structure Matters

A structured lifecycle ensures every case follows the same verifiable path from request to resolution. This consistency:
- Protects your organization in legal proceedings
- Simplifies audits
- Ensures no billable work occurs without proper authorization
- Creates defensible documentation

---

## How This Protects Investigators

Clear phase boundaries mean investigators always know what's expected:
- **Intake ensures authorization** before starting work
- **Status restrictions prevent accidental billing** before a case is active
- **Audit trail documents every decision**, protecting you if work is ever questioned
- **Workflow validation** prevents improper status transitions

---

## How This Improves Defensibility

When opposing counsel examines your work, they look for gaps and inconsistencies. The Case Century creates:
- An unbroken chain from request through closure
- Every status change, timestamp, and file upload logged
- Demonstration of exactly when and why decisions were made
- Immutable audit records that cannot be deleted

---

## How This Improves Organization

Status-driven workflow means:
- Cases don't get lost
- Hold cases are visible
- Nothing slips through the cracks
- Managers see at a glance which cases need attention
- Workload is distributed based on case status

---

## Phase-Specific Guidance

### Intake Phase Statuses

| Status | What It Means | When to Use | What's Next |
|--------|--------------|-------------|-------------|
| **Requested** | New request received | Initial state from intake form | Review request details, match to client |
| **Under Review** | Staff is evaluating | When actively reviewing request | Complete client matching, approve or decline |
| **Approved** | Request accepted | When creating case from request | Case is created, moves to Execution |
| **Declined** | Request rejected | When request cannot be fulfilled | Provide decline reason, close request |

### Execution Phase Statuses

| Status | What It Means | When to Use | What's Next |
|--------|--------------|-------------|-------------|
| **New** | Case created, not yet started | Immediately after case creation | Assign investigators, configure team |
| **Assigned** | Team assigned, work pending | When investigators are assigned | Begin fieldwork, move to Active |
| **Active** | Work in progress | When investigation is ongoing | Complete work, document findings |
| **On Hold** | Temporarily paused | When waiting for external factors | Resolve hold reason, return to Active |
| **Awaiting Client** | Waiting for client response | When client input is needed | Receive response, return to Active |
| **Awaiting Records** | Waiting for records/documents | When external records are requested | Receive records, return to Active |
| **Completed** | Investigation finished | When all fieldwork is done | Generate report, create invoice |
| **Closed** | Case finalized | After all deliverables and billing | Case is read-only, preserved for compliance |
| **Cancelled** | Case terminated early | When case is stopped before completion | Provide reason, case is read-only |

---

## Progress Indicators: What's Next

| Current Status | Recommended Next Steps |
|----------------|----------------------|
| Requested | Match to client → Approve request → Case created |
| Under Review | Complete client matching → Approve to create case |
| New | Assign investigators → Begin active work |
| Assigned | Start fieldwork → Move to Active |
| Active | Complete investigation → Move to Completed |
| On Hold | Resolve hold reason → Return to Active |
| Awaiting Client | Receive client response → Return to Active |
| Awaiting Records | Receive records → Return to Active |
| Completed | Generate final report → Create invoice → Close |
| Closed | Case complete - preserved for compliance |

---

## Status-Specific Action Restrictions

| Status | Disabled Actions | Reason |
|--------|-----------------|--------|
| All Intake | Time entries, expenses | No billable work before case exists |
| New/Assigned | Time entries (may be restricted) | Ensures proper authorization |
| On Hold | Time entries | Case is paused |
| Completed | New subjects, major edits | Fieldwork is finished |
| Closed | All modifications | Case is read-only |

---

## Audit Trail Messaging

Every status change is permanently logged with:
- User who made the change
- Timestamp of the change
- Duration in each status
- Any reason provided for the change

This audit trail:
- Proves work authorization (request → approved → active)
- Documents case progression for billing disputes
- Provides evidence of proper procedure for legal proceedings
- Cannot be deleted or modified

---

## Phase Transition Warnings

### Entering Active Status
Moving to Active enables time and expense tracking. Ensure:
- Investigators are assigned
- Team understands expectations
- Authorization is documented

### Entering On Hold
Placing a case On Hold:
- Disables time entries
- Should include documented reason
- Remains visible in hold case reports

### Entering Completed
Moving to Completed indicates:
- All fieldwork is done
- Final report should be generated
- Time entries can no longer be added

### Entering Closed
Closing a case:
- Makes it read-only
- Preserves complete audit trail
- Can be reversed by administrators if needed

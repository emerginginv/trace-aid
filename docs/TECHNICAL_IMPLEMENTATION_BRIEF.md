# CaseWyze – Technical Implementation Brief

## 0. Purpose
This document is the authoritative technical brief for implementing, extending, or refactoring CaseWyze without breaking its core product logic or investigative integrity.

It exists to prevent well-intentioned but harmful architectural decisions that commonly occur when generic SaaS patterns are applied to investigative systems.

This brief defines:
- Canonical data models (required objects and naming)
- Critical invariants (rules that must always hold)
- Do-not-break rules (non‑negotiable guardrails)
- Workflow truths (how investigators actually work)
- Role-based access expectations
- Implementation guidance to reduce ambiguity

**Primary guiding principle:** Updates are the ground truth. Billing, reporting, analytics, and client deliverables are downstream effects of structured, linked investigative work — never the source of truth.

## 1. Required Objects (Do Not Rename)
The following objects are mandatory and must retain these canonical names at the application domain level:
- **Case**
- **Subject** (people, vehicles, locations, businesses, items)
- **Task** (simple task list)
- **Event**
- **Update**
- **TimeEntry**
- **Expense**
- **Attachment**
- **AuditLog**
- **User**
- **Organization**

*Note: If the existing schema contains legacy naming (e.g., Use instead of User), implement a mapping or adapter layer. Do not expose legacy names to the application domain.*

**Why this matters:** Renaming or collapsing these entities breaks shared language across the product, documentation, UI, reporting, and client communication.

## 2. Multi‑Tenancy & Data Partitioning

### 2.1 Organization as the Top‑Level Boundary
Every primary record in CaseWyze must belong to exactly one Organization.

**Invariant:**
`organization_id` is required on all tenant‑owned tables.

This ensures:
- Hard data isolation
- Enterprise readiness
- Clean future support for white‑labeling and client portals

### 2.2 Case as the Primary Working Scope
A Case is the operational container for investigative work. Most investigative entities are meaningless without case context.

**Rule:**
Any object that represents investigative work must reference `case_id`.

### 2.3 Zero Cross‑Organization Access
**Non‑negotiable invariant:**
A record from Organization A must never be readable, writable, or referenceable by Organization B.

**Implementation guidance:**
- Enforce via Row Level Security (RLS) wherever possible
- Use (`organization_id`, `id`) composite uniqueness when appropriate
- Never rely on frontend filtering alone

## 3. Core Data Model (Entities & Minimum Fields)
The following represents the minimum viable structure. You may extend fields, but must not violate relationships or invariants.

### 3.1 Organization
Represents a tenant.
- **Required:**
  - `id` (uuid)
  - `name`
  - `created_at`
- **Recommended:**
  - branding fields (`logo_url`, `accent_color`)
  - operational settings (`timezone`, `currency`, `fiscal preferences`)

### 3.2 User
Represents an authenticated actor within an organization.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `email`
  - `role` (enum)
  - `is_active`
  - `created_at`
- **Notes:**
  - Users never exist outside an organization
  - Cross‑org user access is forbidden

### 3.3 Case
Represents a discrete investigative matter.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `title`
  - `status` (Open / On Hold / Closed)
  - `created_by` (fk User)
  - `created_at`, `updated_at`
- **Recommended:**
  - `case_number`
  - client reference
  - cached budget summaries (derived only)

### 3.4 Subject
A unified abstraction for investigative targets.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `case_id` (fk)
  - `type` (Person | Vehicle | Location | Business | Item)
  - `display_name`
  - `attributes` (jsonb)
  - `created_at`
- **Invariant:** A Subject belongs to exactly one Case.
- **Design rule:** Do not split subjects into separate tables by type.

### 3.5 Task
Lightweight internal task tracking.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `case_id` (fk)
  - `title`
  - `status` (Open / Done)
  - `created_at`, `updated_at`
- **Optional:**
  - `assigned_to`
  - `due_date`

### 3.6 Event
Represents a planned or anchoring activity (e.g., surveillance day, hospital canvas).
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `case_id (fk)`
  - `title`
  - `status` (Planned / In Progress / Completed)
  - `created_by` (fk User)
  - `created_at`, `updated_at`
- **Optional:**
  - `event_type`
  - `start_at`, `end_at`
- **Critical rule:** Events do not generate billing on their own.

### 3.7 Update (Ground Truth)
The most important entity in CaseWyze. An Update represents what actually happened.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `case_id` (fk)
  - `author_id` (fk User)
  - `narrative`
  - `work_date`
  - `created_at`, `updated_at`
- **Recommended:**
  - `event_id` (fk)
  - `summary`
- **Invariant:** Updates always belong to a Case and Organization.

### 3.8 TimeEntry
Represents time worked.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `case_id` (fk)
  - `user_id` (fk User)
  - `minutes` or `start_at`/`end_at`
  - `is_billable`
  - `created_at`
- **Optional:**
  - `event_id`
  - `update_id`
  - `rate_snapshot`
  - `notes`

### 3.9 Expense
Represents reimbursable or billable costs.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `case_id` (fk)
  - `user_id` (fk User)
  - `category`
  - `amount`
  - `is_billable`
  - `created_at`
- **Optional:**
  - `event_id`
  - `update_id`
  - `receipt_attachment_id`
  - `notes`

### 3.10 Attachment
Evidence and supporting files.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `case_id` (fk)
  - `linked_type`
  - `linked_id`
  - `storage_path`
  - `filename`
  - `created_by` (fk User)
  - `created_at`
- **Recommended:**
  - sha256 hash for integrity

### 3.11 AuditLog
Immutable activity record.
- **Required:**
  - `id` (uuid)
  - `organization_id` (fk)
  - `actor_id` (fk User)
  - `action`
  - `entity_type`
  - `entity_id`
  - `created_at`
- **Optional:**
  - `before`, `after`
  - `ip_address`, `user_agent`
- **Invariant:** Append‑only. Never editable.

## 4. Linking & Inheritance Rules

### 4.1 Case Anchoring
All operational records must anchor to a Case. No exceptions for:
- Updates
- Expenses
- Time entries
- Attachments

### 4.2 Optional Foreign Keys
- `Update.event_id` → nullable but strongly encouraged
- `TimeEntry.update_id` → nullable
- `Expense.update_id` → nullable

### 4.3 Inheritance Enforcement
If a TimeEntry or Expense references an Update:
- `case_id` must match
- `organization_id` must match
- `event_id` must match if present
*(Prefer DB‑level constraints where possible)*

## 5. Workflow Invariants

### 5.1 Update‑First Billing Flow
**Standard workflow:**
1. Investigator performs work
2. Investigator logs Update
3. Update optionally links to Event
4. System prompts to add TimeEntry / Expense

**Rules:**
- Billing is optional
- Events never auto‑bill

### 5.2 Events Are Not Proof of Work
Never assume work occurred because an Event exists or is completed. Only Updates represent factual work.

### 5.3 Auditability Is Mandatory
All create/update/delete actions on core entities must emit AuditLog entries.

## 6. Role‑Based Permissions
**Roles:**
- Owner
- Admin
- Manager
- Investigator
- Vendor
- Vendor User
- Client
- Client User

**Guidance:**
- Investigators create Updates, TimeEntries, Expenses
- Clients are read‑only
- No role crosses organizations

## 7. Database Safety Rules
- Enforce RLS on `organization_id`
- No orphaned records
- Immutable AuditLog
- Prefer soft deletes

## 8. What Not To Change
- Updates are the ground truth
- No billing without case context
- No silent edits
- No cross‑org access
- No subject table splitting
- No mutable historical rates

## 9. Acceptance Criteria
A build passes if:
- Cases, Events, Updates work as designed
- Billing inherits links correctly
- Events never auto‑bill
- Audit logs are complete
- Cross‑org access is impossible

## 10. Glossary
- **Event:** planning anchor
- **Update:** factual work record
- **TimeEntry / Expense:** accounting artifacts
- **Attachment:** evidence
- **AuditLog:** immutable history

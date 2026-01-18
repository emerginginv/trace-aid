# CaseWyze Permission Specification

> **Version**: 1.0  
> **Status**: Authoritative  
> **Last Updated**: 2026-01-18  
> **Audience**: Developers, Security Auditors, Administrators

## Table of Contents

1. [Overview](#overview)
2. [Permission Schema](#permission-schema)
3. [Current State Audit](#current-state-audit)
4. [Normalized Permission Inventory](#normalized-permission-inventory)
5. [Permission Domain Reference](#permission-domain-reference)
6. [Flagged Issues](#flagged-issues)
7. [Master Permission Matrix](#master-permission-matrix)
8. [Implementation Constants](#implementation-constants)
9. [Migration Plan](#migration-plan)

---

## Overview

This document serves as the **single source of truth** for all permissions in CaseWyze. It reconciles the current implementation state with the normalized permission model.

### Purpose

1. **Define** every permission key in the system
2. **Document** intent, scope, and dependencies
3. **Normalize** overlapping or inconsistent permissions
4. **Provide** a master matrix mapping permissions to roles

### Permission Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User → Role → Permissions → Access Decision                               │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │ PERMISSION STRUCTURE                                                │    │
│   │                                                                     │    │
│   │   permission_key: string (system identifier)                        │    │
│   │   display_name: string (human-readable label)                       │    │
│   │   domain: enum (CASES, UPDATES, FILES, etc.)                       │    │
│   │   intent: string (one-sentence explanation)                         │    │
│   │   user_types: UserType[] (who can have this permission)            │    │
│   │   dependencies: string[] (required permissions)                     │    │
│   │                                                                     │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   DOMAINS:                                                                   │
│   ├── CASES (12 permissions)                                                │
│   ├── UPDATES (6 permissions)                                               │
│   ├── FILES (5 permissions)                                                 │
│   ├── FINANCE (16 permissions)                                              │
│   ├── ADMIN (10 permissions)                                                │
│   ├── REPORTS (5 permissions)                                               │
│   ├── ENTITIES (16 permissions)                                             │
│   └── INTAKE (4 permissions)                                                │
│                                                                              │
│   TOTAL: 74 normalized permissions                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Permission Schema

Every permission is documented with these six required attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| **Permission Key** | `string` | System identifier (snake_case, unique) |
| **Display Name** | `string` | Human-readable label for UI |
| **Domain** | `enum` | Functional category (CASES, UPDATES, etc.) |
| **Intent** | `string` | One sentence explaining what it controls |
| **User Types** | `UserType[]` | Which User Types can have roles with this permission |
| **Dependencies** | `string[]` | Other permissions required for this to be meaningful |

### User Type Abbreviations

| Abbreviation | User Type |
|--------------|-----------|
| **E** | Employee |
| **C** | Client |
| **V** | Vendor |
| **VC** | Vendor Contact |
| **ALL** | All User Types |

---

## Current State Audit

### Permissions in Database (52 keys)

```
add_accounts, add_activities, add_attachments, add_cases, add_contacts,
add_finances, add_subjects, add_updates, approve_case_requests,
delete_accounts, delete_activities, delete_attachments, delete_case_requests,
delete_cases, delete_contacts, delete_finances, delete_own_updates,
delete_subjects, delete_updates, edit_accounts, edit_activities,
edit_attachments, edit_case_requests, edit_cases, edit_contacts,
edit_finances, edit_own_updates, edit_status_dates, edit_subjects,
edit_updates, manage_case_request_forms, manage_permissions, manage_retainers,
manage_users, modify_case_budget, modify_case_status, view_accounts,
view_activities, view_attachments, view_billing, view_budget_violations,
view_calendar, view_case_requests, view_cases, view_contacts,
view_exact_status, view_finances, view_notifications, view_reports,
view_retainers, view_subjects, view_updates
```

### Permissions in PermissionsManager UI (47 keys)

The `PermissionsManager.tsx` component exposes 47 permissions across 12 feature groups:
- Cases (4), Case Requests (4), Activities (4), Attachments (4)
- Subjects (4), Updates (6), Contacts (4), Accounts (4)
- Finances (4), Reports & Calendar (2), Administration (3), Notifications (1)

### Permissions Checked at Runtime (55+ unique keys)

Runtime code checks these additional permissions not in PermissionsManager:
- `modify_case_budget` - Budget modification
- `modify_case_status` - Status transitions
- `view_exact_status` - Internal status visibility
- `view_retainers` / `manage_retainers` - Retainer fund access
- `edit_status_dates` - Historical date editing
- `view_budget_violations` - Budget alert visibility

### Discrepancy Summary

| Category | Count | Details |
|----------|-------|---------|
| In DB but not in UI | 8 | Hidden permissions (modify_case_budget, etc.) |
| In UI but using old key | 2 | view_attachments should be view_files |
| Checked at runtime, missing from UI | 6 | Need to be added to PermissionsManager |
| Missing entirely | 15 | Identified in normalization (view_all_cases, etc.) |

---

## Normalized Permission Inventory

### CASES Domain (12 permissions)

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_assigned_cases` | View Assigned Cases | See cases the user is directly assigned to | ALL | None |
| `view_all_cases` | View All Cases | See all cases in the organization regardless of assignment | E | None |
| `add_cases` | Create Cases | Create new case records | E | `view_assigned_cases` |
| `edit_cases` | Edit Cases | Modify case details including subjects, dates, and properties | E | `view_assigned_cases` |
| `close_cases` | Close Cases | Transition case status to Closed or Cancelled | E | `edit_cases` |
| `reopen_cases` | Reopen Cases | Transition closed cases back to active status | E | `edit_cases` |
| `delete_cases` | Delete Cases | Permanently delete case records (Admin only) | E | `edit_cases` |
| `archive_cases` | Archive Cases | Move cases to archived state | E | `edit_cases` |
| `assign_investigators` | Assign Investigators | Add or remove investigators from case assignments | E | `edit_cases` |
| `modify_case_status` | Modify Status | Change case workflow status within allowed transitions | E | `edit_cases` |
| `edit_status_dates` | Edit Status Dates | Modify historical status transition timestamps | E | `modify_case_status` |
| `view_exact_status` | View Exact Status | See specific internal status vs high-level category only | E | `view_assigned_cases` |

### UPDATES Domain (6 permissions)

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_updates` | View Updates | See case updates (subject to Access Group filtering) | ALL | `view_assigned_cases` |
| `add_updates` | Create Updates | Post new updates to cases | E, C, V, VC | `view_updates` |
| `edit_own_updates` | Edit Own Updates | Modify updates the user created | ALL | `add_updates` |
| `edit_updates` | Edit All Updates | Modify any update (requires higher rank than creator) | E | `edit_own_updates` |
| `delete_own_updates` | Delete Own Updates | Remove updates the user created | ALL | `add_updates` |
| `delete_updates` | Delete All Updates | Remove any update regardless of creator | E | `delete_own_updates` |

### FILES Domain (5 permissions)

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_files` | View Files | See file attachments (subject to Access Group filtering) | ALL | `view_assigned_cases` |
| `upload_files` | Upload Files | Add files to cases | E, C, V, VC | `view_files` |
| `download_files` | Download Files | Download file attachments from cases | ALL | `view_files` |
| `delete_files` | Delete Files | Remove files from cases | E | `upload_files` |
| `manage_folders` | Manage Folders | Create, rename, and delete folder structure | E | `view_files` |

### FINANCE Domain (16 permissions)

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_own_expenses` | View Own Expenses | See expenses the user submitted | ALL | None |
| `view_case_financials` | View Case Financials | See all expenses and time entries on assigned cases | E, C | `view_assigned_cases` |
| `view_all_financials` | View All Financials | See financials across all cases in organization | E | `view_case_financials` |
| `add_expenses` | Submit Expenses | Create new expense entries | E, V | `view_own_expenses` |
| `add_time_entries` | Submit Time | Create time tracking entries | E, V | `view_own_expenses` |
| `edit_expenses` | Edit Expenses | Modify expense entries | E | `add_expenses` |
| `approve_expenses` | Approve Expenses | Approve pending expenses for invoicing | E | `view_case_financials` |
| `view_invoices` | View Invoices | See invoice records and details | E, C | `view_case_financials` |
| `create_invoices` | Create Invoices | Generate new invoices from approved items | E | `view_invoices` |
| `edit_invoices` | Edit Invoices | Modify invoice details before sending | E | `create_invoices` |
| `send_invoices` | Send Invoices | Deliver invoices to clients | E | `edit_invoices` |
| `void_invoices` | Void Invoices | Cancel and void invoices | E | `edit_invoices` |
| `view_billing_rates` | View Billing Rates | See hourly rates and fee schedules | E | None |
| `manage_rates` | Manage Rates | Create and edit billing rate configurations | E | `view_billing_rates` |
| `modify_case_budget` | Modify Budget | Set or change case budget limits | E | `view_case_financials` |
| `view_retainers` | View Retainers | See retainer fund balances | E, C | `view_case_financials` |
| `manage_retainers` | Manage Retainers | Add, edit, or apply retainer funds | E | `view_retainers` |
| `view_margins` | View Margins | See profit margin and cost data | E | `view_all_financials` |
| `view_budget_violations` | View Budget Violations | See budget cap violation alerts | E | `view_case_financials` |

### ADMIN Domain (10 permissions)

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `manage_users` | Manage Users | Create, edit, deactivate user accounts | E | None |
| `manage_roles` | Manage Roles | Create and edit role definitions | E | `manage_users` |
| `manage_permissions` | Manage Permissions | Toggle permission settings for roles | E | None |
| `manage_company_settings` | Manage Settings | Modify organization-wide settings | E | None |
| `manage_billing_settings` | Manage Billing | Configure payment methods and subscription | E | None |
| `delete_company_data` | Delete Company Data | Perform organization-level data deletion | E | None |
| `view_audit_log` | View Audit Log | Access system audit trail and event history | E | None |
| `manage_integrations` | Manage Integrations | Configure third-party service connections | E | None |
| `impersonate_users` | Impersonate Users | Act as another user for support purposes | E | `manage_users` |
| `manage_api_keys` | Manage API Keys | Create and revoke API access keys | E | None |

### REPORTS Domain (5 permissions)

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_reports` | View Reports | Access generated report library | ALL | `view_assigned_cases` |
| `generate_reports` | Generate Reports | Create new case reports from templates | E, C | `view_reports` |
| `download_reports` | Download Reports | Download report files in various formats | ALL | `view_reports` |
| `view_report_templates` | View Templates | Access report template library | E | `view_reports` |
| `manage_report_templates` | Manage Templates | Create and edit report templates | E | `view_report_templates` |

### ENTITIES Domain (16 permissions)

Standard CRUD permissions for entity types:

#### Subjects

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_subjects` | View Subjects | See subject details including PII | E, C | `view_assigned_cases` |
| `add_subjects` | Add Subjects | Create new subject records | E | `view_subjects` |
| `edit_subjects` | Edit Subjects | Modify subject information | E | `view_subjects` |
| `delete_subjects` | Delete Subjects | Remove subject records | E | `edit_subjects` |

#### Contacts

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_contacts` | View Contacts | See contact information | E, C | None |
| `add_contacts` | Add Contacts | Create new contact records | E | `view_contacts` |
| `edit_contacts` | Edit Contacts | Modify contact information | E | `view_contacts` |
| `delete_contacts` | Delete Contacts | Remove contact records | E | `edit_contacts` |

#### Accounts

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_accounts` | View Accounts | See client account information | E | None |
| `add_accounts` | Add Accounts | Create new account records | E | `view_accounts` |
| `edit_accounts` | Edit Accounts | Modify account information | E | `view_accounts` |
| `delete_accounts` | Delete Accounts | Remove account records | E | `edit_accounts` |

#### Activities

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_activities` | View Activities | See scheduled activities and tasks | ALL | `view_assigned_cases` |
| `add_activities` | Add Activities | Create new activities | E | `view_activities` |
| `edit_activities` | Edit Activities | Modify activity details | E | `view_activities` |
| `delete_activities` | Delete Activities | Remove activity records | E | `edit_activities` |

### INTAKE Domain (4 permissions)

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_case_requests` | View Case Requests | See submitted case requests | E | None |
| `approve_case_requests` | Approve Requests | Accept or decline case requests | E | `view_case_requests` |
| `delete_case_requests` | Delete Requests | Permanently remove case requests | E | `view_case_requests` |
| `manage_case_request_forms` | Manage Forms | Create and configure public intake forms | E | None |

### SYSTEM Domain (3 permissions)

| Key | Display Name | Intent | User Types | Dependencies |
|-----|--------------|--------|------------|--------------|
| `view_calendar` | View Calendar | Access calendar view of activities | ALL | `view_activities` |
| `view_notifications` | View Notifications | See notification center | ALL | None |
| `view_billing` | View Billing | Access subscription and payment info | E | None |

---

## Flagged Issues

### Overlapping Permissions (Consolidate)

| Current Keys | Recommendation | Reason |
|--------------|----------------|--------|
| `view_attachments` + `view_files` | **Keep `view_files`**, deprecate `view_attachments` | Same functional intent; "files" is clearer |
| `add_attachments` + `upload_files` | **Keep `upload_files`**, deprecate `add_attachments` | Consistent with view_files |
| `edit_attachments` | **Deprecate** | Files are immutable; replace with metadata editing if needed |
| `delete_attachments` + `delete_files` | **Keep `delete_files`**, deprecate `delete_attachments` | Consistent naming |
| `view_finances` + `view_case_financials` | **Keep `view_case_financials`**, rename UI label | More precise scope |
| `add_finances` | **Split** into `add_expenses` + `add_time_entries` | Different audit trails needed |
| `edit_finances` | **Keep as `edit_expenses`** | Time entries are typically immutable |
| `delete_finances` | **Keep as `delete_expenses`** | Matches edit scope |
| `view_cases` | **Split** into `view_assigned_cases` + `view_all_cases` | Different access levels |

### Missing Permissions (Add)

| Key | Intent | Priority |
|-----|--------|----------|
| `view_all_cases` | View all organization cases | HIGH |
| `view_all_financials` | View financials across all cases | HIGH |
| `view_vendors` | See vendor list and details | MEDIUM |
| `view_clients` | See client list and details | MEDIUM |
| `close_cases` | Close cases (distinct from edit) | HIGH |
| `reopen_cases` | Reopen closed cases | HIGH |
| `assign_investigators` | Manage case assignments | HIGH |
| `archive_cases` | Archive old cases | MEDIUM |
| `impersonate_users` | Support user impersonation | LOW |
| `manage_api_keys` | API key management | LOW |
| `manage_roles` | Role definition editing | MEDIUM |
| `manage_billing_settings` | Subscription management | MEDIUM |
| `view_margins` | Profit margin visibility | MEDIUM |
| `add_time_entries` | Time entry creation | HIGH |
| `download_files` | File download permission | HIGH |

### Unclear Scope (Clarify)

| Key | Issue | Resolution |
|-----|-------|------------|
| `view_billing` | Ambiguous - invoices or subscription? | **Split**: `view_invoices` for case billing, `view_billing` for subscription |
| `view_calendar` | Calendar vs activities? | **Keep as-is** - controls calendar UI visibility separately from activity data |
| `view_notifications` | Should this ever be denied? | **Keep but mark as system-level** - rarely restricted |
| `edit_case_requests` | In DB but not UI | **Deprecate** - requests should be approved/declined, not edited |

---

## Master Permission Matrix

### Employee Roles

| Permission | Super Admin | Admin | Manager | Sr. Investigator | Investigator | Billing Clerk |
|------------|:-----------:|:-----:|:-------:|:----------------:|:------------:|:-------------:|
| **CASES** |
| view_assigned_cases | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| view_all_cases | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| add_cases | ✓ | ✓ | ✓ | ✓ | ○ | ○ |
| edit_cases | ✓ | ✓ | ✓ | ✓ | ○ | ○ |
| close_cases | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| reopen_cases | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| delete_cases | ✓ | ✓ | ○ | ○ | ○ | ○ |
| assign_investigators | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| modify_case_status | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| edit_status_dates | ✓ | ✓ | ○ | ○ | ○ | ○ |
| view_exact_status | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| **UPDATES** |
| view_updates | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| add_updates | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| edit_own_updates | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| edit_updates | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| delete_own_updates | ✓ | ✓ | ✓ | ✓ | ○ | ○ |
| delete_updates | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| **FILES** |
| view_files | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| upload_files | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| download_files | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| delete_files | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| manage_folders | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| **FINANCE** |
| view_own_expenses | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| view_case_financials | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| view_all_financials | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| add_expenses | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| add_time_entries | ✓ | ✓ | ✓ | ✓ | ✓ | ○ |
| edit_expenses | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| approve_expenses | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| view_invoices | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| create_invoices | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| edit_invoices | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| send_invoices | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| void_invoices | ✓ | ✓ | ○ | ○ | ○ | ○ |
| view_billing_rates | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| manage_rates | ✓ | ✓ | ○ | ○ | ○ | ○ |
| modify_case_budget | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| view_retainers | ✓ | ✓ | ✓ | ✓ | ○ | ✓ |
| manage_retainers | ✓ | ✓ | ✓ | ○ | ○ | ✓ |
| view_budget_violations | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| **ADMIN** |
| manage_users | ✓ | ✓ | ○ | ○ | ○ | ○ |
| manage_roles | ✓ | ○ | ○ | ○ | ○ | ○ |
| manage_permissions | ✓ | ✓ | ○ | ○ | ○ | ○ |
| manage_company_settings | ✓ | ✓ | ○ | ○ | ○ | ○ |
| manage_billing_settings | ✓ | ○ | ○ | ○ | ○ | ○ |
| view_audit_log | ✓ | ✓ | ○ | ○ | ○ | ○ |
| manage_integrations | ✓ | ✓ | ○ | ○ | ○ | ○ |
| impersonate_users | ✓ | ○ | ○ | ○ | ○ | ○ |
| manage_api_keys | ✓ | ○ | ○ | ○ | ○ | ○ |

**Legend**: ✓ = Allowed by default, ○ = Denied by default

### Client Roles

| Permission | Client Admin | Client Viewer |
|------------|:------------:|:-------------:|
| view_assigned_cases | ✓ | ✓ |
| view_updates | ✓ | ✓ |
| add_updates | ✓ | ○ |
| edit_own_updates | ✓ | ○ |
| view_files | ✓ | ✓ |
| upload_files | ✓ | ○ |
| download_files | ✓ | ✓ |
| view_subjects | ✓ | ✓ |
| view_case_financials | ✓ | ○ |
| view_invoices | ✓ | ○ |
| view_retainers | ✓ | ○ |
| view_reports | ✓ | ✓ |
| generate_reports | ✓ | ○ |
| download_reports | ✓ | ✓ |
| view_contacts | ✓ | ✓ |
| view_activities | ✓ | ✓ |
| view_calendar | ✓ | ✓ |

### Vendor Roles

| Permission | Vendor Manager | Vendor Contact |
|------------|:--------------:|:--------------:|
| view_assigned_cases | ✓ | ✓ |
| view_updates | ✓ | ✓ |
| add_updates | ✓ | ✓ |
| edit_own_updates | ✓ | ✓ |
| view_files | ✓ | ✓ |
| upload_files | ✓ | ✓ |
| download_files | ✓ | ✓ |
| view_subjects | ✓ | ✓ |
| add_expenses | ✓ | ✓ |
| view_own_expenses | ✓ | ✓ |
| add_time_entries | ✓ | ✓ |
| view_activities | ✓ | ✓ |
| add_activities | ✓ | ✓ |
| edit_activities | ✓ | ○ |
| view_reports | ✓ | ○ |
| download_reports | ✓ | ○ |

---

## Implementation Constants

### TypeScript Permission Registry

```typescript
// src/constants/permissions.ts

export const PERMISSION_DOMAINS = {
  CASES: 'cases',
  UPDATES: 'updates',
  FILES: 'files',
  FINANCE: 'finance',
  ADMIN: 'admin',
  REPORTS: 'reports',
  ENTITIES: 'entities',
  INTAKE: 'intake',
  SYSTEM: 'system'
} as const;

export type PermissionDomain = typeof PERMISSION_DOMAINS[keyof typeof PERMISSION_DOMAINS];

export interface PermissionDefinition {
  key: string;
  displayName: string;
  domain: PermissionDomain;
  intent: string;
  userTypes: ('employee' | 'client' | 'vendor' | 'vendor_contact')[];
  dependencies: string[];
  description?: string;
}

export const PERMISSIONS: Record<string, PermissionDefinition> = {
  // CASES
  view_assigned_cases: {
    key: 'view_assigned_cases',
    displayName: 'View Assigned Cases',
    domain: 'cases',
    intent: 'See cases the user is directly assigned to',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: []
  },
  view_all_cases: {
    key: 'view_all_cases',
    displayName: 'View All Cases',
    domain: 'cases',
    intent: 'See all cases in the organization regardless of assignment',
    userTypes: ['employee'],
    dependencies: []
  },
  // ... (74 total permissions)
};
```

### Key Migration Map

For backwards compatibility:

```typescript
export const PERMISSION_ALIASES: Record<string, string> = {
  // Old key → New key
  'view_attachments': 'view_files',
  'add_attachments': 'upload_files',
  'delete_attachments': 'delete_files',
  'view_finances': 'view_case_financials',
  'add_finances': 'add_expenses',
  'edit_finances': 'edit_expenses',
  'delete_finances': 'delete_expenses',
  'view_cases': 'view_assigned_cases'
};
```

---

## Migration Plan

### Phase 1: Add Missing Permissions

```sql
-- Add new permission keys to database
INSERT INTO permissions (role, feature_key, allowed)
SELECT 
  om.role,
  new_key.key,
  CASE 
    WHEN om.role IN ('super_admin', 'admin') THEN true
    WHEN om.role = 'manager' AND new_key.key IN ('view_all_cases', 'close_cases', 'assign_investigators') THEN true
    ELSE false
  END
FROM (SELECT DISTINCT role FROM organization_members) om
CROSS JOIN (
  VALUES 
    ('view_all_cases'),
    ('view_all_financials'),
    ('close_cases'),
    ('reopen_cases'),
    ('assign_investigators'),
    ('download_files'),
    ('add_time_entries'),
    ('view_invoices'),
    ('create_invoices'),
    ('edit_invoices'),
    ('send_invoices'),
    ('void_invoices'),
    ('manage_roles'),
    ('manage_billing_settings'),
    ('manage_integrations'),
    ('impersonate_users'),
    ('manage_api_keys')
) AS new_key(key)
ON CONFLICT (role, feature_key) DO NOTHING;
```

### Phase 2: Consolidate Overlapping Keys

```sql
-- Migrate attachments → files
UPDATE permissions 
SET feature_key = 'view_files' 
WHERE feature_key = 'view_attachments';

UPDATE permissions 
SET feature_key = 'upload_files' 
WHERE feature_key = 'add_attachments';

UPDATE permissions 
SET feature_key = 'delete_files' 
WHERE feature_key = 'delete_attachments';

-- Migrate finances → specific permissions
UPDATE permissions 
SET feature_key = 'view_case_financials' 
WHERE feature_key = 'view_finances';

UPDATE permissions 
SET feature_key = 'add_expenses' 
WHERE feature_key = 'add_finances';

UPDATE permissions 
SET feature_key = 'edit_expenses' 
WHERE feature_key = 'edit_finances';

UPDATE permissions 
SET feature_key = 'delete_expenses' 
WHERE feature_key = 'delete_finances';
```

### Phase 3: Update PermissionsManager.tsx

1. Replace `featureGroups` constant with normalized structure
2. Add missing permissions to UI
3. Remove deprecated keys
4. Update feature group labels

### Phase 4: Update Runtime Checks

1. Create `src/constants/permissions.ts` with full registry
2. Update all `hasPermission()` calls to use normalized keys
3. Add alias resolution for backwards compatibility
4. Add deprecation warnings for old keys in development

### Phase 5: Testing

1. Verify all roles have correct permission assignments
2. Test permission dependencies are enforced
3. Validate Access Group + Permission combinations
4. Audit all UI elements for proper permission gating

---

## Appendix: Permission Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PERMISSION DEPENDENCY GRAPH                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   view_assigned_cases                                                        │
│   ├── view_updates                                                           │
│   │   ├── add_updates                                                       │
│   │   │   ├── edit_own_updates                                              │
│   │   │   │   └── edit_updates                                              │
│   │   │   └── delete_own_updates                                            │
│   │   │       └── delete_updates                                            │
│   ├── view_files                                                             │
│   │   ├── upload_files                                                      │
│   │   │   └── delete_files                                                  │
│   │   ├── download_files                                                    │
│   │   └── manage_folders                                                    │
│   ├── view_subjects                                                          │
│   │   ├── add_subjects                                                      │
│   │   └── edit_subjects                                                     │
│   │       └── delete_subjects                                               │
│   ├── view_activities                                                        │
│   │   ├── add_activities                                                    │
│   │   └── edit_activities                                                   │
│   │       └── delete_activities                                             │
│   ├── view_reports                                                           │
│   │   ├── generate_reports                                                  │
│   │   ├── download_reports                                                  │
│   │   └── view_report_templates                                             │
│   │       └── manage_report_templates                                       │
│   ├── view_exact_status                                                      │
│   └── view_case_financials                                                   │
│       ├── approve_expenses                                                  │
│       ├── modify_case_budget                                                │
│       ├── view_budget_violations                                            │
│       ├── view_retainers                                                    │
│       │   └── manage_retainers                                              │
│       ├── view_invoices                                                     │
│       │   ├── create_invoices                                               │
│       │   │   └── edit_invoices                                             │
│       │   │       ├── send_invoices                                         │
│       │   │       └── void_invoices                                         │
│       └── view_all_financials                                               │
│           └── view_margins                                                  │
│                                                                              │
│   add_cases ─────────────────────────────────────────────────────────┐      │
│   └── edit_cases                                                      │      │
│       ├── close_cases                                                 │      │
│       ├── reopen_cases                                                │      │
│       ├── delete_cases                                                │      │
│       ├── archive_cases                                               │      │
│       ├── assign_investigators                                        │      │
│       └── modify_case_status                                          │      │
│           └── edit_status_dates                                       │      │
│                                                                              │
│   manage_users ──────────────────────────────────────────────────────┐      │
│   ├── manage_roles                                                    │      │
│   └── impersonate_users                                               │      │
│                                                                              │
│   view_billing_rates                                                         │
│   └── manage_rates                                                           │
│                                                                              │
│   view_own_expenses                                                          │
│   ├── add_expenses                                                          │
│   │   └── edit_expenses                                                     │
│   └── add_time_entries                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documents

- [Authorization Model Specification](./authorization-model-specification.md)
- [Role Specification](./role-specification.md)
- [User Type Specification](./user-type-specification.md)
- [Access Group Specification](./access-group-specification.md)
- [Access Resolution Specification](./access-resolution-specification.md)

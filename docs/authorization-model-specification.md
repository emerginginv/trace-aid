# CaseWyze Four-Layer Authorization Model Specification

## Overview

This specification defines the CaseWyze authorization system using a layered security model. Each layer builds upon the previous one, creating a comprehensive access control framework that answers both "Can this user DO this?" and "Can this user SEE this?"

---

## Layer 1: User Types

**Purpose:** The broadest classification that determines which roles are available to a user and establishes their fundamental relationship with the organization.

| User Type | Description | Available Roles | Organization Relationship |
|-----------|-------------|-----------------|---------------------------|
| **Employee** | Internal staff members who work directly for the investigation firm | Admin, Manager, Investigator | Full organization member with direct employment |
| **Client** | External customers who commission investigations and receive services | Client Admin, Client User | Associated via Accounts; limited platform access for case requests and report viewing |
| **Vendor** | Subcontracted investigation companies or independent contractors | Vendor Admin, Vendor Investigator | Associated via Vendor entity; case-specific access only |
| **Vendor Contact** | Individual staff members working for a Vendor company | Vendor Contact | Inherits access through parent Vendor; restricted to assigned work |

### CaseWyze Examples

- **Employee**: A full-time investigator employed by the firm, accessing all cases they're assigned to
- **Client**: An insurance company adjuster who submits case requests and views final reports
- **Vendor**: A surveillance subcontractor company engaged for overflow work
- **Vendor Contact**: The individual doing fieldwork for the subcontractor on a specific case

---

## Layer 2: Roles

**Purpose:** Named permission bundles assigned to users within their User Type. Each role has a RANK (integer) that establishes authority hierarchy.

### Employee Roles

| Role | Rank | Description | Authority Scope |
|------|------|-------------|-----------------|
| **Admin** | 100 | Full system access, user management, billing, settings | Can manage all lower-ranked users |
| **Manager** | 75 | Case oversight, client management, team supervision | Can manage Investigators; cannot modify Admin settings |
| **Investigator** | 50 | Fieldwork, case documentation, assigned case access | Can only modify own work; no user management |

### Client Roles

| Role | Rank | Description | Authority Scope |
|------|------|-------------|-----------------|
| **Client Admin** | 40 | Account management, user invites within their company | Manages Client Users for their Account |
| **Client User** | 30 | View cases, submit requests, download reports | Read-only plus case request submission |

### Vendor Roles

| Role | Rank | Description | Authority Scope |
|------|------|-------------|-----------------|
| **Vendor Admin** | 35 | Manage vendor company users, view all assigned cases | Manages Vendor Contacts for their Vendor entity |
| **Vendor Investigator** | 25 | Assigned case work, update submission | Work on specifically assigned cases only |

### Vendor Contact Roles

| Role | Rank | Description | Authority Scope |
|------|------|-------------|-----------------|
| **Vendor Contact** | 20 | Individual worker for a vendor company | Assigned task completion only |

### Rank Rule

Users can only manage (create, edit, deactivate) users with roles ranked BELOW their own rank.

### CaseWyze Examples

- An Admin (rank 100) can demote a Manager (rank 75) to Investigator (rank 50)
- A Manager (rank 75) cannot promote an Investigator (rank 50) to Admin (rank 100)
- A Client Admin (rank 40) can invite new Client Users (rank 30) to their account
- A Vendor Admin (rank 35) cannot modify any Employee roles

---

## Layer 3: Permissions

**Purpose:** Atomic boolean toggles that control specific actions. Permissions answer: "Can this user DO this action?"

### Permission Domains

| Domain | Description | Example Permissions |
|--------|-------------|---------------------|
| **Cases** | Case lifecycle management | `view_cases`, `add_cases`, `edit_cases`, `delete_cases`, `close_cases` |
| **Updates** | Investigation progress documentation | `view_updates`, `add_updates`, `edit_updates`, `edit_own_updates`, `delete_updates` |
| **Subjects** | Subject/person of interest data | `view_subjects`, `add_subjects`, `edit_subjects`, `view_subject_ssn` |
| **Finance** | Billing, expenses, time tracking | `view_finances`, `add_finances`, `edit_finances`, `view_billing_rates` |
| **Attachments** | Files, evidence, documents | `view_attachments`, `add_attachments`, `delete_attachments` |
| **Administration** | System and user management | `manage_users`, `manage_permissions`, `view_audit_logs` |
| **Reports** | Generated case reports | `view_reports`, `generate_reports`, `export_reports` |

### Permission Characteristics

1. **Permissions are action-focused** - They control WHAT a user can do, not WHAT they can see
2. **Permissions are role-bound** - Each role has a predefined set of permissions
3. **Permissions are toggle-based** - Either allowed (true) or denied (false)
4. **Permissions can be granular** - `edit_updates` vs `edit_own_updates` allows scoping

### CaseWyze Examples

- An Investigator with `add_updates` permission can create new case updates
- A Vendor with `view_subjects` = false cannot see any subject information, even on assigned cases
- A Manager with `edit_own_updates` but not `edit_updates` can only modify their own entries

### Default Permission Matrix (Current State Reference)

| Permission | Admin | Manager | Investigator | Vendor |
|------------|:-----:|:-------:|:------------:|:------:|
| view_cases | ✓ | ✓ | ✓ | ✓ |
| add_cases | ✓ | ✓ | ✗ | ✗ |
| view_finances | ✓ | ✓ | Per config | ✗ |
| view_subject_ssn | ✓ | ✓ | ✗ | ✗ |
| manage_users | ✓ | ✗ | ✗ | ✗ |

---

## Layer 4: Access Groups

**Purpose:** Visibility containers attached to content (updates, files, documents) that control WHO can see specific items. Access Groups answer: "Can this user SEE this content?"

### Access Group Types

| Group Name | Description | Typical Members |
|------------|-------------|-----------------|
| **Internal Only** | Visible only to organization employees | Admin, Manager, Investigator |
| **Management** | Visible to management tier and above | Admin, Manager |
| **Case Team** | Visible to anyone assigned to the case | Case-assigned Employees + assigned Vendors |
| **Client Visible** | Safe for client viewing (report-ready) | Case Team + associated Client users |
| **Vendor Restricted** | Excludes vendor access | Internal Only minus Vendors |
| **Public** | Accessible without authentication | Unauthenticated users (for case request forms) |

### Access Group Behavior

1. **Content declares its Access Group at creation time** - When a user adds an update or uploads a file, they select the visibility level
2. **Users see content only if they belong to the content's Access Group AND have the relevant view permission**
3. **Access Groups are immutable after creation** - Changing visibility requires explicit action with audit logging
4. **Default Access Groups are set by content type** - e.g., financial entries default to "Management"

### CaseWyze Examples

**Example 1: Case Update Visibility**
```
Update: "Subject observed entering location at 14:32"
Access Group: "Case Team"

Result:
- Investigator (assigned to case): CAN SEE (in Case Team + has view_updates)
- Vendor (assigned to case): CAN SEE (in Case Team + has view_updates)
- Manager (not assigned): CAN SEE (Managers see all within org)
- Client User: CANNOT SEE (not in Case Team)
```

**Example 2: Financial Entry Visibility**
```
Entry: "Travel expense: $245 mileage reimbursement"
Access Group: "Management"

Result:
- Admin: CAN SEE (in Management + has view_finances)
- Manager: CAN SEE (in Management + has view_finances)
- Investigator: CANNOT SEE (not in Management group)
- Vendor: CANNOT SEE (not in Management + no view_finances permission)
```

**Example 3: Attachment with Dual Check**
```
File: "Surveillance_Video_01.mp4"
Access Group: "Vendor Restricted"

Result:
- Investigator (assigned): CAN SEE (in Vendor Restricted + has view_attachments)
- Vendor (assigned): CANNOT SEE (excluded from Vendor Restricted group)
```

---

## Effective Access Formula

A user can perform an action on content **IF AND ONLY IF** all four conditions are met:

```
(User Type allows the Role)
  AND
(Role includes the Permission for the action)
  AND
(User is member of content's Access Group)
  AND
(Organization/Tenant isolation is satisfied)
```

### Evaluation Order

1. **User Type Check** - Is this user type allowed to have this role?
2. **Role Rank Check** - For user management actions, does the actor outrank the target?
3. **Permission Check** - Does the user's role include this permission?
4. **Access Group Check** - Is the user a member of the content's visibility group?
5. **Tenant Isolation** - Is this content within the user's organization?

---

## Architectural Boundaries

### What Each Layer Controls

| Layer | Controls | Does NOT Control |
|-------|----------|------------------|
| User Type | Role availability, external vs internal classification | Specific permissions, content visibility |
| Role | Permission bundles, authority rank | Individual permission toggles, content-level access |
| Permission | Action authorization (CRUD operations) | Content visibility, user type assignment |
| Access Group | Content visibility (who sees what) | Action authorization, role assignment |

### Security Principles

1. **Deny by Default** - Access is denied unless explicitly granted at all layers
2. **Least Privilege** - Users receive minimum access needed for their function
3. **Separation of Concerns** - Visibility (Access Groups) is separate from Actions (Permissions)
4. **Audit Everything** - All access decisions are logged with actor, action, target, and result

---

## Implementation Notes

This specification documents the authorization MODEL only. It does not modify:
- Existing database tables or RLS policies
- Current UI components or workflows
- Frontend permission checking logic

### Current State Reference

The current CaseWyze implementation partially implements this model:
- **User Types**: Currently implicit (Employee roles exist; Client/Vendor are role-based)
- **Roles**: Implemented via `app_role` enum (admin, manager, investigator, vendor)
- **Permissions**: Implemented via `permissions` table with feature_key/allowed toggles
- **Access Groups**: Partially implemented via role-based visibility; not yet content-attached

This document serves as the target architecture for authorization evolution.

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-18 | 1.0 | System | Initial specification |

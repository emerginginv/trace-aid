# CaseWyze Access Resolution Specification

> **Version**: 1.0  
> **Last Updated**: 2026-01-18  
> **Status**: Approved  
> **Related Documents**: [Authorization Model](./authorization-model-specification.md), [Access Groups](./access-group-specification.md), [Roles](./role-specification.md)

## Table of Contents

1. [Overview](#1-overview)
2. [VIEW Resolution Algorithm](#2-view-resolution-algorithm)
3. [ACTION Resolution Algorithm](#3-action-resolution-algorithm)
4. [Step-by-Step Evaluation Details](#4-step-by-step-evaluation-details)
5. [Complete Edge Case Catalog](#5-complete-edge-case-catalog)
6. [Resolution Functions (TypeScript)](#6-resolution-functions-typescript)
7. [Database Helper Functions (SQL)](#7-database-helper-functions-sql)
8. [Flowchart Diagrams](#8-flowchart-diagrams)
9. [Audit Logging Requirements](#9-audit-logging-requirements)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Overview

The Access Resolution Engine is the runtime component that evaluates every access request in CaseWyze. It implements deterministic logic based on the four-layer authorization model:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCESS RESOLUTION ENGINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Layer 1: User Types        → Defines capability boundaries     │
│   Layer 2: Roles            → Grants specific permissions        │
│   Layer 3: Case Assignment  → Limits data scope                  │
│   Layer 4: Access Groups    → Controls content visibility        │
│                                                                  │
│   All layers are evaluated. ALL must pass for access.           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 Request Types

The engine handles two distinct request types:

| Request Type | Description | Failure Behavior |
|--------------|-------------|------------------|
| **VIEW** | Can user SEE this content? | 403 or Hidden (silent) |
| **ACTION** | Can user PERFORM this operation? | 403 Forbidden |

### 1.2 Resolution Principles

1. **Deterministic**: Same inputs always produce same outputs
2. **Fail-Closed**: Ambiguous cases result in denial
3. **Audit Everything**: All denials are logged
4. **Graceful Degradation**: Hide content rather than error when appropriate

---

## 2. VIEW Resolution Algorithm

When a user attempts to VIEW content (updates, files, documents, etc.):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         VIEW CONTENT RESOLUTION                                  │
│                      (Updates, Files, Documents)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   INPUT: user_id, content_id, content_type, case_id                             │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ STEP 1: CASE ACCESS CHECK                                                │   │
│   │                                                                          │   │
│   │   A. Is user directly assigned to this case?                            │   │
│   │      └── Check case_investigators table                                  │   │
│   │                                                                          │   │
│   │   B. Is user assigned via Vendor?                                       │   │
│   │      └── Check case_vendors → vendor_contacts chain                     │   │
│   │                                                                          │   │
│   │   C. Is user a Client linked to case's Account?                         │   │
│   │      └── Check contacts → accounts → cases.account_id                   │   │
│   │                                                                          │   │
│   │   D. Does user have "View All Cases" permission?                        │   │
│   │      └── Check permissions table for view_all_cases                     │   │
│   │                                                                          │   │
│   │   IF (A OR B OR C OR D) = FALSE                                         │   │
│   │   └── RETURN 403 FORBIDDEN                                               │   │
│   │       (User should not know this case exists)                            │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓ PASS                                        │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ STEP 2: ACCESS GROUP MEMBERSHIP CHECK                                    │   │
│   │                                                                          │   │
│   │   Get content.access_group                                               │   │
│   │                                                                          │   │
│   │   Evaluate membership based on user's type and role:                    │   │
│   │   ┌────────────────────────────────────────────────────────────────┐    │   │
│   │   │ admin_only       → role IN (super_admin, admin)                │    │   │
│   │   │ internal         → user_type = 'employee'                      │    │   │
│   │   │ public           → TRUE (already passed case access)           │    │   │
│   │   │ client_only      → user_type IN (employee, client)             │    │   │
│   │   │ vendor_only      → user_type IN (employee, vendor, vendor_cnt) │    │   │
│   │   │ validation_req   → role IN (super_admin, admin, case_manager)  │    │   │
│   │   │                    OR content.validation_status = 'approved'   │    │   │
│   │   └────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   │   IF NOT member                                                          │   │
│   │   └── RETURN HIDDEN (content filtered from results, no error shown)     │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓ PASS                                        │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ STEP 3: VIEW PERMISSION CHECK                                            │   │
│   │                                                                          │   │
│   │   Map content_type to required permission:                              │   │
│   │   ┌────────────────────────────────────────────────────────────────┐    │   │
│   │   │ updates       → view_updates                                   │    │   │
│   │   │ files         → view_files                                     │    │   │
│   │   │ financials    → view_financials                                │    │   │
│   │   │ subjects      → view_subjects                                  │    │   │
│   │   │ reports       → view_reports                                   │    │   │
│   │   │ activities    → view_activities                                │    │   │
│   │   │ invoices      → view_invoices                                  │    │   │
│   │   └────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   │   Check: does user.role have this permission?                           │   │
│   │                                                                          │   │
│   │   IF NOT has_permission                                                  │   │
│   │   └── RETURN HIDDEN (content filtered, no error)                        │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓ PASS                                        │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ RESULT: CONTENT VISIBLE                                                  │   │
│   │                                                                          │   │
│   │   Content is included in query results and displayed to user.           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 VIEW Resolution Key Behaviors

| Failure Point | HTTP Response | UI Behavior | Rationale |
|---------------|---------------|-------------|-----------|
| Case Access | 403 Forbidden | Error page / redirect | User shouldn't know case exists |
| Access Group | None (filter) | Content not shown | User knows case but not this content |
| Permission | None (filter) | Content not shown | User lacks feature access |

### 2.2 VIEW Resolution Pseudocode

```typescript
function resolveViewAccess(
  userId: string,
  contentId: string,
  contentType: ContentType,
  caseId: string
): ViewResolution {
  
  // STEP 1: Case Access
  const hasCaseAccess = await checkCaseAccess(userId, caseId);
  if (!hasCaseAccess) {
    return {
      allowed: false,
      reason: 'no_case_access',
      httpStatus: 403
    };
  }
  
  // STEP 2: Access Group Membership
  const content = await getContent(contentId, contentType);
  const isMember = await isAccessGroupMember(userId, content.access_group, caseId);
  if (!isMember) {
    return {
      allowed: false,
      reason: 'access_group_denied',
      // No HTTP status - content is silently filtered
    };
  }
  
  // STEP 3: View Permission
  const permission = getViewPermission(contentType);
  const hasPermission = await checkPermission(userId, permission);
  if (!hasPermission) {
    return {
      allowed: false,
      reason: 'permission_denied',
      // No HTTP status - content is silently filtered
    };
  }
  
  return {
    allowed: true,
    reason: 'visible'
  };
}
```

---

## 3. ACTION Resolution Algorithm

When a user attempts to PERFORM an action (create, edit, delete):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ACTION RESOLUTION                                        │
│                  (Create, Edit, Delete Operations)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   INPUT: user_id, action, case_id, target_id?, target_access_group?             │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ STEP 1: CASE ACCESS CHECK                                                │   │
│   │                                                                          │   │
│   │   Same logic as VIEW Step 1                                              │   │
│   │                                                                          │   │
│   │   IF NOT has_case_access                                                 │   │
│   │   └── RETURN 403 FORBIDDEN                                               │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓ PASS                                        │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ STEP 2: ACTION PERMISSION CHECK                                          │   │
│   │                                                                          │   │
│   │   Map action to required permission:                                     │   │
│   │   ┌────────────────────────────────────────────────────────────────┐    │   │
│   │   │ create_update    → add_updates                                 │    │   │
│   │   │ edit_update      → edit_updates OR edit_own_updates            │    │   │
│   │   │ delete_update    → delete_updates                              │    │   │
│   │   │ upload_file      → upload_files                                │    │   │
│   │   │ download_file    → download_files                              │    │   │
│   │   │ delete_file      → delete_files                                │    │   │
│   │   │ submit_expense   → add_expenses                                │    │   │
│   │   │ approve_expense  → approve_expenses                            │    │   │
│   │   │ generate_report  → generate_reports                            │    │   │
│   │   │ create_invoice   → create_invoices                             │    │   │
│   │   │ approve_invoice  → approve_invoices                            │    │   │
│   │   └────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   │   IF NOT has_permission                                                  │   │
│   │   └── RETURN 403 FORBIDDEN                                               │   │
│   │       UI: Button disabled or hidden                                      │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓ PASS                                        │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ STEP 3: OWNERSHIP/RANK CHECK (edit/delete only)                          │   │
│   │                                                                          │   │
│   │   SKIP if action = 'create'                                              │   │
│   │                                                                          │   │
│   │   Get content.created_by and creator's rank                             │   │
│   │   Get current user's rank                                                │   │
│   │                                                                          │   │
│   │   ALLOWED IF ANY:                                                        │   │
│   │   ┌────────────────────────────────────────────────────────────────┐    │   │
│   │   │ A. user_id = content.created_by                                │    │   │
│   │   │    (User is the owner/creator)                                 │    │   │
│   │   │                                                                │    │   │
│   │   │ B. user.rank > creator.rank                                    │    │   │
│   │   │    (User outranks the creator)                                 │    │   │
│   │   │                                                                │    │   │
│   │   │ C. user.has_permission('edit_others_content')                  │    │   │
│   │   │    (User has explicit override permission)                     │    │   │
│   │   └────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   │   IF NOT (A OR B OR C)                                                   │   │
│   │   └── RETURN 403 FORBIDDEN                                               │   │
│   │       Message: "You can only edit your own content"                      │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓ PASS                                        │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ STEP 4: ACCESS GROUP WRITE RULES (create/edit only)                      │   │
│   │                                                                          │   │
│   │   SKIP if action = 'delete'                                              │   │
│   │                                                                          │   │
│   │   Get target access_group (new content or modified content)             │   │
│   │                                                                          │   │
│   │   Check: Can user's type/role post to this Access Group?                │   │
│   │   ┌────────────────────────────────────────────────────────────────┐    │   │
│   │   │ admin_only       → role IN (super_admin, admin)                │    │   │
│   │   │ internal         → user_type = 'employee'                      │    │   │
│   │   │ public           → ANY authenticated user with case access     │    │   │
│   │   │ client_only      → user_type IN (employee, client)             │    │   │
│   │   │ vendor_only      → user_type IN (employee, vendor, vendor_cnt) │    │   │
│   │   │ validation_req   → ANY (content will be reviewed)              │    │   │
│   │   └────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   │   UI BEHAVIOR:                                                           │   │
│   │   - Unavailable Access Groups are hidden from dropdown                   │   │
│   │   - If attempted via API: RETURN 403 FORBIDDEN                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓ PASS                                        │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ RESULT: ACTION ALLOWED                                                   │   │
│   │                                                                          │   │
│   │   Proceed with the requested operation.                                  │   │
│   │   Log successful action to audit trail.                                  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 ACTION Resolution Key Behaviors

| Failure Point | HTTP Response | UI Behavior | Message |
|---------------|---------------|-------------|---------|
| Case Access | 403 Forbidden | Redirect to cases list | "Case not found" |
| Action Permission | 403 Forbidden | Button hidden/disabled | "Permission denied" |
| Ownership/Rank | 403 Forbidden | Edit button hidden | "You can only edit your own content" |
| Access Group Write | 403 Forbidden | Option hidden from dropdown | "Invalid access group" |

### 3.2 ACTION Resolution Pseudocode

```typescript
function resolveActionAccess(
  userId: string,
  action: Action,
  caseId: string,
  targetId?: string,
  targetAccessGroup?: AccessGroup
): ActionResolution {
  
  // STEP 1: Case Access
  const hasCaseAccess = await checkCaseAccess(userId, caseId);
  if (!hasCaseAccess) {
    return {
      allowed: false,
      reason: 'no_case_access',
      httpStatus: 403,
      uiHint: 'hidden'
    };
  }
  
  // STEP 2: Action Permission
  const permission = getActionPermission(action);
  const hasPermission = await checkPermission(userId, permission);
  if (!hasPermission) {
    return {
      allowed: false,
      reason: 'permission_denied',
      httpStatus: 403,
      uiHint: 'disabled'
    };
  }
  
  // STEP 3: Ownership/Rank (edit/delete only)
  if (action.startsWith('edit_') || action.startsWith('delete_')) {
    const canModify = await checkOwnershipOrRank(userId, targetId);
    if (!canModify) {
      return {
        allowed: false,
        reason: 'ownership_denied',
        httpStatus: 403,
        uiHint: 'hidden'
      };
    }
  }
  
  // STEP 4: Access Group Write Rules (create/edit only)
  if (action.startsWith('create_') || action.startsWith('edit_')) {
    const canWriteToGroup = await checkAccessGroupWritePermission(
      userId, 
      targetAccessGroup
    );
    if (!canWriteToGroup) {
      return {
        allowed: false,
        reason: 'access_group_denied',
        httpStatus: 403,
        uiHint: 'hidden'
      };
    }
  }
  
  return {
    allowed: true,
    reason: 'allowed',
    uiHint: 'enabled'
  };
}
```

---

## 4. Step-by-Step Evaluation Details

### 4.1 Case Access Check (Step 1)

The Case Access check determines if the user has any legitimate connection to the case:

```typescript
async function checkCaseAccess(userId: string, caseId: string): Promise<boolean> {
  // A. Direct assignment as investigator
  const isDirectAssignment = await supabase
    .from('case_investigators')
    .select('id')
    .eq('case_id', caseId)
    .eq('investigator_id', userId)
    .maybeSingle();
  
  if (isDirectAssignment.data) return true;
  
  // B. Assignment via Vendor
  const isVendorAssignment = await supabase
    .from('case_vendors')
    .select(`
      id,
      vendor:vendors!inner(
        vendor_contacts!inner(user_id)
      )
    `)
    .eq('case_id', caseId)
    .eq('vendor.vendor_contacts.user_id', userId)
    .maybeSingle();
  
  if (isVendorAssignment.data) return true;
  
  // C. Client linked to case's Account
  const isClientLink = await supabase
    .from('cases')
    .select(`
      id,
      account:accounts!inner(
        contacts!inner(user_id)
      )
    `)
    .eq('id', caseId)
    .eq('account.contacts.user_id', userId)
    .maybeSingle();
  
  if (isClientLink.data) return true;
  
  // D. Has "View All Cases" permission
  const hasViewAllCases = await checkPermission(userId, 'view_all_cases');
  
  return hasViewAllCases;
}
```

### 4.2 Access Group Membership Check (Step 2)

```typescript
function isAccessGroupMember(
  userId: string,
  accessGroup: AccessGroup,
  userType: UserType,
  role: AppRole,
  validationStatus?: string
): boolean {
  switch (accessGroup) {
    case 'admin_only':
      return role === 'super_admin' || role === 'admin';
      
    case 'internal':
      return userType === 'employee';
      
    case 'public':
      return true; // Already passed case access check
      
    case 'client_only':
      return userType === 'employee' || userType === 'client';
      
    case 'vendor_only':
      return userType === 'employee' || 
             userType === 'vendor' || 
             userType === 'vendor_contact';
      
    case 'validation_required':
      // Validators can always see, others only if approved
      if (['super_admin', 'admin', 'case_manager'].includes(role)) {
        return true;
      }
      return validationStatus === 'approved';
      
    default:
      return false;
  }
}
```

### 4.3 Ownership/Rank Check (Step 3)

```typescript
async function checkOwnershipOrRank(
  userId: string,
  contentId: string
): Promise<boolean> {
  // Get content creator info
  const content = await getContent(contentId);
  const creatorRank = await getUserRank(content.created_by);
  const userRank = await getUserRank(userId);
  
  // A. Is owner?
  if (content.created_by === userId) {
    return true;
  }
  
  // B. Outranks creator?
  if (userRank > creatorRank) {
    return true;
  }
  
  // C. Has override permission?
  const hasOverride = await checkPermission(userId, 'edit_others_content');
  if (hasOverride) {
    return true;
  }
  
  return false;
}

// Rank values from role-specification.md
const RANK_VALUES: Record<string, number> = {
  super_admin: 100,
  admin: 90,
  case_manager: 70,
  senior_investigator: 50,
  investigator: 40,
  billing_clerk: 30,
  client_admin: 20,
  client_contact: 15,
  client_viewer: 10,
  vendor_admin: 20,
  vendor_investigator: 15
};
```

### 4.4 Access Group Write Permission (Step 4)

```typescript
function canWriteToAccessGroup(
  accessGroup: AccessGroup,
  userType: UserType,
  role: AppRole
): boolean {
  switch (accessGroup) {
    case 'admin_only':
      return role === 'super_admin' || role === 'admin';
      
    case 'internal':
      return userType === 'employee';
      
    case 'public':
      return true; // Any authenticated user
      
    case 'client_only':
      return userType === 'employee' || userType === 'client';
      
    case 'vendor_only':
      return userType === 'employee' || 
             userType === 'vendor' || 
             userType === 'vendor_contact';
      
    case 'validation_required':
      return true; // Anyone can submit for validation
      
    default:
      return false;
  }
}

// Get available access groups for dropdown
function getAvailableAccessGroups(
  userType: UserType,
  role: AppRole
): AccessGroup[] {
  const allGroups: AccessGroup[] = [
    'admin_only',
    'internal', 
    'public',
    'client_only',
    'vendor_only',
    'validation_required'
  ];
  
  return allGroups.filter(group => 
    canWriteToAccessGroup(group, userType, role)
  );
}
```

---

## 5. Complete Edge Case Catalog

| # | Scenario | User | Content | Steps Evaluated | Result | UI Behavior |
|---|----------|------|---------|-----------------|--------|-------------|
| 1 | Investigator uploads file, Access Group = ADMIN ONLY | Investigator (rank 40) | New file | Case ✓, Perm ✓, AG Write ✓ | **File saved** | Confirmation shown, file disappears from their view |
| 2 | Client views update with Access Group = INTERNAL | Client Contact | Update | Case ✓, AG ✗ | **Hidden** | Update not shown in list, no error |
| 3 | Vendor tries to view unassigned case | Vendor Investigator | Case | Case ✗ | **403 Forbidden** | Case not in list, direct URL returns error |
| 4 | Admin views content in any Access Group | Admin | Any | All ✓ | **Visible** | Full access to all content |
| 5 | Investigator edits own update | Investigator | Own update | Case ✓, Perm ✓, Owner ✓ | **Allowed** | Edit button visible and functional |
| 6 | Investigator edits Case Manager's update | Investigator (rank 40) | Manager's update (rank 70) | Case ✓, Perm ✓, Owner ✗, Rank ✗ | **403 Forbidden** | Edit button hidden |
| 7 | Case Manager edits Investigator's update | Case Manager (rank 70) | Investigator's update (rank 40) | Case ✓, Perm ✓, Rank ✓ | **Allowed** | Edit button visible |
| 8 | Client Admin tries to add INTERNAL update | Client Admin | New update | Case ✓, Perm ✓, AG Write ✗ | **Option hidden** | INTERNAL not in dropdown |
| 9 | Billing Clerk tries to add case update | Billing Clerk | New update | Case ✓, Perm ✗ | **403 Forbidden** | Add Update button hidden |
| 10 | Vendor sees pending validation content | Vendor Investigator | Pending content | Case ✓, AG ✗ | **Hidden** | Content not visible until validated |
| 11 | Case Manager sees pending validation | Case Manager | Pending content | Case ✓, AG ✓ (is validator) | **Visible** | Can view, approve, or reject |
| 12 | Senior Investigator deletes file | Senior Investigator | File | Case ✓, Perm ✗ (delete_files) | **403 Forbidden** | Delete button hidden |
| 13 | Client Viewer downloads report | Client Viewer | Report | Case ✓, AG ✓, Perm ✓ | **Allowed** | Download button works |
| 14 | Client Viewer tries to add update | Client Viewer | New update | Case ✓, Perm ✗ (add_updates) | **403 Forbidden** | Add Update form not shown |
| 15 | Admin edits locked/invoiced content | Admin | Locked content | Case ✓, Perm ✓, Lock check | **Blocked** | Edit disabled with "Content locked" message |
| 16 | Investigator views file they uploaded to ADMIN ONLY | Investigator | Own file, admin_only | Case ✓, AG ✗ | **Hidden** | File not visible despite ownership |
| 17 | Super Admin changes any Access Group | Super Admin | Any content | All ✓ | **Allowed** | All options available |
| 18 | Client tries to view vendor-only update | Client Contact | Vendor-only update | Case ✓, AG ✗ | **Hidden** | Update not shown |
| 19 | Vendor tries to view client-only update | Vendor Investigator | Client-only update | Case ✓, AG ✗ | **Hidden** | Update not shown |
| 20 | Unassigned employee with view_all_cases | Sr. Investigator | Any case | Case ✓ (perm), AG ✓ (employee) | **Visible** | Can view but may not edit |

### 5.1 Special Edge Cases

#### Post-Upload Invisibility
When a user uploads content to an Access Group they're not a member of:

```
SCENARIO: Investigator uploads file with access_group = 'admin_only'

FLOW:
1. Investigator has case access                    ✓
2. Investigator has upload_files permission        ✓
3. Investigator CAN write to admin_only            ✓ (write rules allow)
4. File is saved successfully
5. UI shows: "File uploaded successfully"
6. Investigator refreshes page
7. VIEW check: Is Investigator in admin_only?      ✗
8. File is hidden from Investigator

RESULT: File exists but uploader cannot see it. This is intentional.
        Only Admins can view and manage the file.
```

#### Validation Required Workflow
```
SCENARIO: Update marked as validation_required

PHASE 1 - PENDING:
- validation_status = 'pending'
- Visible to: Super Admin, Admin, Case Manager
- Hidden from: All other users
- No "Last Activity" refresh

PHASE 2 - APPROVED:
- Validator approves, validation_status = 'approved'
- access_group changes to validation_target_group
- Now visible per target group's rules
- "Last Activity" refreshes (if group allows)

PHASE 3 - REJECTED:
- Validator rejects, validation_status = 'rejected'
- Content remains hidden or is deleted
- Audit log records rejection
```

---

## 6. Resolution Functions (TypeScript)

### 6.1 Core Types

```typescript
// Resolution result types
export interface ViewResolution {
  allowed: boolean;
  reason: 'visible' | 'no_case_access' | 'access_group_denied' | 'permission_denied';
  httpStatus?: 403;
}

export interface ActionResolution {
  allowed: boolean;
  reason: 'allowed' | 'no_case_access' | 'permission_denied' | 'ownership_denied' | 'access_group_denied' | 'content_locked';
  httpStatus?: 403;
  uiHint: 'enabled' | 'disabled' | 'hidden';
  message?: string;
}

// Content types that can be viewed
export type ContentType = 
  | 'updates' 
  | 'files' 
  | 'financials' 
  | 'subjects' 
  | 'reports' 
  | 'activities'
  | 'invoices';

// Actions that can be performed
export type Action =
  | 'create_update'
  | 'edit_update'
  | 'delete_update'
  | 'upload_file'
  | 'download_file'
  | 'delete_file'
  | 'submit_expense'
  | 'approve_expense'
  | 'generate_report'
  | 'create_invoice'
  | 'approve_invoice'
  | 'assign_investigator'
  | 'change_case_status';

// Access groups
export type AccessGroup =
  | 'admin_only'
  | 'internal'
  | 'public'
  | 'client_only'
  | 'vendor_only'
  | 'validation_required';
```

### 6.2 Permission Mapping

```typescript
// Map content types to view permissions
const VIEW_PERMISSION_MAP: Record<ContentType, string> = {
  updates: 'view_updates',
  files: 'view_files',
  financials: 'view_financials',
  subjects: 'view_subjects',
  reports: 'view_reports',
  activities: 'view_activities',
  invoices: 'view_invoices'
};

// Map actions to required permissions
const ACTION_PERMISSION_MAP: Record<Action, string> = {
  create_update: 'add_updates',
  edit_update: 'edit_updates',
  delete_update: 'delete_updates',
  upload_file: 'upload_files',
  download_file: 'download_files',
  delete_file: 'delete_files',
  submit_expense: 'add_expenses',
  approve_expense: 'approve_expenses',
  generate_report: 'generate_reports',
  create_invoice: 'create_invoices',
  approve_invoice: 'approve_invoices',
  assign_investigator: 'manage_assignments',
  change_case_status: 'manage_case_status'
};
```

### 6.3 Main Resolution Functions

```typescript
/**
 * Resolve VIEW access for content
 */
export async function resolveViewAccess(
  userId: string,
  contentId: string,
  contentType: ContentType,
  caseId: string
): Promise<ViewResolution> {
  // Step 1: Case Access
  const hasCaseAccess = await checkCaseAccess(userId, caseId);
  if (!hasCaseAccess) {
    await logAccessDenial(userId, 'view', contentId, 'no_case_access', 1);
    return { allowed: false, reason: 'no_case_access', httpStatus: 403 };
  }
  
  // Step 2: Access Group
  const content = await getContentWithAccessGroup(contentId, contentType);
  const userContext = await getUserContext(userId);
  const isMember = isAccessGroupMember(
    content.access_group,
    userContext.userType,
    userContext.role,
    content.validation_status
  );
  if (!isMember) {
    await logAccessDenial(userId, 'view', contentId, 'access_group_denied', 2);
    return { allowed: false, reason: 'access_group_denied' };
  }
  
  // Step 3: View Permission
  const permission = VIEW_PERMISSION_MAP[contentType];
  const hasPermission = await checkPermission(userId, permission);
  if (!hasPermission) {
    await logAccessDenial(userId, 'view', contentId, 'permission_denied', 3);
    return { allowed: false, reason: 'permission_denied' };
  }
  
  return { allowed: true, reason: 'visible' };
}

/**
 * Resolve ACTION access for operations
 */
export async function resolveActionAccess(
  userId: string,
  action: Action,
  caseId: string,
  targetId?: string,
  targetAccessGroup?: AccessGroup
): Promise<ActionResolution> {
  // Step 1: Case Access
  const hasCaseAccess = await checkCaseAccess(userId, caseId);
  if (!hasCaseAccess) {
    await logAccessDenial(userId, action, targetId || caseId, 'no_case_access', 1);
    return {
      allowed: false,
      reason: 'no_case_access',
      httpStatus: 403,
      uiHint: 'hidden'
    };
  }
  
  // Step 2: Action Permission
  const permission = ACTION_PERMISSION_MAP[action];
  const hasPermission = await checkPermission(userId, permission);
  if (!hasPermission) {
    await logAccessDenial(userId, action, targetId || caseId, 'permission_denied', 2);
    return {
      allowed: false,
      reason: 'permission_denied',
      httpStatus: 403,
      uiHint: 'disabled',
      message: 'You do not have permission to perform this action'
    };
  }
  
  // Step 3: Ownership/Rank (edit/delete only)
  if (targetId && (action.includes('edit') || action.includes('delete'))) {
    const canModify = await checkOwnershipOrRank(userId, targetId);
    if (!canModify) {
      await logAccessDenial(userId, action, targetId, 'ownership_denied', 3);
      return {
        allowed: false,
        reason: 'ownership_denied',
        httpStatus: 403,
        uiHint: 'hidden',
        message: 'You can only modify your own content or content from lower-ranked users'
      };
    }
    
    // Also check if content is locked
    const isLocked = await isContentLocked(targetId);
    if (isLocked) {
      return {
        allowed: false,
        reason: 'content_locked',
        httpStatus: 403,
        uiHint: 'disabled',
        message: 'This content is locked and cannot be modified'
      };
    }
  }
  
  // Step 4: Access Group Write Rules (create/edit only)
  if (targetAccessGroup && (action.includes('create') || action.includes('edit'))) {
    const userContext = await getUserContext(userId);
    const canWrite = canWriteToAccessGroup(
      targetAccessGroup,
      userContext.userType,
      userContext.role
    );
    if (!canWrite) {
      await logAccessDenial(userId, action, targetId || caseId, 'access_group_denied', 4);
      return {
        allowed: false,
        reason: 'access_group_denied',
        httpStatus: 403,
        uiHint: 'hidden',
        message: 'You cannot post content to this access group'
      };
    }
  }
  
  return {
    allowed: true,
    reason: 'allowed',
    uiHint: 'enabled'
  };
}

/**
 * Check if user can edit specific content
 */
export async function canEditContent(
  userId: string,
  content: { created_by: string; case_id: string; locked_at?: string }
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if locked
  if (content.locked_at) {
    return { allowed: false, reason: 'Content is locked' };
  }
  
  // Check ownership or rank
  const canModify = await checkOwnershipOrRank(userId, content.created_by);
  if (!canModify) {
    return { allowed: false, reason: 'You can only edit your own content' };
  }
  
  return { allowed: true };
}

/**
 * Get available access groups for a user
 */
export async function getAvailableAccessGroups(
  userId: string
): Promise<AccessGroup[]> {
  const userContext = await getUserContext(userId);
  
  const allGroups: AccessGroup[] = [
    'admin_only',
    'internal',
    'public', 
    'client_only',
    'vendor_only',
    'validation_required'
  ];
  
  return allGroups.filter(group => 
    canWriteToAccessGroup(group, userContext.userType, userContext.role)
  );
}
```

---

## 7. Database Helper Functions (SQL)

### 7.1 Case Access Check

```sql
-- Check if user has access to a specific case
CREATE OR REPLACE FUNCTION has_case_access(
  p_user_id UUID, 
  p_case_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access BOOLEAN := FALSE;
BEGIN
  -- A. Direct assignment as investigator
  SELECT EXISTS(
    SELECT 1 
    FROM case_investigators 
    WHERE case_id = p_case_id 
    AND investigator_id = p_user_id
  ) INTO v_has_access;
  
  IF v_has_access THEN 
    RETURN TRUE; 
  END IF;
  
  -- B. Assignment via Vendor
  SELECT EXISTS(
    SELECT 1 
    FROM case_vendors cv
    JOIN vendors v ON v.id = cv.vendor_id
    JOIN vendor_contacts vc ON vc.vendor_id = v.id
    WHERE cv.case_id = p_case_id 
    AND vc.user_id = p_user_id
  ) INTO v_has_access;
  
  IF v_has_access THEN 
    RETURN TRUE; 
  END IF;
  
  -- C. Client linked to case's Account
  SELECT EXISTS(
    SELECT 1 
    FROM cases c
    JOIN accounts a ON a.id = c.account_id
    JOIN contacts ct ON ct.account_id = a.id
    WHERE c.id = p_case_id 
    AND ct.user_id = p_user_id
  ) INTO v_has_access;
  
  IF v_has_access THEN 
    RETURN TRUE; 
  END IF;
  
  -- D. Has "View All Cases" permission
  SELECT EXISTS(
    SELECT 1 
    FROM organization_members om
    JOIN permissions p ON p.role = om.role
    WHERE om.user_id = p_user_id 
    AND p.feature_key = 'view_all_cases' 
    AND p.allowed = TRUE
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;
```

### 7.2 Access Group Membership Check

```sql
-- Check if user is a member of an access group
CREATE OR REPLACE FUNCTION is_access_group_member(
  p_user_id UUID, 
  p_access_group TEXT,
  p_validation_status TEXT DEFAULT 'approved'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_role TEXT;
BEGIN
  -- Get user's type and role
  SELECT 
    p.user_type,
    om.role 
  INTO v_user_type, v_role
  FROM profiles p
  JOIN organization_members om ON om.user_id = p.id
  WHERE p.id = p_user_id;
  
  -- Evaluate access group membership
  RETURN CASE p_access_group
    WHEN 'admin_only' THEN 
      v_role IN ('super_admin', 'admin')
      
    WHEN 'internal' THEN 
      v_user_type = 'employee'
      
    WHEN 'public' THEN 
      TRUE -- Already passed case access check
      
    WHEN 'client_only' THEN 
      v_user_type IN ('employee', 'client')
      
    WHEN 'vendor_only' THEN 
      v_user_type IN ('employee', 'vendor', 'vendor_contact')
      
    WHEN 'validation_required' THEN 
      v_role IN ('super_admin', 'admin', 'case_manager')
      OR p_validation_status = 'approved'
      
    ELSE FALSE
  END;
END;
$$;
```

### 7.3 Rank Comparison

```sql
-- Get user's rank value
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT om.role INTO v_role
  FROM organization_members om
  WHERE om.user_id = p_user_id;
  
  RETURN CASE v_role
    WHEN 'super_admin' THEN 100
    WHEN 'admin' THEN 90
    WHEN 'case_manager' THEN 70
    WHEN 'senior_investigator' THEN 50
    WHEN 'investigator' THEN 40
    WHEN 'billing_clerk' THEN 30
    WHEN 'client_admin' THEN 20
    WHEN 'client_contact' THEN 15
    WHEN 'client_viewer' THEN 10
    WHEN 'vendor_admin' THEN 20
    WHEN 'vendor_investigator' THEN 15
    ELSE 0
  END;
END;
$$;

-- Check if user can modify content based on ownership/rank
CREATE OR REPLACE FUNCTION can_modify_content(
  p_user_id UUID,
  p_content_created_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_rank INTEGER;
  v_creator_rank INTEGER;
  v_has_override BOOLEAN;
BEGIN
  -- Owner can always modify
  IF p_user_id = p_content_created_by THEN
    RETURN TRUE;
  END IF;
  
  -- Get ranks
  v_user_rank := get_user_rank(p_user_id);
  v_creator_rank := get_user_rank(p_content_created_by);
  
  -- Higher rank can modify
  IF v_user_rank > v_creator_rank THEN
    RETURN TRUE;
  END IF;
  
  -- Check for override permission
  SELECT EXISTS(
    SELECT 1 
    FROM organization_members om
    JOIN permissions p ON p.role = om.role
    WHERE om.user_id = p_user_id 
    AND p.feature_key = 'edit_others_content' 
    AND p.allowed = TRUE
  ) INTO v_has_override;
  
  RETURN v_has_override;
END;
$$;
```

### 7.4 Complete RLS Policy Example

```sql
-- Example RLS policy for case_updates using resolution functions
CREATE POLICY "case_updates_view_policy" ON case_updates
FOR SELECT
USING (
  -- Step 1: Case Access
  has_case_access(auth.uid(), case_id)
  AND
  -- Step 2: Access Group Membership
  is_access_group_member(auth.uid(), access_group, validation_status)
  AND
  -- Step 3: View Permission
  EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN permissions p ON p.role = om.role
    WHERE om.user_id = auth.uid()
    AND p.feature_key = 'view_updates'
    AND p.allowed = TRUE
  )
);

-- Update policy with ownership/rank check
CREATE POLICY "case_updates_update_policy" ON case_updates
FOR UPDATE
USING (
  -- Step 1: Case Access
  has_case_access(auth.uid(), case_id)
  AND
  -- Step 2: Edit Permission
  EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN permissions p ON p.role = om.role
    WHERE om.user_id = auth.uid()
    AND p.feature_key = 'edit_updates'
    AND p.allowed = TRUE
  )
  AND
  -- Step 3: Ownership/Rank
  can_modify_content(auth.uid(), user_id)
  AND
  -- Not locked
  locked_at IS NULL
);
```

---

## 8. Flowchart Diagrams

### 8.1 VIEW Resolution Flow

```
                    ┌─────────────────────┐
                    │   VIEW REQUEST      │
                    │   user, content     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  STEP 1: CASE       │
                    │  ACCESS CHECK       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Has case access?   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
         ┌────▼────┐                      ┌─────▼─────┐
         │   NO    │                      │    YES    │
         └────┬────┘                      └─────┬─────┘
              │                                 │
    ┌─────────▼─────────┐            ┌──────────▼──────────┐
    │  403 FORBIDDEN    │            │  STEP 2: ACCESS     │
    │  (Case hidden)    │            │  GROUP CHECK        │
    └───────────────────┘            └──────────┬──────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │  Is group member?   │
                                     └──────────┬──────────┘
                                                │
                            ┌───────────────────┴───────────────────┐
                            │                                       │
                       ┌────▼────┐                            ┌─────▼─────┐
                       │   NO    │                            │    YES    │
                       └────┬────┘                            └─────┬─────┘
                            │                                       │
              ┌─────────────▼─────────────┐          ┌──────────────▼──────────────┐
              │  HIDDEN                   │          │  STEP 3: VIEW               │
              │  (Content filtered)       │          │  PERMISSION CHECK           │
              └───────────────────────────┘          └──────────────┬──────────────┘
                                                                    │
                                                         ┌──────────▼──────────┐
                                                         │  Has permission?    │
                                                         └──────────┬──────────┘
                                                                    │
                                          ┌─────────────────────────┴─────────────────────────┐
                                          │                                                   │
                                     ┌────▼────┐                                        ┌─────▼─────┐
                                     │   NO    │                                        │    YES    │
                                     └────┬────┘                                        └─────┬─────┘
                                          │                                                   │
                            ┌─────────────▼─────────────┐                      ┌──────────────▼──────────────┐
                            │  HIDDEN                   │                      │  ✓ CONTENT VISIBLE         │
                            │  (Content filtered)       │                      │  (Show to user)             │
                            └───────────────────────────┘                      └─────────────────────────────┘
```

### 8.2 ACTION Resolution Flow

```
                    ┌─────────────────────┐
                    │   ACTION REQUEST    │
                    │   user, action      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  STEP 1: CASE       │
                    │  ACCESS CHECK       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Has case access?   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
         ┌────▼────┐                      ┌─────▼─────┐
         │   NO    │                      │    YES    │
         └────┬────┘                      └─────┬─────┘
              │                                 │
    ┌─────────▼─────────┐            ┌──────────▼──────────┐
    │  403 FORBIDDEN    │            │  STEP 2: ACTION     │
    │                   │            │  PERMISSION CHECK   │
    └───────────────────┘            └──────────┬──────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │  Has permission?    │
                                     └──────────┬──────────┘
                                                │
                            ┌───────────────────┴───────────────────┐
                            │                                       │
                       ┌────▼────┐                            ┌─────▼─────┐
                       │   NO    │                            │    YES    │
                       └────┬────┘                            └─────┬─────┘
                            │                                       │
              ┌─────────────▼─────────────┐          ┌──────────────▼──────────────┐
              │  403 FORBIDDEN            │          │  Is edit/delete action?     │
              │  (Button disabled)        │          └──────────────┬──────────────┘
              └───────────────────────────┘                         │
                                                    ┌───────────────┴───────────────┐
                                                    │                               │
                                               ┌────▼────┐                    ┌─────▼─────┐
                                               │   YES   │                    │    NO     │
                                               └────┬────┘                    └─────┬─────┘
                                                    │                               │
                                         ┌──────────▼──────────┐                    │
                                         │  STEP 3: OWNERSHIP  │                    │
                                         │  /RANK CHECK        │                    │
                                         └──────────┬──────────┘                    │
                                                    │                               │
                                  ┌─────────────────┴─────────────────┐             │
                                  │                                   │             │
                             ┌────▼────┐                        ┌─────▼─────┐       │
                             │ DENIED  │                        │  ALLOWED  │       │
                             └────┬────┘                        └─────┬─────┘       │
                                  │                                   │             │
                    ┌─────────────▼─────────────┐                     │             │
                    │  403 FORBIDDEN            │                     │             │
                    │  "Edit own content only"  │                     │             │
                    └───────────────────────────┘                     │             │
                                                                      ▼             │
                                                       ┌──────────────────────────┐ │
                                                       │  Is create/edit action?  │◄┘
                                                       └──────────────┬───────────┘
                                                                      │
                                                    ┌─────────────────┴─────────────────┐
                                                    │                                   │
                                               ┌────▼────┐                        ┌─────▼─────┐
                                               │   YES   │                        │    NO     │
                                               └────┬────┘                        └─────┬─────┘
                                                    │                                   │
                                         ┌──────────▼──────────┐                        │
                                         │  STEP 4: ACCESS     │                        │
                                         │  GROUP WRITE CHECK  │                        │
                                         └──────────┬──────────┘                        │
                                                    │                                   │
                                  ┌─────────────────┴─────────────────┐                 │
                                  │                                   │                 │
                             ┌────▼────┐                        ┌─────▼─────┐           │
                             │ DENIED  │                        │  ALLOWED  │           │
                             └────┬────┘                        └─────┬─────┘           │
                                  │                                   │                 │
                    ┌─────────────▼─────────────┐                     │                 │
                    │  403 FORBIDDEN            │                     │                 │
                    │  (Option hidden)          │                     ▼                 │
                    └───────────────────────────┘           ┌─────────────────────┐     │
                                                            │  ✓ ACTION ALLOWED   │◄────┘
                                                            │  (Proceed)          │
                                                            └─────────────────────┘
```

---

## 9. Audit Logging Requirements

Every access denial must be logged for security auditing and debugging purposes.

### 9.1 Denial Log Schema

```typescript
interface AccessDenialLog {
  id: string;                    // UUID
  event_type: 'ACCESS_DENIED';
  user_id: string;               // Who was denied
  organization_id: string;       // Organization context
  action: string;                // What they tried to do
  target_id: string;             // What they tried to access
  target_type: ContentType;      // Type of content
  denial_reason: DenialReason;   // Why it was denied
  denial_step: 1 | 2 | 3 | 4;    // Which step failed
  case_id?: string;              // Related case (if applicable)
  access_group?: AccessGroup;    // Access group involved
  user_rank?: number;            // User's rank at time of denial
  creator_rank?: number;         // Content creator's rank
  timestamp: string;             // ISO timestamp
  request_metadata: {
    ip_address?: string;
    user_agent?: string;
    request_path?: string;
  };
}

type DenialReason = 
  | 'no_case_access' 
  | 'access_group_denied' 
  | 'permission_denied' 
  | 'ownership_denied'
  | 'access_group_write_denied'
  | 'content_locked';
```

### 9.2 SQL Logging Function

```sql
-- Log access denials
CREATE OR REPLACE FUNCTION log_access_denial(
  p_user_id UUID,
  p_action TEXT,
  p_target_id TEXT,
  p_denial_reason TEXT,
  p_denial_step INTEGER,
  p_case_id UUID DEFAULT NULL,
  p_access_group TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_events (
    action,
    actor_user_id,
    organization_id,
    metadata,
    created_at
  )
  SELECT
    'ACCESS_DENIED',
    p_user_id,
    om.organization_id,
    jsonb_build_object(
      'target_id', p_target_id,
      'denial_reason', p_denial_reason,
      'denial_step', p_denial_step,
      'case_id', p_case_id,
      'access_group', p_access_group,
      'user_rank', get_user_rank(p_user_id)
    ),
    NOW()
  FROM organization_members om
  WHERE om.user_id = p_user_id;
END;
$$;
```

### 9.3 Example Log Entries

```json
// Case Access Denied
{
  "event_type": "ACCESS_DENIED",
  "user_id": "user-uuid-123",
  "action": "view_update",
  "target_id": "update-uuid-456",
  "denial_reason": "no_case_access",
  "denial_step": 1,
  "timestamp": "2026-01-18T10:30:00Z"
}

// Access Group Denied
{
  "event_type": "ACCESS_DENIED",
  "user_id": "client-uuid-789",
  "action": "view_update",
  "target_id": "update-uuid-456",
  "denial_reason": "access_group_denied",
  "denial_step": 2,
  "case_id": "case-uuid-111",
  "access_group": "internal",
  "timestamp": "2026-01-18T10:31:00Z"
}

// Ownership Denied
{
  "event_type": "ACCESS_DENIED",
  "user_id": "investigator-uuid-222",
  "action": "edit_update",
  "target_id": "update-uuid-333",
  "denial_reason": "ownership_denied",
  "denial_step": 3,
  "user_rank": 40,
  "creator_rank": 70,
  "timestamp": "2026-01-18T10:32:00Z"
}
```

---

## 10. Implementation Checklist

### Database Layer
- [ ] Create `has_case_access()` function
- [ ] Create `is_access_group_member()` function
- [ ] Create `get_user_rank()` function
- [ ] Create `can_modify_content()` function
- [ ] Create `log_access_denial()` function
- [ ] Update RLS policies on `case_updates` to use resolution functions
- [ ] Update RLS policies on `case_attachments` to use resolution functions
- [ ] Update RLS policies on `case_finances` to use resolution functions

### Backend Layer (Edge Functions)
- [ ] Create `resolveViewAccess()` utility function
- [ ] Create `resolveActionAccess()` utility function
- [ ] Create `getAvailableAccessGroups()` utility function
- [ ] Create `canEditContent()` utility function
- [ ] Add audit logging to all denial paths

### Frontend Layer
- [ ] Create `useAccessResolution` hook
- [ ] Create `useCanPerformAction` hook
- [ ] Filter content based on VIEW resolution in list components
- [ ] Disable/hide buttons based on ACTION resolution
- [ ] Filter Access Group dropdown based on write permissions

### Testing
- [ ] Unit tests for all resolution functions
- [ ] Integration tests for all 20 edge cases
- [ ] E2E tests for critical user flows
- [ ] Verify audit logging captures all denials

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-18 | System | Initial specification |

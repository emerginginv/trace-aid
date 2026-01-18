# CaseWyze Access Group Specification

## Overview

Access Groups are **Layer 4** of the CaseWyze authorization model - visibility containers attached to **CONTENT** (not users) that control who can see specific items.

**Core Principle:** Access Groups are assigned to content (updates, files, documents). Users see content if they are **MEMBERS** of that content's Access Group.

---

## 1. Default Access Groups

| Access Group | ID | Description | Use Case |
|--------------|-----|-------------|----------|
| **Admin Only** | `admin_only` | Visible only to Admin/Super Admin roles | Sensitive internal notes, HR issues, legal concerns |
| **Internal** | `internal` | Visible to all Employee-type users | Standard internal case notes and files |
| **Public** | `public` | Visible to all users with case access | Updates/files intended for client visibility |
| **Client Only** | `client_only` | Visible to Clients + Employees (excludes Vendors) | Direct client communications |
| **Vendor Only** | `vendor_only` | Visible to Vendors + Employees (excludes Clients) | Vendor coordination |
| **Validation Required** | `validation_required` | Hidden until validated by Admin/Manager | Content pending review before broader visibility |

---

## 2. Access Group Membership Matrix

Membership is **AUTOMATIC** based on User Type, Role, and Case Assignment.

| Access Group | Super Admin | Admin | Case Mgr | Sr Inv | Inv | Billing | Client Admin | Client Contact | Client Viewer | Vendor Admin | Vendor Inv |
|--------------|:-----------:|:-----:|:--------:|:------:|:---:|:-------:|:------------:|:--------------:|:-------------:|:------------:|:----------:|
| `admin_only` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `internal` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `public` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `client_only` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| `vendor_only` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `validation_required` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Note:** `public` membership requires case assignment - users must have access to the case to see public content on that case.

---

## 3. Membership Derivation Rules

### By User Type

| User Type | Automatic Membership |
|-----------|---------------------|
| Employee | `internal`, `public`, `client_only`, `vendor_only` |
| Client | `public`, `client_only` |
| Vendor | `public`, `vendor_only` |
| Vendor Contact | `public`, `vendor_only` |

### By Role (Additional Access)

| Role | Additional Access Groups |
|------|-------------------------|
| Super Admin | `admin_only`, `validation_required` |
| Admin | `admin_only`, `validation_required` |
| Case Manager | `validation_required` |

### Membership Check Logic

```typescript
function isAccessGroupMember(
  userId: string,
  accessGroup: AccessGroup,
  caseId: string
): boolean {
  const userType = getUserType(userId);
  const role = getUserRole(userId);
  const isAssigned = isCaseAssigned(userId, caseId);
  
  // Must have case access for any visibility
  if (!isAssigned && !canViewAllCases(userId)) {
    return false;
  }
  
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
      return role === 'super_admin' || 
             role === 'admin' || 
             role === 'case_manager';
             
    default:
      return false;
  }
}
```

---

## 4. Behavioral Flags

| Access Group | Document Inclusion | Last Update Refresh | Audit on Change |
|--------------|-------------------|---------------------|-----------------|
| `admin_only` | Excluded from ALL reports | No | Yes |
| `internal` | Internal Reports only | Yes | Yes |
| `public` | Client Reports | Yes | Yes |
| `client_only` | Client Reports | Yes | Yes |
| `vendor_only` | Excluded from Client Reports | Yes | Yes |
| `validation_required` | Excluded until validated | No (until validated) | Yes |

### Behavioral Definitions

- **Document Inclusion:** Whether content with this Access Group is included in generated reports
- **Last Update Refresh:** Whether changes to content update the case's "Last Activity" timestamp
- **Audit on Change:** Whether Access Group modifications are logged to the audit trail (always Yes)

---

## 5. Content Rules & Defaults

### Mandatory Access Group Assignment

**Every piece of content MUST have an Access Group (NOT NULL constraint).**

| Content Type | Default Access Group | Can Override at Creation? | Can Change After Creation? |
|--------------|---------------------|---------------------------|---------------------------|
| Case Updates | `internal` | Yes | Yes (with audit) |
| Case Attachments | Inherits from parent update, or `internal` if standalone | Yes | Yes (with audit) |
| Case Activities | `internal` | No (system-controlled) | Admin only |
| Financial Entries | `internal` | No | Admin/Manager only |
| Subject Data | `internal` | No (controlled by permissions) | No |

### Access Group Selection Rules

1. Users can only **SELECT** Access Groups they are **MEMBERS** of
2. The UI must filter the dropdown based on current user's membership
3. **Exception:** Super Admins can select ANY Access Group
4. Content creator cannot select an Access Group more restrictive than they can view

---

## 6. Validation Required Workflow

The `validation_required` Access Group has special lifecycle behavior:

### Lifecycle States

```
┌─────────────────────────────────────────────────────────────────┐
│                     VALIDATION WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. CREATED                                                     │
│      └── access_group = 'validation_required'                   │
│      └── validation_status = 'pending'                          │
│      └── validation_target_group = [intended group]             │
│                                                                  │
│   2. PENDING REVIEW                                              │
│      └── Visible ONLY to: Super Admin, Admin, Case Manager     │
│      └── Does NOT update "Last Activity"                        │
│      └── EXCLUDED from all reports                              │
│                                                                  │
│   3a. APPROVED                                                   │
│      └── access_group = validation_target_group                 │
│      └── validation_status = 'approved'                         │
│      └── validated_at = now()                                   │
│      └── validated_by = approver_id                             │
│      └── NOW visible per new Access Group rules                 │
│      └── NOW included in reports (if applicable)                │
│                                                                  │
│   3b. REJECTED                                                   │
│      └── validation_status = 'rejected'                         │
│      └── Content may be deleted or sent back for revision       │
│      └── Remains hidden from non-validators                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Fields for Validation

```sql
-- Required columns on case_updates and case_attachments
validation_target_group  access_group  -- The intended Access Group after approval
validated_at            TIMESTAMPTZ    -- Timestamp of approval
validated_by            UUID           -- User ID of approver
validation_status       TEXT           -- 'pending' | 'approved' | 'rejected'
```

---

## 7. Complete Visibility Check Algorithm

The visibility check combines all authorization layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                   CAN USER SEE CONTENT?                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   STEP 1: Permission Check                                       │
│   ├── IF NOT user.hasPermission('view_updates') → DENY          │
│   └── CONTINUE                                                   │
│                                                                  │
│   STEP 2: Case Assignment Check                                  │
│   ├── IF user.canViewAllCases() → CONTINUE                      │
│   ├── IF user.isAssignedToCase(content.case_id) → CONTINUE      │
│   └── ELSE → DENY                                                │
│                                                                  │
│   STEP 3: Access Group Check                                     │
│   ├── IF isAccessGroupMember(user, content.access_group) →      │
│   │      CONTINUE                                                │
│   └── ELSE → DENY                                                │
│                                                                  │
│   STEP 4: Validation Check (if applicable)                       │
│   ├── IF content.access_group ≠ 'validation_required' →         │
│   │      CONTINUE                                                │
│   ├── IF content.validation_status = 'approved' → CONTINUE      │
│   ├── IF user.role IN ('super_admin', 'admin', 'case_manager')  │
│   │      → CONTINUE                                              │
│   └── ELSE → DENY                                                │
│                                                                  │
│   RESULT: ALLOW                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema

### Access Group Enum

```sql
CREATE TYPE access_group AS ENUM (
  'admin_only',
  'internal',
  'public',
  'client_only',
  'vendor_only',
  'validation_required'
);
```

### Extend case_updates Table

```sql
ALTER TABLE case_updates
ADD COLUMN access_group access_group NOT NULL DEFAULT 'internal',
ADD COLUMN validation_target_group access_group,
ADD COLUMN validated_at TIMESTAMPTZ,
ADD COLUMN validated_by UUID REFERENCES profiles(id),
ADD COLUMN validation_status TEXT DEFAULT 'approved' 
  CHECK (validation_status IN ('pending', 'approved', 'rejected'));

-- Index for filtering by access group
CREATE INDEX idx_case_updates_access_group ON case_updates(access_group);
CREATE INDEX idx_case_updates_validation_status ON case_updates(validation_status) 
  WHERE validation_status = 'pending';
```

### Extend case_attachments Table

```sql
ALTER TABLE case_attachments
ADD COLUMN access_group access_group NOT NULL DEFAULT 'internal',
ADD COLUMN validation_target_group access_group,
ADD COLUMN validated_at TIMESTAMPTZ,
ADD COLUMN validated_by UUID REFERENCES profiles(id),
ADD COLUMN validation_status TEXT DEFAULT 'approved'
  CHECK (validation_status IN ('pending', 'approved', 'rejected'));

-- Index for filtering by access group
CREATE INDEX idx_case_attachments_access_group ON case_attachments(access_group);
```

### Access Group Definitions Table (Optional Customization)

```sql
CREATE TABLE access_group_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_group access_group NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Eye',
  color TEXT DEFAULT 'text-gray-600 bg-gray-50',
  include_in_reports BOOLEAN DEFAULT true,
  refresh_last_activity BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, access_group)
);

-- Seed default definitions for each organization
CREATE OR REPLACE FUNCTION seed_access_group_definitions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO access_group_definitions (organization_id, access_group, display_name, description, icon, color, include_in_reports, refresh_last_activity, sort_order)
  VALUES
    (NEW.id, 'admin_only', 'Admin Only', 'Visible only to Admin and Super Admin roles', 'Shield', 'text-red-600 bg-red-50', false, false, 1),
    (NEW.id, 'internal', 'Internal', 'Visible to all internal employees', 'Building', 'text-blue-600 bg-blue-50', true, true, 2),
    (NEW.id, 'public', 'Public', 'Visible to all users with case access', 'Globe', 'text-green-600 bg-green-50', true, true, 3),
    (NEW.id, 'client_only', 'Client Only', 'Visible to clients and employees', 'Users', 'text-purple-600 bg-purple-50', true, true, 4),
    (NEW.id, 'vendor_only', 'Vendor Only', 'Visible to vendors and employees', 'Truck', 'text-orange-600 bg-orange-50', false, true, 5),
    (NEW.id, 'validation_required', 'Pending Validation', 'Hidden until approved by a manager', 'Clock', 'text-amber-600 bg-amber-50', false, false, 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 9. RLS Policy Updates

### case_updates RLS Policy

```sql
-- Drop existing policy if needed
DROP POLICY IF EXISTS "Users can view case updates" ON case_updates;

-- Create comprehensive policy with Access Group filtering
CREATE POLICY "Users can view case updates with access group check"
ON case_updates FOR SELECT
USING (
  -- Check case access first
  (
    EXISTS (
      SELECT 1 FROM case_investigators ci
      WHERE ci.case_id = case_updates.case_id
      AND ci.investigator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN role_permissions rp ON rp.role = om.role
      WHERE om.user_id = auth.uid()
      AND om.organization_id = case_updates.organization_id
      AND rp.feature_key = 'view_all_cases'
    )
  )
  AND
  -- Access Group check
  (
    CASE access_group
      WHEN 'admin_only' THEN 
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.user_id = auth.uid()
          AND om.organization_id = case_updates.organization_id
          AND om.role IN ('super_admin', 'admin')
        )
      WHEN 'internal' THEN
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.user_id = auth.uid()
          AND om.organization_id = case_updates.organization_id
          AND om.user_type = 'employee'
        )
      WHEN 'public' THEN true
      WHEN 'client_only' THEN
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.user_id = auth.uid()
          AND om.organization_id = case_updates.organization_id
          AND om.user_type IN ('employee', 'client')
        )
      WHEN 'vendor_only' THEN
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.user_id = auth.uid()
          AND om.organization_id = case_updates.organization_id
          AND om.user_type IN ('employee', 'vendor', 'vendor_contact')
        )
      WHEN 'validation_required' THEN
        -- Only visible if approved OR user is validator
        (
          validation_status = 'approved'
          OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = case_updates.organization_id
            AND om.role IN ('super_admin', 'admin', 'case_manager')
          )
        )
      ELSE false
    END
  )
);
```

---

## 10. TypeScript Constants

```typescript
// src/constants/access-groups.ts

export const ACCESS_GROUPS = {
  admin_only: {
    id: 'admin_only',
    displayName: 'Admin Only',
    description: 'Visible only to Admin and Super Admin roles',
    icon: 'Shield',
    color: 'text-red-600 bg-red-50',
    borderColor: 'border-red-200',
    includeInReports: false,
    reportTypes: [],
    refreshLastActivity: false,
    sortOrder: 1
  },
  internal: {
    id: 'internal',
    displayName: 'Internal',
    description: 'Visible to all internal employees',
    icon: 'Building',
    color: 'text-blue-600 bg-blue-50',
    borderColor: 'border-blue-200',
    includeInReports: true,
    reportTypes: ['internal'],
    refreshLastActivity: true,
    sortOrder: 2
  },
  public: {
    id: 'public',
    displayName: 'Public',
    description: 'Visible to all users with case access',
    icon: 'Globe',
    color: 'text-green-600 bg-green-50',
    borderColor: 'border-green-200',
    includeInReports: true,
    reportTypes: ['internal', 'client'],
    refreshLastActivity: true,
    sortOrder: 3
  },
  client_only: {
    id: 'client_only',
    displayName: 'Client Only',
    description: 'Visible to clients and employees (excludes vendors)',
    icon: 'Users',
    color: 'text-purple-600 bg-purple-50',
    borderColor: 'border-purple-200',
    includeInReports: true,
    reportTypes: ['internal', 'client'],
    refreshLastActivity: true,
    sortOrder: 4
  },
  vendor_only: {
    id: 'vendor_only',
    displayName: 'Vendor Only',
    description: 'Visible to vendors and employees (excludes clients)',
    icon: 'Truck',
    color: 'text-orange-600 bg-orange-50',
    borderColor: 'border-orange-200',
    includeInReports: true,
    reportTypes: ['internal'],
    refreshLastActivity: true,
    sortOrder: 5
  },
  validation_required: {
    id: 'validation_required',
    displayName: 'Pending Validation',
    description: 'Hidden until approved by a manager',
    icon: 'Clock',
    color: 'text-amber-600 bg-amber-50',
    borderColor: 'border-amber-200',
    includeInReports: false,
    reportTypes: [],
    refreshLastActivity: false,
    sortOrder: 6
  }
} as const;

export type AccessGroupId = keyof typeof ACCESS_GROUPS;

export const ACCESS_GROUP_IDS = Object.keys(ACCESS_GROUPS) as AccessGroupId[];

// Default access group for different content types
export const DEFAULT_ACCESS_GROUPS = {
  case_updates: 'internal',
  case_attachments: 'internal',
  case_activities: 'internal',
  case_finances: 'internal'
} as const;

// Validation statuses
export const VALIDATION_STATUSES = {
  pending: { label: 'Pending Review', color: 'text-amber-600 bg-amber-50' },
  approved: { label: 'Approved', color: 'text-green-600 bg-green-50' },
  rejected: { label: 'Rejected', color: 'text-red-600 bg-red-50' }
} as const;

export type ValidationStatus = keyof typeof VALIDATION_STATUSES;

// Helper to get available access groups for a user
export function getAvailableAccessGroups(
  userType: 'employee' | 'client' | 'vendor' | 'vendor_contact',
  role: string
): AccessGroupId[] {
  const available: AccessGroupId[] = [];
  
  // Admin-only access
  if (role === 'super_admin' || role === 'admin') {
    available.push('admin_only');
  }
  
  // Internal access (employees only)
  if (userType === 'employee') {
    available.push('internal');
  }
  
  // Public is always available (if user has case access)
  available.push('public');
  
  // Client-only (employees and clients)
  if (userType === 'employee' || userType === 'client') {
    available.push('client_only');
  }
  
  // Vendor-only (employees and vendors)
  if (userType === 'employee' || userType === 'vendor' || userType === 'vendor_contact') {
    available.push('vendor_only');
  }
  
  // Validation required (managers+ only)
  if (role === 'super_admin' || role === 'admin' || role === 'case_manager') {
    available.push('validation_required');
  }
  
  return available;
}
```

---

## 11. Implementation Checklist

### Database Layer
- [ ] Create `access_group` enum type
- [ ] Add `access_group` column to `case_updates` (NOT NULL, default 'internal')
- [ ] Add `access_group` column to `case_attachments` (NOT NULL, default 'internal')
- [ ] Add validation workflow columns (`validation_target_group`, `validated_at`, `validated_by`, `validation_status`)
- [ ] Create `access_group_definitions` table for org-level customization
- [ ] Add indexes for efficient filtering
- [ ] Update RLS policies to include Access Group checks
- [ ] Create trigger to seed default access group definitions on org creation

### Backend Layer
- [ ] Create `is_access_group_member()` database function
- [ ] Add Access Group validation to update/attachment insert triggers
- [ ] Implement validation approval edge function
- [ ] Add Access Group change audit logging

### Frontend Layer
- [ ] Create `AccessGroupSelector` component with filtered options
- [ ] Add `AccessGroupBadge` component for visibility indicators
- [ ] Integrate selector into `UpdateForm` component
- [ ] Integrate selector into file upload components
- [ ] Create validation queue view for Admin/Manager
- [ ] Add Access Group filter to Updates list view

### Report Generation
- [ ] Filter content by Access Group when generating reports
- [ ] Add Access Group configuration to report templates
- [ ] Implement internal vs. client report type filtering

---

## 12. UI/UX Guidelines

### Access Group Selector

```
┌─────────────────────────────────────────────┐
│ Visibility                                   │
├─────────────────────────────────────────────┤
│ ○ 🏢 Internal                               │
│     Visible to all internal employees        │
│                                              │
│ ○ 🌐 Public                                 │
│     Visible to all users with case access    │
│                                              │
│ ○ 👥 Client Only                            │
│     Visible to clients and employees         │
│                                              │
│ ○ 🚚 Vendor Only                            │
│     Visible to vendors and employees         │
│                                              │
│ ○ 🛡️ Admin Only           [Admin+ only]     │
│     Visible only to Admin roles              │
│                                              │
│ ○ ⏳ Pending Validation   [Manager+ only]   │
│     Hidden until approved                    │
└─────────────────────────────────────────────┘
```

### Access Group Badge Display

Content items should display their Access Group as a small badge:

- **Admin Only:** Red badge with shield icon
- **Internal:** Blue badge with building icon
- **Public:** Green badge with globe icon
- **Client Only:** Purple badge with users icon
- **Vendor Only:** Orange badge with truck icon
- **Pending Validation:** Amber badge with clock icon + status indicator

---

## 13. Migration Strategy

### For Existing Content

When implementing Access Groups, existing content needs migration:

```sql
-- Set all existing updates to 'internal' (default)
UPDATE case_updates 
SET access_group = 'internal',
    validation_status = 'approved'
WHERE access_group IS NULL;

-- Set all existing attachments to 'internal' (default)
UPDATE case_attachments 
SET access_group = 'internal',
    validation_status = 'approved'
WHERE access_group IS NULL;
```

---

## Related Documentation

- [Authorization Model Specification](./authorization-model-specification.md)
- [User Type Specification](./user-type-specification.md)
- [Role Specification](./role-specification.md)
- [Permission Matrix](./permission-matrix.md)

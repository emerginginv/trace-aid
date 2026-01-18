# RGP Conflict Analysis

> **Version:** 1.0  
> **Last Updated:** 2026-01-18  
> **Purpose:** Identify conflicts between current system behavior and RGP target state

---

## Executive Summary

This document analyzes the differences between CaseWyze's current authorization system and the target RGP (Role, Group, Permission) model. It identifies conflicts, proposes migration paths, and documents decisions made to resolve each conflict.

---

## Current State vs Target State

### Role System

| Aspect | Current State | Target State | Migration Path |
|--------|---------------|--------------|----------------|
| **Role Storage** | `app_role` enum with 4 values | `role_definitions` table with 11+ roles | Create table, migrate role references |
| **Role Values** | `admin`, `manager`, `investigator`, `vendor` | 11 distinct roles with ranks | Extend enum or use string keys |
| **Role Hierarchy** | Implicit (admin > manager > investigator) | Explicit rank field (0-100) | Add rank column, seed values |
| **Custom Roles** | Not supported | Clone-based customization | Add `is_system_role` flag |

### Access Control

| Aspect | Current State | Target State | Migration Path |
|--------|---------------|--------------|----------------|
| **Update Visibility** | All org members see all updates | Access Group filtered | Add `access_group` column, default 'internal' |
| **File Visibility** | All org members see all files | Access Group filtered | Add `access_group` column, inherit from update |
| **Case Access** | Based on `case_investigators` join | Multi-path resolution (5 checks) | Create `has_case_access()` function |
| **Content Editing** | Owner or admin only | Owner OR higher rank | Create `get_user_rank()` function |

### User Types

| Aspect | Current State | Target State | Migration Path |
|--------|---------------|--------------|----------------|
| **User Classification** | Inferred from role | Explicit `user_type` field | Add column, migrate from roles |
| **Employee** | Users with admin/manager/investigator role | Explicit type + employee roles | Set based on current role |
| **Client** | Not tracked in profiles | Explicit type + client roles | Infer from `contacts` table |
| **Vendor** | Users with vendor role | Explicit type (vendor or vendor_contact) | Infer from `vendor_contacts` table |

---

## Identified Conflicts

### Conflict 1: Role Enum Mismatch

**Description:**  
The current `app_role` enum has only 4 values (`admin`, `manager`, `investigator`, `vendor`), but the target state requires 11 distinct roles.

**Current Enum:**
```sql
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'investigator', 'vendor');
```

**Target Roles:**
- super_admin, admin, case_manager, senior_investigator, investigator, billing_clerk
- client_admin, client_contact, client_viewer
- vendor_admin, vendor_investigator

**Resolution Options:**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| A. Extend enum | Simple, backward compatible | Enum extension is tricky in Postgres | ❌ Rejected |
| B. Replace with TEXT | Flexible, easy to extend | Lose type safety | ❌ Rejected |
| C. Separate role_definitions table | Full flexibility, supports custom roles | More complex queries | ✅ **Selected** |

**Selected Approach:**  
Create a `role_definitions` table that stores role metadata (key, display name, rank, user type). The `organization_members.role` column remains as-is for now but will reference `role_definitions.role_key` logically.

**Migration SQL:**
```sql
-- Phase 2: Create role_definitions table
CREATE TABLE public.role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  user_type TEXT NOT NULL,
  is_system_role BOOLEAN DEFAULT false,
  can_be_deleted BOOLEAN DEFAULT true,
  UNIQUE(organization_id, role_key)
);

-- Seed default roles for each org
INSERT INTO role_definitions (organization_id, role_key, display_name, rank, user_type, is_system_role, can_be_deleted)
SELECT o.id, r.role_key, r.display_name, r.rank, r.user_type, true, false
FROM organizations o
CROSS JOIN (VALUES
  ('super_admin', 'Super Admin', 100, 'employee'),
  ('admin', 'Admin', 90, 'employee'),
  ('case_manager', 'Case Manager', 70, 'employee'),
  ('senior_investigator', 'Senior Investigator', 50, 'employee'),
  ('investigator', 'Investigator', 40, 'employee'),
  ('billing_clerk', 'Billing Clerk', 30, 'employee'),
  ('client_admin', 'Client Admin', 50, 'client'),
  ('client_contact', 'Client Contact', 30, 'client'),
  ('client_viewer', 'Client Viewer', 10, 'client'),
  ('vendor_admin', 'Vendor Admin', 50, 'vendor'),
  ('vendor_investigator', 'Vendor Investigator', 30, 'vendor')
) AS r(role_key, display_name, rank, user_type);
```

---

### Conflict 2: Vendor Role Ambiguity

**Description:**  
The current system has a single "vendor" role, but the target distinguishes between Vendor Admin (can manage their own team) and Vendor Investigator (field worker).

**Current State:**
- Single `vendor` role in `app_role` enum
- Applied to all vendor-linked users

**Target State:**
- `vendor_admin` (rank 50): Can manage vendor team, view all vendor cases
- `vendor_investigator` (rank 30): Field worker, limited to assigned cases

**Resolution:**

1. **Phase 2:** Add both roles to `role_definitions`
2. **Phase 2:** Migrate existing vendor users:
   - Users in `vendor_contacts` with `is_primary = true` → `vendor_admin`
   - Other vendor users → `vendor_investigator`
3. **Phase 3:** Update RLS policies to respect new roles

**Migration SQL:**
```sql
-- Migrate primary contacts to vendor_admin, others to vendor_investigator
UPDATE organization_members om
SET role = CASE 
  WHEN EXISTS (
    SELECT 1 FROM vendor_contacts vc 
    WHERE vc.user_id = om.user_id AND vc.is_primary = true
  ) THEN 'vendor_admin'
  ELSE 'vendor_investigator'
END
WHERE om.role = 'vendor';
```

---

### Conflict 3: Client Roles Don't Exist

**Description:**  
The current system has no client roles. Clients are tracked in the `contacts` table but don't have user accounts or roles.

**Current State:**
- Clients exist in `contacts` table
- No `user_id` on most contacts
- No client login capability

**Target State:**
- Three client roles: `client_admin`, `client_contact`, `client_viewer`
- Clients can log in and view case status
- Access filtered by Account → Case relationship

**Resolution:**

This is an **additive change**, not a conflict. The migration path:

1. **Phase 2:** Add client roles to `role_definitions`
2. **Phase 2:** Add `user_type = 'client'` for future client users
3. **Future:** Client portal implementation (outside RGP scope)

**Note:** Client login functionality is a separate feature request. RGP prepares the authorization model; the client portal would be a future project.

---

### Conflict 4: No Access Group on Content

**Description:**  
The current system does not have access group visibility controls on updates or files. All content is visible to all org members who have case access.

**Current State:**
- `case_updates` has no visibility field
- `case_attachments` has no visibility field
- All updates/files visible to anyone with case access

**Target State:**
- `access_group` field on both tables
- Content filtered by user type and access group membership

**Resolution:**

1. **Phase 2:** Add `access_group` column with default 'internal'
2. **Phase 2:** All existing content gets 'internal' (preserves current behavior)
3. **Phase 3:** RLS policies filter based on access group
4. **Phase 4:** UI allows selecting access group on creation

**Key Decision:**  
Default value of 'internal' ensures no behavior change for existing content. Only new content can be created with restricted access groups.

**Migration SQL:**
```sql
ALTER TABLE case_updates 
ADD COLUMN access_group access_group_type NOT NULL DEFAULT 'internal';

ALTER TABLE case_attachments
ADD COLUMN access_group access_group_type NOT NULL DEFAULT 'internal';
```

---

### Conflict 5: Rank-Based Edit Permissions

**Description:**  
The current system allows editing only by content owner or admins. The target allows editing by anyone with higher rank.

**Current State:**
```sql
-- Current RLS policy pattern
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
```

**Target State:**
```sql
-- Target RLS policy pattern
USING (
  user_id = auth.uid()
  OR get_user_rank(auth.uid()) > get_user_rank(user_id)
  OR has_permission(auth.uid(), 'edit_updates')
)
```

**Resolution:**

1. **Phase 3:** Create `get_user_rank()` database function
2. **Phase 3:** Update RLS policies to use rank comparison
3. **Phase 3:** Feature flag controls new behavior

**Risk Mitigation:**  
The feature flag allows instant rollback if rank-based editing causes issues.

---

### Conflict 6: Implicit vs Explicit Permissions

**Description:**  
The current system has implicit permissions based on role name. The target has explicit permission grants per role.

**Current State:**
- Code checks `has_role(uid, 'admin')` directly
- Permissions inferred from role name
- `permissions` table exists but not fully utilized

**Target State:**
- All access checks use `has_permission(uid, 'permission_key')`
- `permissions` table is source of truth
- Role determines which permissions are granted

**Resolution:**

1. **Phase 1:** Document all permission keys in `docs/permission-specification.md` ✅
2. **Phase 1:** Create `src/constants/permissions.ts` with type-safe keys ✅
3. **Phase 3:** Ensure `permissions` table has complete data for all roles
4. **Phase 3:** Migrate code from `has_role()` to `has_permission()` calls

**Current Progress:**  
Permission constants and specification are complete. Migration of code to use `has_permission()` is ongoing.

---

## Non-Conflicts (Additive Changes)

These items are new functionality, not conflicts with existing behavior:

| Item | Description | Phase |
|------|-------------|-------|
| Validation workflow | Content marked "validation_required" needs approval | Phase 2-3 |
| Custom access groups | Org-specific visibility groups | Phase 5+ |
| Permission audit log | Track who changed what permissions | Phase 5 |
| Role cloning | Create custom roles from templates | Phase 5 |

---

## Migration Risk Assessment

| Conflict | Risk Level | Mitigation |
|----------|------------|------------|
| #1 Role Enum | Medium | New table, no enum modification |
| #2 Vendor Split | Low | Clear migration logic |
| #3 Client Roles | None | Additive only |
| #4 Access Groups | Low | Default preserves behavior |
| #5 Rank Editing | Medium | Feature flag |
| #6 Explicit Permissions | Medium | Gradual migration |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-18 | Use `role_definitions` table instead of extending enum | More flexible, supports custom roles |
| 2026-01-18 | Default `access_group` to 'internal' | Preserves existing visibility |
| 2026-01-18 | Feature flag for Phase 3 changes | Enables instant rollback |
| 2026-01-18 | Defer client portal to future project | RGP focuses on authorization model |

---

## Open Questions

1. **Q:** Should we backfill `access_group` on existing content based on content type?  
   **A:** No. Default to 'internal' for all. Users can modify going forward.

2. **Q:** How do we handle users with multiple roles?  
   **A:** Users have one role per organization. The `role_definitions` table handles this.

3. **Q:** What happens to existing 'vendor' role assignments?  
   **A:** Migrated to `vendor_admin` (primary contacts) or `vendor_investigator` (others).

---

## Related Documents

- [RGP Rollout Plan](./rgp-rollout-plan.md)
- [RGP Implementation Guide](./rgp-implementation-guide.md)
- [Authorization Model Specification](./authorization-model-specification.md)
- [Role Specification](./role-specification.md)

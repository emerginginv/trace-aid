# RGP System Phased Rollout Plan

> **Version:** 1.0  
> **Last Updated:** 2026-01-18  
> **Status:** Phase 1 - Documentation & Alignment

---

## Executive Summary

This document defines a five-phase rollout strategy for the CaseWyze RGP (Role, Group, Permission) system. Each phase is independently deployable and reversible, with clear acceptance criteria and testing requirements.

---

## Phase Overview

| Phase | Name | Duration | Risk | Status |
|-------|------|----------|------|--------|
| 1 | Documentation & Alignment | 1 sprint | None | 🟢 In Progress |
| 2 | Database Schema Alignment | 1 sprint | Medium | ⚪ Not Started |
| 3 | Permission Consistency | 1 sprint | High | ⚪ Not Started |
| 4 | UI Clarity | 1 sprint | Low | ⚪ Not Started |
| 5 | Admin Controls | 1-2 sprints | Medium | ⚪ Not Started |

---

## Current State Assessment

### What Exists Today

| Component | Status | Location |
|-----------|--------|----------|
| Authorization Model Spec | ✅ Complete | `docs/authorization-model-specification.md` |
| Role Specification | ✅ Complete | `docs/role-specification.md` |
| Permission Specification | ✅ Complete | `docs/permission-specification.md` |
| Access Group Specification | ✅ Complete | `docs/access-group-specification.md` |
| Access Resolution Specification | ✅ Complete | `docs/access-resolution-specification.md` |
| User Type Specification | ✅ Complete | `docs/user-type-specification.md` |
| Permission Constants | ✅ Complete | `src/constants/permissions.ts` |
| `usePermissions` Hook | ✅ Complete | `src/hooks/usePermissions.ts` |
| `PermissionGate` Component | ✅ Complete | `src/components/shared/PermissionGate.tsx` |
| `permissions` Table | ✅ Exists | Database (RLS enforced) |

### What Needs Implementation

| Component | Phase | Priority |
|-----------|-------|----------|
| `role_definitions` table with rank | Phase 2 | High |
| `access_group` field on `case_updates` | Phase 2 | High |
| `access_group` field on `case_attachments` | Phase 2 | High |
| `user_type` field on profiles | Phase 2 | High |
| `has_case_access()` DB function | Phase 3 | Critical |
| `is_access_group_member()` DB function | Phase 3 | Critical |
| Access resolution via RLS | Phase 3 | Critical |
| UI Access Group selector | Phase 4 | Medium |
| Role management admin UI | Phase 5 | Medium |

---

## Phase 1: Documentation & Alignment

**Duration:** 1 sprint (2 weeks)  
**Risk Level:** None  
**Rollback:** N/A (documentation only)

### Objectives

1. Finalize and publish all security model specifications
2. Create internal team documentation
3. Conduct stakeholder review sessions
4. Identify conflicts with existing behavior

### Deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| Specification Review | All `docs/*.md` | ⚪ Pending |
| Conflict Analysis | `docs/rgp-conflict-analysis.md` | ✅ Complete |
| Implementation Guide | `docs/rgp-implementation-guide.md` | ✅ Complete |
| Rollout Plan | `docs/rgp-rollout-plan.md` | ✅ Complete |

### Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| P1-AC1 | All 6 specification documents reviewed and signed off | ⚪ Pending |
| P1-AC2 | Conflict analysis document complete with resolution paths | ✅ Complete |
| P1-AC3 | Internal implementation guide published | ✅ Complete |
| P1-AC4 | Stakeholder presentation delivered | ⚪ Pending |
| P1-AC5 | No blocking conflicts identified | ✅ Complete |

### Exit Gate

- [ ] All specifications approved by Security Lead
- [ ] No unresolved conflicts blocking Phase 2
- [ ] Implementation guide reviewed by engineering team

---

## Phase 2: Database Schema Alignment

**Duration:** 1 sprint (2 weeks)  
**Risk Level:** Medium  
**Rollback:** Reverse migration scripts

### Objectives

1. Add `rank` field to role system via `role_definitions` table
2. Add `access_group` to content tables with safe defaults
3. Add `user_type` field to profiles
4. Create data migration for existing content

### Database Migrations

#### 2.1 Create Role Definitions Table

```sql
CREATE TABLE IF NOT EXISTS public.role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  user_type TEXT NOT NULL CHECK (user_type IN ('employee', 'client', 'vendor', 'vendor_contact')),
  is_system_role BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  can_be_deleted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, role_key)
);
```

#### 2.2 Add Access Group to Content Tables

```sql
-- Create access_group enum type
CREATE TYPE access_group_type AS ENUM (
  'admin_only',
  'internal',
  'public',
  'client_only',
  'vendor_only',
  'validation_required'
);

-- Add to case_updates
ALTER TABLE public.case_updates
ADD COLUMN access_group access_group_type NOT NULL DEFAULT 'internal';

-- Add to case_attachments
ALTER TABLE public.case_attachments
ADD COLUMN access_group access_group_type NOT NULL DEFAULT 'internal';
```

#### 2.3 Add User Type to Profiles

```sql
ALTER TABLE public.profiles
ADD COLUMN user_type TEXT DEFAULT 'employee'
CHECK (user_type IN ('employee', 'client', 'vendor', 'vendor_contact'));
```

### Rollback Procedure

```sql
-- Remove access_group columns
ALTER TABLE public.case_updates DROP COLUMN IF EXISTS access_group;
ALTER TABLE public.case_attachments DROP COLUMN IF EXISTS access_group;

-- Drop type
DROP TYPE IF EXISTS access_group_type;

-- Remove user_type
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_type;

-- Drop role_definitions
DROP TABLE IF EXISTS public.role_definitions;
```

### Acceptance Criteria

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| P2-AC1 | `role_definitions` table created with all 11 default roles | Database query |
| P2-AC2 | `access_group` column exists on `case_updates` with default 'internal' | Schema inspection |
| P2-AC3 | `access_group` column exists on `case_attachments` with default 'internal' | Schema inspection |
| P2-AC4 | `user_type` column exists on `profiles` | Schema inspection |
| P2-AC5 | All existing content has `access_group = 'internal'` | Data verification |
| P2-AC6 | Rollback script tested and verified | Rollback test |
| P2-AC7 | No user-visible behavior changes | Manual testing |
| P2-AC8 | Application continues to function normally | Smoke tests |

---

## Phase 3: Permission Consistency

**Duration:** 1 sprint (2 weeks)  
**Risk Level:** High  
**Rollback:** Feature flag to bypass new middleware

### Objectives

1. Implement access resolution logic as database functions
2. Add permission checks to all API endpoints via RLS
3. Ensure existing behavior is preserved
4. Add comprehensive logging for access decisions

### Core Database Functions

#### has_case_access(user_id, case_id)

Determines if a user has access to a specific case through:
- Direct assignment as investigator
- Assignment via Vendor
- Client linked to case's Account
- "View All Cases" permission

#### is_access_group_member(user_id, access_group, validation_status)

Determines if a user can view content with a specific access group based on their user type and role.

#### get_user_rank(user_id)

Returns the numeric rank of a user based on their role for comparison operations.

### Feature Flag

```sql
ALTER TABLE public.organizations
ADD COLUMN rgp_phase3_enabled BOOLEAN DEFAULT false;
```

When disabled, RLS policies fall back to pre-RGP behavior.

### Access Denial Logging

All access denials are logged to `access_denial_log` table for debugging and auditing.

### Acceptance Criteria

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| P3-AC1 | `has_case_access()` function returns correct results | Unit tests |
| P3-AC2 | `is_access_group_member()` function returns correct results | Unit tests |
| P3-AC3 | `get_user_rank()` function returns correct rank values | Unit tests |
| P3-AC4 | RLS policies enforce access group filtering | Integration tests |
| P3-AC5 | Feature flag can disable new RLS behavior | Toggle test |
| P3-AC6 | Access denials are logged | Log verification |
| P3-AC7 | All 20 edge cases from specification pass | Edge case tests |
| P3-AC8 | No performance regression (< 10ms added latency) | Load testing |

---

## Phase 4: UI Clarity

**Duration:** 1 sprint (2 weeks)  
**Risk Level:** Low  
**Rollback:** Hide new UI elements via feature flag

### Objectives

1. Add Access Group selector to update/file forms
2. Show user's effective permissions on profile page
3. Add "Why can't I see this?" helper in empty states
4. Improve role assignment UI with rank visualization

### Components to Create

| Component | Purpose |
|-----------|---------|
| `AccessGroupSelector` | Dropdown for selecting access group on content |
| `AccessGroupBadge` | Visual indicator of access group |
| `EffectivePermissions` | Display user's permissions on profile |
| `AccessRestrictedEmptyState` | Explain why content may be hidden |
| `RoleSelector` | Role assignment with rank visualization |

### Feature Flag

```sql
-- Stored in organization's plan_features JSONB
UPDATE organizations
SET plan_features = plan_features || '{"rgp_phase4_ui": true}'::jsonb;
```

### Acceptance Criteria

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| P4-AC1 | Access Group selector visible on update creation form | Visual inspection |
| P4-AC2 | Access Group selector filters based on user type | Role-based testing |
| P4-AC3 | Access Group badge displays on updates/files | Visual inspection |
| P4-AC4 | Effective permissions shown on user profile | Navigation test |
| P4-AC5 | Empty states include access explanation | Visual inspection |
| P4-AC6 | Role selector shows rank badges | Visual inspection |
| P4-AC7 | All new UI hidden when feature flag disabled | Toggle test |

---

## Phase 5: Admin Controls

**Duration:** 1-2 sprints (2-4 weeks)  
**Risk Level:** Medium  
**Rollback:** Disable admin section

### Objectives

1. Role management UI with clone-first workflow
2. Access Group management for custom groups
3. Permission matrix visualization
4. Audit log for permission changes

### Admin Pages

| Page | Route | Purpose |
|------|-------|---------|
| Role Management | `/settings/roles` | Create, clone, edit roles |
| Permission Matrix | `/settings/permissions` | Visual permission grid |
| Audit Log | `/settings/audit` | Permission change history |

### Clone-First Workflow

System roles cannot be directly modified. Admins must:
1. Select a system role as template
2. Clone it with a new name
3. Modify the clone's permissions
4. Assign users to the new role

### Permission Audit Log

All permission changes are logged with:
- Actor (who made the change)
- Action (grant/revoke/clone/delete)
- Target (role + permission)
- Previous and new values
- Timestamp

### Acceptance Criteria

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| P5-AC1 | Role management page accessible to admins | Navigation test |
| P5-AC2 | Clone role creates new role with same permissions | Functional test |
| P5-AC3 | Permission matrix displays all roles and permissions | Visual inspection |
| P5-AC4 | Permission toggles update database | Integration test |
| P5-AC5 | System roles cannot be modified | Attempt modification |
| P5-AC6 | Permission changes logged to audit table | Database verification |
| P5-AC7 | Audit log displays recent changes | Visual inspection |

---

## Testing Requirements

### Regression Test Coverage

| Phase | Test Type | Coverage Target |
|-------|-----------|-----------------|
| Phase 2 | Schema verification | 100% of new columns |
| Phase 3 | Access resolution functions | 100% of edge cases |
| Phase 3 | RLS policy enforcement | All CRUD operations |
| Phase 4 | UI component tests | All new components |
| Phase 5 | Admin workflow tests | Complete user journeys |

### Load Testing Thresholds

| Metric | Threshold | Phase |
|--------|-----------|-------|
| Permission check latency | < 10ms added | Phase 3 |
| Access group query time | < 50ms | Phase 3 |
| 95th percentile response | < 200ms | All phases |
| Error rate | < 0.1% | All phases |

### Edge Case Test Matrix

All 20 edge cases from `docs/access-resolution-specification.md` must pass before Phase 3 can exit.

---

## Rollback Procedures Summary

| Phase | Rollback Method | Recovery Time |
|-------|-----------------|---------------|
| Phase 1 | N/A (documentation only) | N/A |
| Phase 2 | Run reverse migration | < 5 minutes |
| Phase 3 | Set `rgp_phase3_enabled = false` | Immediate |
| Phase 4 | Remove `rgp_phase4_ui` from plan_features | Immediate |
| Phase 5 | Remove `rgp_admin_controls` from plan_features | Immediate |

---

## Related Documents

- [Authorization Model Specification](./authorization-model-specification.md)
- [Role Specification](./role-specification.md)
- [Permission Specification](./permission-specification.md)
- [Access Group Specification](./access-group-specification.md)
- [Access Resolution Specification](./access-resolution-specification.md)
- [User Type Specification](./user-type-specification.md)
- [Conflict Analysis](./rgp-conflict-analysis.md)
- [Implementation Guide](./rgp-implementation-guide.md)

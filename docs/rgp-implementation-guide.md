# RGP Implementation Guide

> **Version:** 1.0  
> **Last Updated:** 2026-01-18  
> **Audience:** Developers implementing RGP features

---

## Overview

This guide provides practical instructions for implementing the RGP (Role, Group, Permission) authorization system in CaseWyze. It covers coding standards, patterns, and common pitfalls.

---

## Quick Reference

### Permission Checks in Code

```typescript
// ✅ CORRECT: Use constants and hooks
import { PERMISSION_KEYS } from '@/constants/permissions';
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission } = usePermissions();
  
  if (hasPermission(PERMISSION_KEYS.CASES.CREATE)) {
    // User can create cases
  }
}
```

```typescript
// ❌ WRONG: Hardcoded strings
if (hasPermission('add_cases')) {
  // Typos will fail silently
}
```

### Permission-Gated UI

```tsx
// ✅ CORRECT: Use PermissionGate component
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION_KEYS } from '@/constants/permissions';

<PermissionGate permission={PERMISSION_KEYS.CASES.CREATE}>
  <Button onClick={handleCreateCase}>New Case</Button>
</PermissionGate>
```

```tsx
// ❌ WRONG: Manual conditional rendering everywhere
{hasPermission('add_cases') && <Button>New Case</Button>}
```

### Access Groups

```typescript
// ✅ CORRECT: Use ACCESS_GROUPS constant
import { ACCESS_GROUPS } from '@/constants/accessGroups';

const update = {
  title: 'Status Update',
  access_group: ACCESS_GROUPS.INTERNAL, // 'internal'
};
```

---

## Permission System

### Permission Keys

All permissions are defined in `src/constants/permissions.ts`:

```typescript
export const PERMISSION_KEYS = {
  CASES: {
    VIEW_ASSIGNED: 'view_assigned_cases',
    VIEW_ALL: 'view_all_cases',
    CREATE: 'add_cases',
    EDIT: 'edit_cases',
    DELETE: 'delete_cases',
    // ...
  },
  UPDATES: {
    VIEW: 'view_updates',
    CREATE: 'add_updates',
    EDIT_OWN: 'edit_own_updates',
    EDIT_ALL: 'edit_updates',
    DELETE: 'delete_updates',
  },
  // ... other domains
} as const;
```

### usePermissions Hook

```typescript
const {
  permissions,           // Record<string, boolean> of all permissions
  hasPermission,         // (key: string) => boolean
  hasAnyPermission,      // (keys: string[]) => boolean
  hasAllPermissions,     // (keys: string[]) => boolean
  loading,               // boolean
  role,                  // Current user's role key
} = usePermissions();
```

### PermissionGate Component

```tsx
<PermissionGate 
  permission={PERMISSION_KEYS.CASES.CREATE}
  fallback={<DisabledButton />}  // Optional
>
  <CreateCaseButton />
</PermissionGate>

// Multiple permissions (AND)
<PermissionGate 
  permissions={[PERMISSION_KEYS.CASES.CREATE, PERMISSION_KEYS.CASES.EDIT]}
  requireAll={true}
>
  <AdvancedCaseManager />
</PermissionGate>

// Multiple permissions (OR)
<PermissionGate 
  permissions={[PERMISSION_KEYS.ADMIN.MANAGE_USERS, PERMISSION_KEYS.ADMIN.MANAGE_ROLES]}
  requireAll={false}
>
  <AdminPanel />
</PermissionGate>
```

---

## Access Groups

### Access Group Values

| Value | Display Name | Who Can See |
|-------|--------------|-------------|
| `admin_only` | Admin Only | Super Admin, Admin roles |
| `internal` | Internal | All employees |
| `public` | Public | Everyone with case access |
| `client_only` | Client Only | Employees + Clients |
| `vendor_only` | Vendor Only | Employees + Vendors |
| `validation_required` | Pending | Admins until approved, then target group |

### Selecting Access Group in Forms

```tsx
import { AccessGroupSelector } from '@/components/shared/AccessGroupSelector';

function UpdateForm() {
  const [accessGroup, setAccessGroup] = useState('internal');
  
  return (
    <form>
      <AccessGroupSelector
        value={accessGroup}
        onChange={setAccessGroup}
        // Automatically filters based on user's type
      />
    </form>
  );
}
```

### Access Group Constants

```typescript
// src/constants/accessGroups.ts
export const ACCESS_GROUPS = {
  ADMIN_ONLY: 'admin_only',
  INTERNAL: 'internal',
  PUBLIC: 'public',
  CLIENT_ONLY: 'client_only',
  VENDOR_ONLY: 'vendor_only',
  VALIDATION_REQUIRED: 'validation_required',
} as const;

export type AccessGroup = typeof ACCESS_GROUPS[keyof typeof ACCESS_GROUPS];
```

---

## Role System

### Role Ranks

Higher rank = more authority. Use rank for:
- Determining if user can edit another's content
- Limiting which roles a user can assign to others
- Escalation workflows

```typescript
// Get current user's rank
const { rank } = useUserRole();

// Compare ranks
if (currentUserRank > targetUserRank) {
  // Can edit target user's content
}
```

### Role Hierarchy

| Role | Rank | User Type |
|------|------|-----------|
| Super Admin | 100 | Employee |
| Admin | 90 | Employee |
| Case Manager | 70 | Employee |
| Senior Investigator | 50 | Employee |
| Investigator | 40 | Employee |
| Billing Clerk | 30 | Employee |
| Client Admin | 50 | Client |
| Client Contact | 30 | Client |
| Client Viewer | 10 | Client |
| Vendor Admin | 50 | Vendor |
| Vendor Investigator | 30 | Vendor |

### Checking Role

```typescript
// ✅ CORRECT: Check permissions, not roles
if (hasPermission(PERMISSION_KEYS.ADMIN.MANAGE_USERS)) {
  // Can manage users
}

// ⚠️ SOMETIMES OK: Check role for UI grouping
if (userType === 'employee') {
  // Show employee-specific navigation
}

// ❌ WRONG: Check specific role for feature access
if (role === 'admin') {
  // Brittle - what about super_admin?
}
```

---

## Database Patterns

### RLS Policy with Access Groups

```sql
-- View updates with access group filtering
CREATE POLICY "Users can view updates"
ON public.case_updates FOR SELECT
USING (
  -- Step 1: Case access
  has_case_access(auth.uid(), case_id)
  AND
  -- Step 2: Access group membership
  is_access_group_member(auth.uid(), access_group, validation_status)
  AND
  -- Step 3: Permission check
  has_permission(auth.uid(), 'view_updates')
);
```

### Rank-Based Edit Policy

```sql
-- Edit updates if owner OR higher rank
CREATE POLICY "Users can update updates"
ON public.case_updates FOR UPDATE
USING (
  has_case_access(auth.uid(), case_id)
  AND (
    user_id = auth.uid()
    OR get_user_rank(auth.uid()) > get_user_rank(user_id)
    OR has_permission(auth.uid(), 'edit_updates')
  )
);
```

### Database Functions

#### has_case_access(user_id, case_id)

```sql
-- Returns TRUE if user can access the case through any path:
-- A. Direct assignment as investigator
-- B. Assignment via Vendor
-- C. Client linked to case's Account
-- D. Has "View All Cases" permission

SELECT has_case_access(auth.uid(), 'case-uuid-here');
```

#### is_access_group_member(user_id, access_group, validation_status)

```sql
-- Returns TRUE if user's type matches the access group requirements
-- Handles validation_required special case

SELECT is_access_group_member(auth.uid(), 'client_only', 'approved');
```

#### get_user_rank(user_id)

```sql
-- Returns integer rank for comparison (0-100)
-- Used for hierarchical permission checks

SELECT get_user_rank(auth.uid()); -- Returns 70 for Case Manager
```

---

## Common Patterns

### Pattern 1: Feature Gated by Permission

```tsx
function CaseActions({ caseId }: { caseId: string }) {
  const { hasPermission } = usePermissions();
  
  return (
    <div className="flex gap-2">
      <Button onClick={() => viewCase(caseId)}>
        View
      </Button>
      
      <PermissionGate permission={PERMISSION_KEYS.CASES.EDIT}>
        <Button onClick={() => editCase(caseId)}>
          Edit
        </Button>
      </PermissionGate>
      
      <PermissionGate permission={PERMISSION_KEYS.CASES.DELETE}>
        <Button variant="destructive" onClick={() => deleteCase(caseId)}>
          Delete
        </Button>
      </PermissionGate>
    </div>
  );
}
```

### Pattern 2: Content with Access Group

```tsx
function CreateUpdateDialog({ caseId }: { caseId: string }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    accessGroup: ACCESS_GROUPS.INTERNAL,
  });
  
  const handleSubmit = async () => {
    await supabase.from('case_updates').insert({
      case_id: caseId,
      title: form.title,
      content: form.content,
      access_group: form.accessGroup,
    });
  };
  
  return (
    <Dialog>
      <DialogContent>
        <Input 
          value={form.title} 
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
        />
        <Textarea 
          value={form.content} 
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))} 
        />
        <AccessGroupSelector
          value={form.accessGroup}
          onChange={v => setForm(f => ({ ...f, accessGroup: v }))}
        />
        <Button onClick={handleSubmit}>Create</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 3: Empty State with Access Explanation

```tsx
function UpdatesList({ caseId }: { caseId: string }) {
  const { data: updates, isLoading } = useUpdates(caseId);
  
  if (isLoading) return <Skeleton />;
  
  if (!updates?.length) {
    return (
      <AccessRestrictedEmptyState
        title="No updates found"
        description="This case may have updates that are not visible to you."
        reason="access_group"
      />
    );
  }
  
  return (
    <div>
      {updates.map(update => (
        <UpdateCard key={update.id} update={update} />
      ))}
    </div>
  );
}
```

### Pattern 4: Role-Based Navigation

```tsx
function AppSidebar() {
  const { userType, hasPermission } = usePermissions();
  
  return (
    <Sidebar>
      {/* Everyone sees these */}
      <SidebarItem href="/dashboard">Dashboard</SidebarItem>
      <SidebarItem href="/cases">Cases</SidebarItem>
      
      {/* Employees only */}
      {userType === 'employee' && (
        <>
          <SidebarItem href="/calendar">Calendar</SidebarItem>
          <SidebarItem href="/reports">Reports</SidebarItem>
        </>
      )}
      
      {/* Admin permissions */}
      <PermissionGate permission={PERMISSION_KEYS.ADMIN.MANAGE_USERS}>
        <SidebarItem href="/settings/users">User Management</SidebarItem>
      </PermissionGate>
    </Sidebar>
  );
}
```

---

## Testing Permissions

### Unit Test Pattern

```typescript
describe('PermissionGate', () => {
  it('shows children when user has permission', () => {
    const wrapper = renderWithPermissions(
      <PermissionGate permission="add_cases">
        <Button>Create Case</Button>
      </PermissionGate>,
      { permissions: { add_cases: true } }
    );
    
    expect(wrapper.getByText('Create Case')).toBeInTheDocument();
  });
  
  it('hides children when user lacks permission', () => {
    const wrapper = renderWithPermissions(
      <PermissionGate permission="add_cases">
        <Button>Create Case</Button>
      </PermissionGate>,
      { permissions: { add_cases: false } }
    );
    
    expect(wrapper.queryByText('Create Case')).not.toBeInTheDocument();
  });
});
```

### Integration Test Pattern

```typescript
describe('Case Creation', () => {
  it('allows case creation for users with add_cases permission', async () => {
    await loginAsRole('case_manager');
    
    const { data, error } = await supabase
      .from('cases')
      .insert({ title: 'Test Case' })
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data.title).toBe('Test Case');
  });
  
  it('denies case creation for users without permission', async () => {
    await loginAsRole('client_viewer');
    
    const { data, error } = await supabase
      .from('cases')
      .insert({ title: 'Test Case' });
    
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501'); // RLS violation
  });
});
```

---

## Migration Checklist

When adding a new permission-gated feature:

1. [ ] Add permission key to `PERMISSION_KEYS` in `src/constants/permissions.ts`
2. [ ] Add permission to `docs/permission-specification.md`
3. [ ] Insert permission rows for all roles in database
4. [ ] Use `PermissionGate` or `hasPermission()` in UI
5. [ ] Add RLS policy using `has_permission()` function
6. [ ] Write tests for permitted and denied cases

---

## Troubleshooting

### "User can't see content they should see"

1. Check `access_group` on the content
2. Check user's `user_type` in profiles
3. Check if user has case access via `has_case_access()`
4. Check `permissions` table for their role
5. Check `access_denial_log` for denial reason

### "Permission check not working"

1. Verify permission key matches exactly (case-sensitive)
2. Check `permissions` table has row for role + feature_key
3. Check `allowed` is `true`, not just row exists
4. Verify `usePermissions` hook is not in loading state

### "RLS policy blocking expected access"

1. Run query with `auth.uid()` to see what Supabase sees
2. Check each condition in policy separately
3. Verify database functions return expected values
4. Check if feature flag is enabled/disabled

---

## Related Documents

- [Permission Specification](./permission-specification.md) - Complete permission inventory
- [Access Group Specification](./access-group-specification.md) - Access group definitions
- [Access Resolution Specification](./access-resolution-specification.md) - Resolution algorithm
- [Role Specification](./role-specification.md) - Role definitions and ranks
- [RGP Rollout Plan](./rgp-rollout-plan.md) - Phased implementation plan

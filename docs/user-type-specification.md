# CaseWyze User Type Specification

## Document Purpose

This specification defines the four User Types in CaseWyze, their constraints, available roles, and validation rules for role assignment. User Type is **Layer 1** of the four-layer authorization model and acts as the "ceiling" for all subsequent access controls.

---

## 1. User Type Definitions

### USER TYPE: EMPLOYEE

| Attribute | Value |
|-----------|-------|
| **ID** | `employee` |
| **Description** | Internal staff members of the investigation agency |
| **Organization Relationship** | Direct membership in `organization_members` table |
| **Available Role Categories** | Admin, Case Manager, Investigator, Billing, Support |

**Case Assignment Rules:**
- Can be assigned to ANY case within the organization (subject to Access Group visibility)
- Case assignment via `case_investigators` table

**Special Access Rights:**
- ONLY Employees can access:
  - Financial data (billing rates, cost breakdowns, margins)
  - Admin settings (organization configuration, user management)
  - Billing operations (invoicing, expense approval)
  - Internal notes marked "Internal Only"
  - Vendor performance data and margin calculations

**Entity Relationship:**
```
profiles
  └── organization_members (role: admin | manager | investigator | member)
        └── case_investigators (for case assignment)
```

---

### USER TYPE: CLIENT

| Attribute | Value |
|-----------|-------|
| **ID** | `client` |
| **Description** | External customers who request and receive investigation services |
| **Organization Relationship** | Linked via `accounts` table (represents client company) |
| **Available Role Categories** | Client Admin, Client Contact, Client Viewer |

**Case Assignment Rules:**
- Can ONLY access cases where:
  - `cases.account_id` matches their linked account, OR
  - `case_requests.account_id` matches their linked account
- Cannot be assigned as investigators or support staff

**Special Access Restrictions:**
- CANNOT see:
  - Internal notes (Access Group: "Internal Only" or "Management")
  - Vendor information (names, assignments, contact details)
  - Cost data (investigator rates, expenses, margins)
  - Billing details beyond final billed amounts
  - Other client accounts' data
- CAN see:
  - Updates marked "Client Visible"
  - Final reports approved for client distribution
  - Invoice summaries (amount due only)
  - Case status and timeline

**Entity Relationship:**
```
profiles
  └── contacts (with account_id FK)
        └── accounts (client company)
              └── cases (via cases.account_id)
```

---

### USER TYPE: VENDOR

| Attribute | Value |
|-----------|-------|
| **ID** | `vendor` |
| **Description** | Subcontracted investigation companies |
| **Organization Relationship** | Linked via future `vendors` table (represents vendor company) |
| **Available Role Categories** | Vendor Admin, Vendor Investigator |

**Case Assignment Rules:**
- Can ONLY access cases where:
  - Explicitly assigned as a vendor via `case_vendors` junction table
- Cannot self-assign to cases

**Special Access Restrictions:**
- CANNOT see:
  - Client contact information (names, emails, phones)
  - Other vendors assigned to the same case
  - Margin/markup data (only sees their contracted rate)
  - Financial summaries beyond their own invoice
  - Management-level notes
- CAN see:
  - Case details necessary for assigned work
  - Subject information (with possible SSN masking)
  - Updates marked "Case Team" or "Vendor Visible"
  - Their own submitted updates and attachments

**Entity Relationship (Target):**
```
profiles
  └── vendor_contacts (with vendor_id FK)
        └── vendors (vendor company)
              └── case_vendors (junction table for case assignment)
```

---

### USER TYPE: VENDOR_CONTACT

| Attribute | Value |
|-----------|-------|
| **ID** | `vendor_contact` |
| **Description** | Individual investigators working for a Vendor company |
| **Organization Relationship** | Linked via parent Vendor entity |
| **Available Role Categories** | Vendor Contact (single role only) |

**Case Assignment Rules:**
- Can ONLY access cases where:
  - Parent Vendor is assigned to the case, AND
  - Individual is explicitly assigned to work on the case
- Inherits all case restrictions from parent Vendor

**Special Access Restrictions:**
- Inherits ALL restrictions from VENDOR type
- Additional restrictions:
  - Cannot manage other vendor contacts
  - Cannot view vendor company-level settings
  - Limited to assigned task completion only
- Access scope is NARROWER than parent Vendor

**Entity Relationship (Target):**
```
profiles
  └── vendor_contacts (with vendor_id FK, is_admin = false)
        └── vendors (vendor company)
              └── case_vendors (junction table for case assignment)
```

---

## 2. User Type Constraints

### Immutability Rule

```
CONSTRAINT: user_type_immutable
A user has exactly ONE User Type, assigned at creation time.
User Type CANNOT be changed after user creation.
```

**Enforcement:**
- Database: NOT NULL constraint on `user_type` column
- Application: Prevent user_type updates except by system migration
- Audit: Log any attempted user_type modifications as security events

### Role Filtering Rule

```
CONSTRAINT: role_filtered_by_user_type
Roles available in role-assignment dropdowns are filtered by User Type.
Users cannot be assigned roles outside their User Type category.
```

**Validation Matrix:**

| User Type | Allowed Roles | Prohibited Roles |
|-----------|--------------|------------------|
| employee | admin, manager, investigator, billing, support | client_admin, client_contact, client_viewer, vendor_admin, vendor_investigator, vendor_contact |
| client | client_admin, client_contact, client_viewer | admin, manager, investigator, billing, support, vendor_* |
| vendor | vendor_admin, vendor_investigator | admin, manager, investigator, billing, support, client_* |
| vendor_contact | vendor_contact | ALL others |

### Permission Ceiling Rule

```
CONSTRAINT: permission_ceiling
User Type determines the maximum possible permissions.
No role within a User Type can exceed that type's permission ceiling.
```

**Permission Ceilings:**

| Domain | Employee | Client | Vendor | Vendor Contact |
|--------|:--------:|:------:|:------:|:--------------:|
| view_finances | ✓ | Invoice only | Own rates | ✗ |
| edit_finances | ✓ | ✗ | ✗ | ✗ |
| manage_users | ✓ | Own account only | Own vendor only | ✗ |
| view_admin_settings | ✓ | ✗ | ✗ | ✗ |
| view_vendors | ✓ | ✗ | Self only | Self only |
| view_clients | ✓ | Own account | ✗ | ✗ |
| view_margins | ✓ | ✗ | ✗ | ✗ |
| view_internal_notes | ✓ | ✗ | ✗ | ✗ |

---

## 3. Validation Rules for Role Assignment

### Pre-Assignment Validation

Before any role assignment, the system MUST validate:

```typescript
function validateRoleAssignment(
  targetUserId: string,
  proposedRole: string,
  actorUserId: string
): ValidationResult {
  
  // 1. Get target user's User Type
  const targetUserType = getUserType(targetUserId);
  
  // 2. Get allowed roles for this User Type
  const allowedRoles = ROLE_MAP[targetUserType];
  
  // 3. Check if proposed role is allowed
  if (!allowedRoles.includes(proposedRole)) {
    return {
      valid: false,
      error: `Role '${proposedRole}' is not available for User Type '${targetUserType}'`
    };
  }
  
  // 4. Check actor's authority (rank rule)
  const actorRole = getUserRole(actorUserId);
  const actorRank = ROLE_RANKS[actorRole];
  const proposedRank = ROLE_RANKS[proposedRole];
  
  if (proposedRank >= actorRank) {
    return {
      valid: false,
      error: `Cannot assign role with equal or higher rank than your own`
    };
  }
  
  return { valid: true };
}
```

### Role-to-User-Type Mapping

```typescript
const ROLE_MAP = {
  employee: [
    'admin',           // Rank 100
    'manager',         // Rank 75
    'investigator',    // Rank 50
    'billing',         // Rank 45
    'support'          // Rank 40
  ],
  client: [
    'client_admin',    // Rank 40
    'client_contact',  // Rank 35
    'client_viewer'    // Rank 30
  ],
  vendor: [
    'vendor_admin',        // Rank 35
    'vendor_investigator'  // Rank 25
  ],
  vendor_contact: [
    'vendor_contact'   // Rank 20
  ]
};

const ROLE_RANKS = {
  admin: 100,
  manager: 75,
  investigator: 50,
  billing: 45,
  support: 40,
  client_admin: 40,
  client_contact: 35,
  client_viewer: 30,
  vendor_admin: 35,
  vendor_investigator: 25,
  vendor_contact: 20
};
```

### Cross-Type Management Rules

```
RULE: Employees can manage all user types (within rank limits)
RULE: Client Admins can ONLY manage users in their own Account
RULE: Vendor Admins can ONLY manage Vendor Contacts in their own Vendor company
RULE: Vendor Contacts cannot manage any users
```

---

## 4. Database Schema Requirements

To implement User Types, the following schema changes are required:

### New Enum Type

```sql
CREATE TYPE user_type AS ENUM (
  'employee',
  'client', 
  'vendor',
  'vendor_contact'
);
```

### Profiles Table Extension

```sql
ALTER TABLE profiles 
ADD COLUMN user_type user_type NOT NULL DEFAULT 'employee';

-- Make immutable after creation
CREATE OR REPLACE FUNCTION prevent_user_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    RAISE EXCEPTION 'User type cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_type_immutable
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_type_change();
```

### Extended Role Enum

```sql
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'billing';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client_contact';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client_viewer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vendor_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vendor_investigator';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vendor_contact';
```

### Role Validation Constraint

```sql
CREATE OR REPLACE FUNCTION validate_role_for_user_type()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type user_type;
  v_allowed_roles text[];
BEGIN
  -- Get user type from profiles
  SELECT user_type INTO v_user_type
  FROM profiles WHERE id = NEW.user_id;
  
  -- Define allowed roles per user type
  v_allowed_roles := CASE v_user_type
    WHEN 'employee' THEN 
      ARRAY['admin', 'manager', 'investigator', 'billing', 'support']
    WHEN 'client' THEN 
      ARRAY['client_admin', 'client_contact', 'client_viewer']
    WHEN 'vendor' THEN 
      ARRAY['vendor_admin', 'vendor_investigator']
    WHEN 'vendor_contact' THEN 
      ARRAY['vendor_contact']
  END;
  
  -- Validate role assignment
  IF NOT (NEW.role::text = ANY(v_allowed_roles)) THEN
    RAISE EXCEPTION 'Role % is not allowed for user type %', 
      NEW.role, v_user_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_role_user_type_match
  BEFORE INSERT OR UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_for_user_type();
```

---

## 5. Implementation Checklist

The following changes will be needed to implement User Types:

### Database Layer
- [ ] Add `user_type` enum
- [ ] Add `user_type` column to profiles table
- [ ] Extend `app_role` enum with new role values
- [ ] Add role validation trigger
- [ ] Create vendors table (for vendor company entities)
- [ ] Create vendor_contacts table (for vendor ↔ user linkage)

### Backend Layer
- [ ] Update create-user edge function to accept user_type
- [ ] Add getUserType() helper function
- [ ] Update role assignment validation

### Frontend Layer
- [ ] Filter role dropdowns by user_type
- [ ] Show user_type in user management UI
- [ ] Prevent user_type editing in user forms

### RLS Policies
- [ ] Update case visibility policies for client/vendor scoping
- [ ] Add user_type checks to sensitive data policies
- [ ] Implement permission ceiling enforcement

---

## 6. Migration Path

For existing users without an explicit user_type:

```sql
-- Infer user_type from current role
UPDATE profiles p
SET user_type = CASE 
  WHEN om.role IN ('admin', 'manager', 'investigator', 'member') THEN 'employee'
  WHEN om.role = 'vendor' THEN 'vendor'
  ELSE 'employee'
END
FROM organization_members om
WHERE p.id = om.user_id;
```

---

## Document Revision

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-18 | 1.0 | System | Initial User Type specification |

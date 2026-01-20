-- Insert Permissions and Access Control documentation
INSERT INTO public.help_articles (
  title,
  slug,
  content,
  category_id,
  summary,
  related_feature,
  is_active,
  display_order
) VALUES (
  'Permissions and Access Control Guide',
  'permissions-access-control-guide',
  '# Permissions and Access Control Guide

CaseWyze implements a comprehensive **Role-Based Access Control (RBAC)** system that protects sensitive investigation data while enabling efficient collaboration. This guide explains how permissions work, what each role can do, and security best practices.

---

## Why Access Control Matters

Investigation firms handle extremely sensitive data:

- **Personal Information**: SSNs, addresses, dates of birth
- **Financial Records**: Billing rates, client payments, firm revenue
- **Evidence**: Photos, surveillance footage, confidential documents
- **Client Communications**: Privileged information, legal strategies

Improper access creates serious risks:

| Risk | Consequence |
|------|-------------|
| **Data Breach** | Legal liability, reputation damage |
| **Evidence Tampering** | Case dismissal, criminal charges |
| **Billing Fraud** | Financial loss, client lawsuits |
| **Privacy Violation** | Regulatory fines, license revocation |

CaseWyze''s access control system is designed to **minimize exposure** while **maximizing productivity**.

---

## The Role Hierarchy

CaseWyze defines five user types organized in a capability hierarchy:

```
Admin (Full Access)
   ↓
Manager (Operational Control)
   ↓
Investigator (Field Work)
   ↓
Vendor (External Contributor)
   ↓
Requestor (Intake Only - No Login)
```

### Role Definitions

| Role | Primary Purpose | Typical User |
|------|-----------------|--------------|
| **Admin** | Full system control, organization settings | Firm owner, IT administrator |
| **Manager** | Case oversight, team management, billing | Case manager, operations director |
| **Investigator** | Field work, documentation, time tracking | Field investigator, analyst |
| **Vendor** | External collaboration on shared cases | Subcontractor, partner firm |
| **Requestor** | Case intake submission | Client, attorney (no system login) |

---

## What Each Role Can Do

### Admin Role

Admins have **complete access** to all system features. This role should be limited to firm owners and trusted IT personnel.

| Category | Capabilities |
|----------|--------------|
| **Organization** | Edit settings, manage billing, configure integrations |
| **Members** | Add/remove users, change roles, impersonate users |
| **Cases** | Full CRUD, assign any case, override restrictions |
| **Financial** | View all billing, manage retainers, configure rates |
| **Reports** | Access all templates, organization-wide analytics |
| **Settings** | Configure workflows, customize forms, manage permissions |

**Admin-Only Actions**:
- Delete organization members
- Change user roles
- Configure organization settings
- Manage API integrations
- View audit logs for all users
- Impersonate other users (for support)

### Manager Role

Managers have **operational control** over cases and teams. They can see and do almost everything except organization-level configuration.

| Category | Capabilities |
|----------|--------------|
| **Cases** | Full CRUD, assign investigators, manage budgets |
| **Team** | View all team members, assign work, review timesheets |
| **Financial** | Approve time/expenses, generate invoices, manage retainers |
| **Reports** | Generate all report types, view analytics |
| **Intake** | Review requests, approve/decline, configure forms |

**Manager Restrictions**:
- Cannot change organization settings
- Cannot add/remove organization members
- Cannot change user roles
- Cannot delete audit records

### Investigator Role

Investigators have **field-focused access** to cases they''re assigned to. They can document work but have limited editing and no deletion capabilities.

| Category | Capabilities |
|----------|--------------|
| **Cases** | View assigned cases, add updates/activities |
| **Documentation** | Create updates, upload attachments, record time |
| **Subjects** | View subjects, add new subjects |
| **Activities** | Create activities, complete own activities |
| **Reports** | Generate reports for assigned cases |

**Investigator Restrictions**:
- Cannot view unassigned cases
- Cannot edit others'' work
- Cannot delete any records
- Cannot access financial details (rates, invoices)
- Cannot approve time/expenses
- Cannot manage case assignments

### Vendor Role

Vendors have **highly restricted external access** for collaboration on shared cases. They can contribute but cannot see sensitive internal data.

| Category | Capabilities |
|----------|--------------|
| **Cases** | View specifically shared cases only |
| **Documentation** | Add updates and attachments to shared cases |
| **Subjects** | View subjects on shared cases |
| **Activities** | View activities (read-only) |

**Vendor Restrictions**:
- Cannot view any financial information
- Cannot see internal notes or communications
- Cannot access unshared cases
- Cannot edit or delete any records
- Cannot see organization member list
- Cannot generate reports
- Cannot access settings

### Requestor Role

Requestors are **external intake users** who submit case requests but do not have system login access.

| Category | Capabilities |
|----------|--------------|
| **Intake** | Submit case requests via public forms |
| **Files** | Attach documents to requests |

**Requestor Characteristics**:
- No system login credentials
- Cannot track request status
- Cannot view any case data
- Identified by submitted contact information

---

## Detailed Permission Matrix

### Case Management Permissions

| Permission | Admin | Manager | Investigator | Vendor |
|------------|:-----:|:-------:|:------------:|:------:|
| View all cases | ✅ | ✅ | ❌ | ❌ |
| View assigned cases | ✅ | ✅ | ✅ | ✅* |
| Create cases | ✅ | ✅ | ❌ | ❌ |
| Edit case details | ✅ | ✅ | ❌ | ❌ |
| Delete cases | ✅ | ❌ | ❌ | ❌ |
| Assign investigators | ✅ | ✅ | ❌ | ❌ |
| Change case status | ✅ | ✅ | ❌ | ❌ |
| Close cases | ✅ | ✅ | ❌ | ❌ |

*Vendors see only explicitly shared cases

### Documentation Permissions

| Permission | Admin | Manager | Investigator | Vendor |
|------------|:-----:|:-------:|:------------:|:------:|
| View updates | ✅ | ✅ | ✅ | ✅* |
| Create updates | ✅ | ✅ | ✅ | ✅* |
| Edit own updates | ✅ | ✅ | ✅ | ❌ |
| Edit others'' updates | ✅ | ✅ | ❌ | ❌ |
| Delete updates | ✅ | ✅ | ❌ | ❌ |
| View attachments | ✅ | ✅ | ✅ | ✅* |
| Upload attachments | ✅ | ✅ | ✅ | ✅* |
| Delete attachments | ✅ | ✅ | ❌ | ❌ |

*Only on shared cases

### Financial Permissions

| Permission | Admin | Manager | Investigator | Vendor |
|------------|:-----:|:-------:|:------------:|:------:|
| View billing rates | ✅ | ✅ | ❌ | ❌ |
| View invoices | ✅ | ✅ | ❌ | ❌ |
| Create invoices | ✅ | ✅ | ❌ | ❌ |
| Manage retainers | ✅ | ✅ | ❌ | ❌ |
| Record time entries | ✅ | ✅ | ✅ | ❌ |
| Approve time entries | ✅ | ✅ | ❌ | ❌ |
| View financial reports | ✅ | ✅ | ❌ | ❌ |
| Configure pricing | ✅ | ❌ | ❌ | ❌ |

### Subject Permissions

| Permission | Admin | Manager | Investigator | Vendor |
|------------|:-----:|:-------:|:------------:|:------:|
| View subjects | ✅ | ✅ | ✅ | ✅* |
| Create subjects | ✅ | ✅ | ✅ | ❌ |
| Edit subjects | ✅ | ✅ | ❌ | ❌ |
| Delete subjects | ✅ | ✅ | ❌ | ❌ |
| View SSN/sensitive data | ✅ | ✅ | ⚙️ | ❌ |

⚙️ = Configurable per organization

### Activity Permissions

| Permission | Admin | Manager | Investigator | Vendor |
|------------|:-----:|:-------:|:------------:|:------:|
| View activities | ✅ | ✅ | ✅ | ✅* |
| Create activities | ✅ | ✅ | ✅ | ❌ |
| Edit activities | ✅ | ✅ | ❌ | ❌ |
| Delete activities | ✅ | ✅ | ❌ | ❌ |
| Complete activities | ✅ | ✅ | ✅ | ❌ |
| Assign to others | ✅ | ✅ | ❌ | ❌ |

---

## Visibility Rules

### Organization Isolation

**Every piece of data is scoped to an organization.** Users can never see data from other organizations, regardless of their role.

| Rule | Implementation |
|------|----------------|
| All tables have `organization_id` | Data partitioning |
| RLS policies check membership | Backend enforcement |
| UI filters by organization | Frontend enforcement |
| API validates organization | Edge function checks |

### Case Visibility

| User Type | What They See |
|-----------|---------------|
| Admin/Manager | All cases in organization |
| Investigator | Cases where they are assigned |
| Vendor | Cases explicitly shared with them |

### Data Sensitivity Levels

| Level | Examples | Who Can See |
|-------|----------|-------------|
| **Public** | Case number, status | All assigned users |
| **Internal** | Updates, activities | Internal roles only |
| **Sensitive** | SSNs, financials | Manager+ only |
| **Restricted** | Audit logs, permissions | Admin only |

---

## External vs Internal Users

### Internal Users (Admin, Manager, Investigator)

| Characteristic | Details |
|----------------|---------|
| **Authentication** | Email/password or SSO |
| **Organization Membership** | Full member with role |
| **Access Scope** | Based on role permissions |
| **Audit Trail** | All actions logged with user ID |
| **Session Management** | Standard session with refresh |

### External Users (Vendor)

| Characteristic | Details |
|----------------|---------|
| **Authentication** | Email/password (limited) |
| **Organization Membership** | External member flag |
| **Access Scope** | Only shared cases |
| **Audit Trail** | All actions logged, marked external |
| **Session Management** | Shorter session timeout |
| **UI Experience** | Simplified interface |

### Key External User Restrictions

External users (Vendors) face additional restrictions:

| Restriction | Reason |
|-------------|--------|
| Cannot see member list | Protects staff privacy |
| Cannot see internal notes | Protects firm strategy |
| Cannot access financials | Protects billing information |
| Cannot see unshared cases | Need-to-know basis |
| Cannot generate reports | Prevents unauthorized distribution |
| Cannot access settings | No configuration access |

---

## How Permissions Protect Sensitive Data

### Layer 1: Frontend Enforcement

The UI checks permissions before rendering features:

```typescript
// Example: Subject page checks permission
if (!hasPermission(''view_subjects'')) {
  return <AccessRestricted />;
}
```

**What This Prevents**:
- Users don''t see buttons for actions they can''t perform
- Navigation hides inaccessible features
- Forms don''t appear for unauthorized operations

### Layer 2: Backend Enforcement (RLS)

PostgreSQL Row-Level Security enforces access at the database level:

```sql
-- Example: Retainer funds restricted to billing roles
CREATE POLICY "Billing roles can view retainer funds"
  ON retainer_funds FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), ''admin'') 
         OR has_role(auth.uid(), ''manager''))
  );
```

**What This Prevents**:
- Direct database queries can''t bypass UI
- API calls without proper permissions fail
- Even if UI is compromised, data is protected

### Layer 3: Audit Logging

All sensitive actions are logged immutably:

| Logged Information | Purpose |
|-------------------|---------|
| User ID | Who performed action |
| Timestamp | When it occurred |
| Action Type | What was done |
| Affected Records | What changed |
| IP Address | Where request originated |

**What This Enables**:
- Detect unauthorized access attempts
- Investigate security incidents
- Demonstrate compliance
- Support legal proceedings

---

## Why Certain Actions Are Restricted

### Delete Operations

**Why Restricted**: Deleted data cannot be recovered and may be required for legal/compliance reasons.

| Who Can Delete | What |
|----------------|------|
| Admin only | Users, organization data |
| Manager+ | Most case data (with audit trail) |
| No one | Audit logs, closed case data |

### Financial Access

**Why Restricted**: Billing information reveals firm profitability and client relationships.

| Restricted From | Because |
|-----------------|---------|
| Investigators | Don''t need billing rates to do their job |
| Vendors | External parties shouldn''t see internal pricing |
| Closed cases | Prevents retroactive billing changes |

### Role Changes

**Why Restricted**: Role elevation could grant unauthorized access to sensitive data.

| Restriction | Reason |
|-------------|--------|
| Admin-only | Prevents privilege escalation |
| Logged | Creates accountability |
| Cannot self-elevate | Prevents unauthorized access |

### Case Assignments

**Why Restricted**: Assignment determines what investigators can see.

| Restriction | Reason |
|-------------|--------|
| Manager+ only | Prevents investigators viewing unauthorized cases |
| Logged | Creates assignment audit trail |
| Requires case access | Can''t assign to cases you can''t see |

---

## Security Best Practices

### For Administrators

| Practice | Why |
|----------|-----|
| **Limit admin accounts** | Reduces high-privilege attack surface |
| **Review permissions quarterly** | Ensures appropriate access levels |
| **Use strong password policy** | Prevents credential compromise |
| **Enable MFA** | Adds authentication layer |
| **Audit user activity** | Detects anomalous behavior |
| **Remove departed users immediately** | Prevents unauthorized access |

### For Managers

| Practice | Why |
|----------|-----|
| **Assign minimum necessary access** | Principle of least privilege |
| **Review team assignments** | Ensure appropriate case access |
| **Verify vendor permissions** | Limit external exposure |
| **Monitor financial access** | Protect billing integrity |
| **Document permission changes** | Maintain audit trail |

### For Investigators

| Practice | Why |
|----------|-----|
| **Only access assigned cases** | Respect need-to-know boundaries |
| **Report suspicious activity** | Help identify security issues |
| **Log out when done** | Prevent session hijacking |
| **Don''t share credentials** | Maintain accountability |
| **Use secure connections** | Protect data in transit |

### For Vendors

| Practice | Why |
|----------|-----|
| **Access only what''s shared** | Respect access boundaries |
| **Don''t attempt to access other cases** | May trigger security alerts |
| **Protect login credentials** | Prevent unauthorized firm access |
| **Report access issues** | Get proper authorization |

---

## Common Permission Scenarios

### Scenario 1: New Investigator Onboarding

**Problem**: New investigator needs to start working on cases

**Solution**:
1. Admin or Manager creates user account
2. Assigns "Investigator" role
3. Assigns to specific cases
4. Investigator can now view and document those cases

**What They Can''t Do**:
- View other investigators'' cases
- Change case assignments
- Access financial information
- Delete any records

### Scenario 2: Subcontractor Collaboration

**Problem**: Need external investigator to assist on specific case

**Solution**:
1. Admin creates Vendor account
2. Manager shares specific case with Vendor
3. Vendor can view case and add updates
4. All Vendor activity is logged and marked external

**What They Can''t See**:
- Internal notes
- Billing information
- Other cases
- Staff directory

### Scenario 3: Manager Promotion

**Problem**: Senior investigator needs case management capabilities

**Solution**:
1. Admin changes role from Investigator to Manager
2. User gains access to all cases
3. Can now assign work and approve billing
4. Role change logged in audit trail

**What Changes**:
- Can view all organization cases
- Can assign investigators
- Can approve time/expenses
- Can generate invoices

### Scenario 4: Investigating Access Issues

**Problem**: User reports they can''t access a feature

**Troubleshooting Steps**:
1. Check user''s role (Settings → Members)
2. Verify role has required permission
3. Check if feature is organization-enabled
4. Review audit log for permission changes
5. Verify case assignment if case-specific

---

## Summary

CaseWyze''s permission system implements **defense in depth**:

1. **Role-Based Access**: Users only see what their role allows
2. **Organization Isolation**: Data never crosses organization boundaries
3. **Case Assignment**: Investigators see only assigned work
4. **Frontend Checks**: UI hides unauthorized features
5. **Backend Enforcement**: RLS policies prevent data bypass
6. **Audit Logging**: All actions are permanently recorded

This multi-layer approach ensures that even if one layer is compromised, other layers maintain protection. The result is a system where sensitive investigation data is protected while enabling efficient collaboration across internal and external teams.',
  '9465f035-71fe-43e1-b505-1ccab82412ac',
  'Complete guide to CaseWyze roles and permissions. Understand what Admin, Manager, Investigator, Vendor, and Requestor roles can access, why restrictions exist, and security best practices for protecting sensitive investigation data.',
  'settings',
  true,
  3
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category_id = EXCLUDED.category_id,
  summary = EXCLUDED.summary,
  related_feature = EXCLUDED.related_feature,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = now();
# Administrator Guide: Roles, Permissions & Access Control

This guide explains how to manage roles, permissions, and access groups in your organization. These controls determine what users can see and do within the system.

---

## Table of Contents

1. [Managing Roles and Permissions](#managing-roles-and-permissions)
2. [Understanding Access Groups](#understanding-access-groups)
3. [User Management](#user-management)
4. [Troubleshooting](#troubleshooting)

---

## Managing Roles and Permissions

### Overview

Your organization uses a role-based security system with **11 default roles** organized across three user types:

| User Type | Available Roles | Purpose |
|-----------|-----------------|---------|
| **Employee** | Super Admin, Admin, Case Manager, Senior Investigator, Investigator, Billing Clerk | Internal team members |
| **Client** | Client Admin, Client Contact, Client Viewer | External clients with case access |
| **Vendor** | Vendor Admin, Vendor Investigator | External vendors assigned to cases |

Each role has a **rank** (0-100) that determines authority. Higher rank = more authority.

---

### Viewing Existing Roles

**To view roles in your organization:**

1. Navigate to **Settings** > **Roles & Permissions**
2. You'll see a list of all roles with:
   - Role name and description
   - Rank (authority level)
   - User type (Employee, Client, or Vendor)
   - Number of users assigned
   - Whether it's a system role (cannot be deleted)

**Understanding the Role List:**

| Column | What It Means |
|--------|---------------|
| **Rank** | Higher numbers = more authority. A user with rank 70 can manage users with rank 50. |
| **System Role** | Marked roles cannot be deleted, but permissions can be adjusted. |
| **Users** | Count of people currently assigned this role. |

---

### Cloning a Role (Recommended Approach)

**Why clone instead of edit?** Cloning preserves your original role configuration while creating a variant. This is safer than modifying an existing role that may affect current users.

**To clone a role:**

1. Go to **Settings** > **Roles & Permissions**
2. Find the role you want to base your new role on
3. Click the **Clone** button (copy icon)
4. In the dialog:
   - Enter a **New Role Name** (e.g., "Field Investigator")
   - Enter a **Role Key** (system identifier, lowercase with underscores: `field_investigator`)
   - Adjust the **Rank** if needed
5. Click **Clone Role**
6. The new role opens in the editor with all permissions copied
7. Modify permissions as needed
8. Click **Save Changes**

**Example: Creating a "Read-Only Auditor" Role**

1. Clone the **Billing Clerk** role (rank 30)
2. Name it "Auditor" with key `auditor`
3. Set rank to 20 (lower than billing clerk)
4. Enable: View cases, View financials, View reports
5. Disable: Edit financials, Create invoices, Manage expenses
6. Save

---

### Modifying Permissions on a Role

**To edit a role's permissions:**

1. Go to **Settings** > **Roles & Permissions**
2. Select the role you want to modify
3. The permission editor shows permissions grouped by domain:

| Domain | Controls |
|--------|----------|
| **Cases** | Creating, viewing, editing, deleting cases |
| **Updates** | Posting and managing case updates |
| **Financials** | Time entries, expenses, invoices |
| **Reports** | Generating and viewing reports |
| **Users** | Managing team members |
| **Settings** | Organization configuration |

4. Toggle permissions on/off as needed
5. Click **Save Changes**

**Permission Inheritance:**

Some permissions are prerequisites for others. For example:
- `edit_case` requires `view_case`
- `delete_update` typically requires `edit_update`

The system will warn you if you create an inconsistent configuration.

---

### ⚠️ Important: Rank Implications

**Rank determines what users can do to each other's content:**

| If User A's Rank Is... | They Can... |
|------------------------|-------------|
| **Higher** than User B | Edit or delete User B's updates, reassign their cases |
| **Equal** to User B | Only manage their own content |
| **Lower** than User B | Only manage their own content |

**Example:**
- Senior Investigator (rank 50) uploads a file
- Investigator (rank 40) cannot edit that file
- Case Manager (rank 70) can edit that file

**Best Practice:** Keep rank differences meaningful. Don't give two unrelated roles the same rank unless you want them to have equal authority.

---

### Common Role Configurations

Here are patterns used by similar organizations:

#### 1. Read-Only Auditor
**Use case:** External compliance reviewer who needs to see everything but change nothing.

| Permission | Setting |
|------------|---------|
| View all cases | ✅ Enabled |
| View financials | ✅ Enabled |
| View reports | ✅ Enabled |
| Edit anything | ❌ Disabled |
| Rank | 15 (low) |

#### 2. Limited Case Manager
**Use case:** Team lead who manages cases but shouldn't access billing.

| Permission | Setting |
|------------|---------|
| View/edit cases | ✅ Enabled |
| Assign investigators | ✅ Enabled |
| View financials | ❌ Disabled |
| Manage billing | ❌ Disabled |
| Rank | 60 |

#### 3. External Reviewer (Client Type)
**Use case:** Client's attorney who needs detailed case access.

| Permission | Setting |
|------------|---------|
| View assigned cases | ✅ Enabled |
| View public + client updates | ✅ Enabled |
| Download reports | ✅ Enabled |
| View internal notes | ❌ Disabled |
| Rank | 40 |

#### 4. Administrative Assistant
**Use case:** Office staff handling scheduling but not case content.

| Permission | Setting |
|------------|---------|
| View case calendar | ✅ Enabled |
| Schedule activities | ✅ Enabled |
| View case details | ❌ Disabled |
| Edit case content | ❌ Disabled |
| Rank | 25 |

#### 5. Field-Only Investigator
**Use case:** Contractor who only reports surveillance results.

| Permission | Setting |
|------------|---------|
| View assigned cases | ✅ Enabled |
| Add updates to assigned cases | ✅ Enabled |
| Upload files | ✅ Enabled |
| View financials | ❌ Disabled |
| View other investigators' work | ❌ Disabled |
| Rank | 35 |

---

## Understanding Access Groups

### What Access Groups Control

**Access Groups** determine who can see specific content (updates, files, reports). Think of them as visibility labels you apply to content.

**Key Concept:** Even if someone has permission to view updates generally, they'll only see updates tagged with Access Groups they belong to.

---

### Default Access Groups

Your organization has six default Access Groups:

| Access Group | Who Can See It | When to Use |
|--------------|----------------|-------------|
| **Admin Only** | Super Admin, Admin only | Sensitive internal discussions, HR issues, legal strategy |
| **Internal** | All employees | Day-to-day case work, internal notes (default for most content) |
| **Public** | Everyone including clients and vendors | Final reports, approved summaries, shared documents |
| **Client Only** | Employees + Clients on the case | Updates meant for client visibility, draft reports for review |
| **Vendor Only** | Employees + Vendors on the case | Assignment details, vendor instructions |
| **Validation Required** | Pending admin approval before wider visibility | Content that needs review before sharing |

---

### Choosing the Right Access Group

Use this decision guide:

```
Is this content sensitive and for leadership only?
├── Yes → Admin Only
└── No ↓

Should clients be able to see this?
├── Yes → Is it ready for final viewing?
│         ├── Yes → Public
│         └── No → Client Only (or Validation Required)
└── No ↓

Should vendors assigned to this case see this?
├── Yes → Vendor Only
└── No → Internal (default)
```

**Quick Reference:**

| Content Type | Recommended Access Group |
|--------------|-------------------------|
| Investigation notes | Internal |
| Surveillance logs | Internal |
| Final case report | Public |
| Draft report for client review | Client Only |
| Vendor assignment instructions | Vendor Only |
| Personnel discussion | Admin Only |
| Billing details | Internal |
| Summary for client | Client Only or Public |

---

### Impact on Reports

When generating reports, Access Groups affect what's included:

| Report Type | Includes Content From |
|-------------|----------------------|
| **Internal Report** | Admin Only + Internal + Vendor Only + Client Only + Public |
| **Client Report** | Client Only + Public |
| **Vendor Report** | Vendor Only + Public |
| **Public Summary** | Public only |

**Important:** Users cannot generate reports that include Access Groups they can't see. An investigator cannot generate an Admin Only report.

---

### Impact on Notifications

Email and in-app notifications respect Access Groups:

| Notification Type | Who Receives |
|-------------------|--------------|
| New case update | Only users who can see that update's Access Group |
| File uploaded | Only users who can see that file's Access Group |
| Case status change | All users assigned to the case (status is always visible to assigned users) |

**Example:** If you post an "Admin Only" update, investigators assigned to the case will NOT receive a notification about it.

---

## User Management

### Creating Users by User Type

The user type determines which roles can be assigned:

#### Creating an Employee

1. Go to **Settings** > **Users**
2. Click **Add User**
3. Select **User Type: Employee**
4. Enter email and name
5. Choose a role (Super Admin through Billing Clerk)
6. Click **Create User**
7. They'll receive an invitation email

#### Creating a Client User

1. Go to **Accounts** > Select the client account
2. Navigate to **Contacts** tab
3. Click **Add Contact**
4. Check **Enable Portal Access**
5. Select a client role (Client Admin, Client Contact, or Client Viewer)
6. Click **Save**
7. They'll receive an invitation email

#### Creating a Vendor User

1. Go to **Vendors** > Select the vendor
2. Navigate to **Contacts** tab
3. Click **Add Contact**
4. Check **Enable Portal Access**
5. Select a vendor role (Vendor Admin or Vendor Investigator)
6. Click **Save**
7. They'll receive an invitation email

---

### Role Assignment Rules

Not all roles can be assigned to all user types:

| User Type | Can Be Assigned |
|-----------|-----------------|
| **Employee** | Super Admin, Admin, Case Manager, Senior Investigator, Investigator, Billing Clerk |
| **Client** | Client Admin, Client Contact, Client Viewer |
| **Vendor** | Vendor Admin, Vendor Investigator |

**You cannot:**
- Assign an employee role to a client contact
- Assign a client role to a vendor
- Assign a vendor role to an internal employee

If you need an employee to see things from a client perspective, create a test client contact for them (clearly labeled).

---

### Bulk Operations

#### Importing Users

1. Go to **Settings** > **Users** > **Import**
2. Download the CSV template
3. Fill in: Email, Name, User Type, Role
4. Upload the completed CSV
5. Review the preview
6. Click **Import Users**

#### Batch Role Changes

1. Go to **Settings** > **Users**
2. Use checkboxes to select multiple users
3. Click **Bulk Actions** > **Change Role**
4. Select the new role
5. Click **Apply**

**Note:** You can only batch-change users to roles within their user type. You cannot batch-change clients to employee roles.

---

### Common Workflows

#### Onboarding a New Investigator

1. Create user as Employee with Investigator role
2. Assign them to initial training cases
3. Add them to relevant case types in Settings
4. Have Case Manager assign them to active cases
5. Verify they can access expected cases

#### Adding a Client Contact

1. Verify the client's Account exists
2. Create contact with appropriate role:
   - **Client Admin**: Can manage other client users
   - **Client Contact**: Can view/comment on cases
   - **Client Viewer**: Read-only access
3. Link contact to specific cases if needed (or they see all account cases)
4. Send welcome email with login instructions

#### Offboarding a Team Member

1. Go to **Settings** > **Users**
2. Find the user and click **Deactivate**
3. Choose what to do with their cases:
   - Reassign to another user
   - Leave unassigned for manager review
4. Their access is revoked immediately
5. Audit log preserves their historical activity

---

## Troubleshooting

### Common Admin Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| User can't see a case they should access | Not assigned to case, or case's content uses restricted Access Group | Check case assignments; verify user's role includes needed Access Groups |
| User can see cases they shouldn't | Has "View All Cases" permission or assigned incorrectly | Review role permissions; check case assignments |
| Can't delete a role | Role is a system role or has users assigned | Remove users from role first; system roles cannot be deleted |
| Permission change didn't take effect | User needs to refresh/re-login | Have user log out and back in; check role was saved |
| Clone role button missing | Insufficient permissions | Only Admins and Super Admins can clone roles |

### If You Need Help

1. Check this guide's troubleshooting section
2. Contact your Super Admin
3. Reach out to support with:
   - User email experiencing the issue
   - Expected vs. actual behavior
   - Steps to reproduce

---

## Summary

| Concept | Key Point |
|---------|-----------|
| **Roles** | Define what actions a user can take (permissions) |
| **Rank** | Determines authority over other users' content |
| **Access Groups** | Control visibility of specific content |
| **User Types** | Employee, Client, or Vendor - determines available roles |

**Best Practices:**
- Clone roles instead of modifying existing ones
- Use meaningful rank differences
- Default to "Internal" for most content
- Review permissions quarterly
- Document custom roles in your organization's wiki

# CaseWyze Role Specification

## Document Purpose

This specification defines all default roles in CaseWyze, their ranks, user type mappings, and complete permission matrices. Roles represent Layer 2 of the four-layer authorization model and determine the base permissions available to users.

---

## 1. Role Overview by User Type

| User Type | Role Key | Display Name | Rank | Description |
|-----------|----------|--------------|:----:|-------------|
| **EMPLOYEE** | `super_admin` | Super Admin | 100 | Full system access, cannot be demoted except by another Super Admin |
| **EMPLOYEE** | `admin` | Admin | 90 | All permissions except: Manage Roles, Manage Billing Settings, Delete Company Data |
| **EMPLOYEE** | `case_manager` | Case Manager | 70 | Case lifecycle, assignments, financials, reports |
| **EMPLOYEE** | `senior_investigator` | Senior Investigator | 50 | Assigned cases, updates, files, can be Lead on cases |
| **EMPLOYEE** | `investigator` | Investigator | 40 | Assigned cases, updates, files (no expense approval) |
| **EMPLOYEE** | `billing_clerk` | Billing Clerk | 30 | Read-only cases, full financial/invoice access |
| **CLIENT** | `client_admin` | Client Admin | 50 | View cases, manage client users |
| **CLIENT** | `client_contact` | Client Contact | 30 | View cases, add public updates, download reports |
| **CLIENT** | `client_viewer` | Client Viewer | 10 | View cases, download reports only |
| **VENDOR** | `vendor_admin` | Vendor Admin | 50 | Assigned cases, manage vendor contacts |
| **VENDOR** | `vendor_investigator` | Vendor Investigator | 30 | Assigned cases, updates, files, expenses |

---

## 2. Employee Roles - Detailed Specifications

### Super Admin (Rank 100)

**Authority Scope:** Organization-wide, unrestricted

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **System** | manage_roles, manage_billing_settings, delete_company_data, view_audit_logs, manage_integrations, manage_api_keys |
| **Users** | view_users, add_users, edit_users, delete_users, impersonate_users, manage_user_roles |
| **Cases** | view_all_cases, add_cases, edit_cases, delete_cases, close_cases, reopen_cases, archive_cases |
| **Assignments** | assign_investigators, remove_investigators, change_lead_investigator |
| **Updates** | view_updates, add_updates, edit_updates, delete_updates, view_internal_updates |
| **Files** | view_files, upload_files, delete_files, manage_folders |
| **Financials** | view_financials, add_expenses, edit_expenses, approve_expenses, view_margins, manage_rates |
| **Invoicing** | view_invoices, create_invoices, edit_invoices, send_invoices, void_invoices |
| **Reports** | view_reports, generate_reports, schedule_reports, export_reports |
| **Clients** | view_clients, add_clients, edit_clients, delete_clients |
| **Vendors** | view_vendors, add_vendors, edit_vendors, delete_vendors |

**Special Rules:**
- All permissions enabled with no exceptions
- Cannot be deleted
- Cannot be demoted except by another Super Admin
- Only role that can access: Manage Roles, Manage Billing Settings, Delete Company Data
- Minimum of one Super Admin required per organization

---

### Admin (Rank 90)

**Authority Scope:** Organization-wide with restrictions

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **System** | view_audit_logs, manage_integrations |
| **Users** | view_users, add_users, edit_users, delete_users (rank < 90 only), manage_user_roles (rank < 90 only) |
| **Cases** | view_all_cases, add_cases, edit_cases, delete_cases, close_cases, reopen_cases, archive_cases |
| **Assignments** | assign_investigators, remove_investigators, change_lead_investigator |
| **Updates** | view_updates, add_updates, edit_updates, delete_updates, view_internal_updates |
| **Files** | view_files, upload_files, delete_files, manage_folders |
| **Financials** | view_financials, add_expenses, edit_expenses, approve_expenses, view_margins, manage_rates |
| **Invoicing** | view_invoices, create_invoices, edit_invoices, send_invoices, void_invoices |
| **Reports** | view_reports, generate_reports, schedule_reports, export_reports |
| **Clients** | view_clients, add_clients, edit_clients, delete_clients |
| **Vendors** | view_vendors, add_vendors, edit_vendors, delete_vendors |

**Excluded Permissions:**
- `manage_roles` - Cannot create/edit role definitions
- `manage_billing_settings` - Cannot manage payment methods, subscriptions
- `delete_company_data` - Cannot perform organization-level deletion
- `manage_api_keys` - Cannot create/revoke API keys
- `impersonate_users` - Cannot impersonate other users

**Special Rules:**
- Can manage users with rank < 90
- Cannot promote users to Admin or Super Admin
- Can be demoted by Super Admin only

---

### Case Manager (Rank 70)

**Authority Scope:** All cases within organization

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_all_cases, add_cases, edit_cases, close_cases, reopen_cases |
| **Assignments** | assign_investigators, remove_investigators, change_lead_investigator |
| **Updates** | view_updates, add_updates, edit_updates, view_internal_updates |
| **Files** | view_files, upload_files, manage_folders |
| **Financials** | view_financials, add_expenses, edit_expenses, approve_expenses |
| **Invoicing** | view_invoices, create_invoices, edit_invoices |
| **Reports** | view_reports, generate_reports, export_reports |
| **Clients** | view_clients |
| **Vendors** | view_vendors |

**Excluded Permissions:**
- All system administration
- User management
- Delete operations (cases, files, updates)
- Billing settings, rate management
- Margin visibility

**Special Rules:**
- Primary role for day-to-day case operations
- Can approve expenses up to organization-defined limits
- Cannot delete cases (only archive)

---

### Senior Investigator (Rank 50)

**Authority Scope:** Assigned cases only

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_assigned_cases |
| **Updates** | view_updates, add_updates, edit_own_updates |
| **Files** | view_files, upload_files |
| **Financials** | view_case_financials_summary, submit_expenses |
| **Time** | view_own_time, add_time_entries, edit_own_time |
| **Reports** | view_reports (assigned cases) |

**Excluded Permissions:**
- View all cases
- Case creation/editing
- Assignment management
- Expense approval
- Invoice access
- Client/vendor management

**Special Rules:**
- Can be assigned as Lead Investigator on cases
- Can view financial summary but not detailed margins
- Time entries auto-populate from activity logs
- Can edit own updates within 24-hour window

---

### Investigator (Rank 40)

**Authority Scope:** Assigned cases only

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_assigned_cases |
| **Updates** | view_updates, add_updates, edit_own_updates |
| **Files** | view_files, upload_files |
| **Financials** | submit_expenses |
| **Time** | view_own_time, add_time_entries |

**Excluded Permissions:**
- All Senior Investigator exclusions PLUS:
- `view_case_financials_summary`
- `edit_own_time` (time entries are locked after submission)
- Cannot be Lead Investigator

**Special Rules:**
- Cannot view case financials (even summary)
- Cannot be assigned as Lead on cases
- Expense submissions require manager approval
- Time entries locked after 48 hours

---

### Billing Clerk (Rank 30)

**Authority Scope:** All cases (read-only), full financial access

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_all_cases (read-only) |
| **Updates** | view_updates |
| **Files** | view_files |
| **Financials** | view_financials, add_expenses, edit_expenses, view_margins, manage_rates |
| **Invoicing** | view_invoices, create_invoices, edit_invoices, send_invoices, void_invoices |
| **Reports** | view_reports, generate_reports (financial only), export_reports |
| **Clients** | view_clients |

**Excluded Permissions:**
- Add/edit updates
- Manage case assignments
- Upload files
- Case lifecycle operations
- Vendor management

**Special Rules:**
- Read-only access to case content
- Full access to financial operations
- Cannot approve expenses (segregation of duties)
- Can manage billing rates and invoice templates

---

## 3. Client Roles - Detailed Specifications

### Client Admin (Rank 50)

**Authority Scope:** Cases belonging to their Account

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_account_cases |
| **Updates** | view_public_updates, add_updates (Public group only) |
| **Files** | view_public_files |
| **Reports** | view_reports, download_reports |
| **Users** | manage_account_users |

**Access Group Ceiling:** `client_visible`

**Excluded Permissions (enforced by User Type):**
- View internal notes
- View vendor information
- View cost data (only billed amounts)
- View other accounts' cases
- Any system administration

**Special Rules:**
- Can only add updates with Access Group = "Client Visible" or "All"
- Can manage other Client users within their Account
- Cannot promote users to Employee roles
- Invoice access limited to summary amounts

---

### Client Contact (Rank 30)

**Authority Scope:** Cases belonging to their Account

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_account_cases |
| **Updates** | view_public_updates, add_updates (Public group only) |
| **Files** | view_public_files |
| **Reports** | view_reports, download_reports |

**Access Group Ceiling:** `client_visible`

**Excluded Permissions:**
- All Client Admin exclusions PLUS:
- `manage_account_users`

**Special Rules:**
- Primary role for client points of contact
- Cannot manage other client users
- Same case access as Client Admin

---

### Client Viewer (Rank 10)

**Authority Scope:** Cases belonging to their Account (view-only)

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_account_cases |
| **Files** | view_public_files |
| **Reports** | download_reports |

**Access Group Ceiling:** `client_visible`

**Excluded Permissions:**
- All Client Contact exclusions PLUS:
- `add_updates`
- `view_public_updates` (can only see final reports)

**Special Rules:**
- Strictly read-only access
- Cannot add any updates or comments
- Suitable for client executives who only need status visibility

---

## 4. Vendor Roles - Detailed Specifications

### Vendor Admin (Rank 50)

**Authority Scope:** Cases where their Vendor company is assigned

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_assigned_vendor_cases |
| **Updates** | view_vendor_updates, add_updates |
| **Files** | view_files, upload_files |
| **Financials** | submit_expenses, view_own_rates |
| **Time** | view_vendor_time, add_time_entries |
| **Users** | manage_vendor_contacts |

**Access Group Ceiling:** `case_team`

**Excluded Permissions (enforced by User Type):**
- View client contact information
- View other vendors on same case
- View margin/markup data
- View management-level notes

**Special Rules:**
- Can manage Vendor Contact users for their company
- Expenses submitted require employee approval
- Can see their contracted rates but not client-billed amounts
- File uploads tagged with vendor attribution

---

### Vendor Investigator (Rank 30)

**Authority Scope:** Cases where their Vendor company is assigned

**Permissions:**
| Domain | Permissions |
|--------|-------------|
| **Cases** | view_assigned_vendor_cases |
| **Updates** | view_vendor_updates, add_updates |
| **Files** | view_files, upload_files |
| **Financials** | submit_expenses |
| **Time** | add_time_entries |

**Access Group Ceiling:** `case_team`

**Excluded Permissions:**
- All Vendor Admin exclusions PLUS:
- `manage_vendor_contacts`
- `view_own_rates`
- `view_vendor_time`

**Special Rules:**
- Cannot view rate information
- Cannot manage other vendor users
- Individual contributor role for subcontracted work

---

## 5. Complete Permission Matrix

### Legend
- ✓ = Permission granted
- ○ = Limited/conditional access
- ✗ = Permission denied

### System Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| manage_roles | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| manage_billing_settings | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| delete_company_data | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| view_audit_logs | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| manage_integrations | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| manage_api_keys | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### User Management Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| view_users | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ○ | ✗ | ✗ | ○ | ✗ |
| add_users | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ○ | ✗ | ✗ | ○ | ✗ |
| edit_users | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ○ | ✗ | ✗ | ○ | ✗ |
| delete_users | ✓ | ○ | ✗ | ✗ | ✗ | ✗ | ○ | ✗ | ✗ | ○ | ✗ |
| manage_user_roles | ✓ | ○ | ✗ | ✗ | ✗ | ✗ | ○ | ✗ | ✗ | ○ | ✗ |
| impersonate_users | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

*○ for Admin = rank < 90 only; ○ for ClientAdmin = same account only; ○ for VendorAdmin = same vendor only*

### Case Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| view_all_cases | ✓ | ✓ | ✓ | ✗ | ✗ | ○ | ✗ | ✗ | ✗ | ✗ | ✗ |
| view_assigned_cases | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| add_cases | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| edit_cases | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| delete_cases | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| close_cases | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| reopen_cases | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| archive_cases | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

*○ for Billing = read-only access*

### Assignment Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| assign_investigators | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| remove_investigators | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| change_lead_investigator | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| be_lead_investigator | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Update Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| view_updates | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ○ | ○ | ✗ | ○ | ○ |
| add_updates | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ○ | ○ | ✗ | ✓ | ✓ |
| edit_updates | ✓ | ✓ | ✓ | ○ | ○ | ✗ | ✗ | ✗ | ✗ | ○ | ○ |
| delete_updates | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| view_internal_updates | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

*○ for SrInv/Inv = own updates only; ○ for Client = public group only; ○ for Vendor = case team group only*

### File Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| view_files | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ○ | ○ | ○ | ✓ | ✓ |
| upload_files | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| delete_files | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| manage_folders | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

*○ for Client = public files only*

### Financial Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| view_financials | ✓ | ✓ | ✓ | ○ | ✗ | ✓ | ✗ | ✗ | ✗ | ○ | ✗ |
| add_expenses | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| edit_expenses | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| approve_expenses | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| view_margins | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| manage_rates | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

*○ for SrInv = summary only; ○ for VendorAdmin = own rates only*

### Invoice Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| view_invoices | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ○ | ○ | ○ | ✗ | ✗ |
| create_invoices | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| edit_invoices | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| send_invoices | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| void_invoices | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

*○ for Client = summary amounts only*

### Report Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| view_reports | ✓ | ✓ | ✓ | ○ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| generate_reports | ✓ | ✓ | ✓ | ✗ | ✗ | ○ | ✗ | ✗ | ✗ | ✗ | ✗ |
| schedule_reports | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| export_reports | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| download_reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

*○ for SrInv = assigned cases only; ○ for Billing = financial reports only*

### Client/Vendor Management Permissions

| Permission | SuperAdmin | Admin | CaseMgr | SrInv | Inv | Billing | ClientAdmin | ClientContact | ClientViewer | VendorAdmin | VendorInv |
|------------|:----------:|:-----:|:-------:|:-----:|:---:|:-------:|:-----------:|:-------------:|:------------:|:-----------:|:---------:|
| view_clients | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ○ | ✗ | ✗ | ✗ | ✗ |
| add_clients | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| edit_clients | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ○ | ✗ | ✗ | ✗ | ✗ |
| delete_clients | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| view_vendors | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ○ | ✗ |
| add_vendors | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| edit_vendors | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ○ | ✗ |
| delete_vendors | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

*○ for ClientAdmin = own account only; ○ for VendorAdmin = own vendor only*

---

## 6. Custom Role Rules

### Role Creation by Cloning

New custom roles MUST be created by cloning an existing role:

```
RULE: clone_to_create
New roles are created by selecting a source role and copying its permissions.
The cloned role can then have permissions modified (within User Type ceiling).
```

**Clone Process:**
1. Select source role (must be same User Type)
2. Enter new role name (unique within User Type)
3. System copies all permissions from source
4. Adjust permissions as needed
5. Optionally adjust rank (±10 from source)

### Rank Inheritance and Adjustment

```
RULE: rank_inheritance
Custom roles inherit the rank of their source role.
Rank can be adjusted by ±10 from the source role's rank.
```

**Examples:**
- Clone from `case_manager` (rank 70): new role can be rank 60-80
- Clone from `investigator` (rank 40): new role can be rank 30-50
- Rank cannot go below 10 or above 100

### Naming Uniqueness

```
RULE: name_uniqueness
Role names must be unique within a User Type.
Different User Types can have roles with the same name.
```

**Valid:**
- Employee role "Case Specialist" + Client role "Case Specialist" ✓

**Invalid:**
- Two Employee roles named "Case Specialist" ✗

### Clone Restrictions

```
RULE: clone_restrictions
- Cannot clone Super Admin role
- Cannot clone cross-User-Type (e.g., cannot clone Employee role for Client)
- Custom roles cannot exceed their User Type's permission ceiling
```

### Permission Ceiling Enforcement

Custom roles are subject to User Type permission ceilings:

| User Type | Permission Ceiling |
|-----------|-------------------|
| Employee | Full system access possible |
| Client | Cannot see internal notes, vendors, costs |
| Vendor | Cannot see clients, other vendors, margins |

---

## 7. TypeScript Constants for Implementation

```typescript
/**
 * Default roles organized by User Type
 */
export const DEFAULT_ROLES: Record<UserType, string[]> = {
  employee: [
    'super_admin',
    'admin', 
    'case_manager',
    'senior_investigator',
    'investigator',
    'billing_clerk'
  ],
  client: [
    'client_admin',
    'client_contact',
    'client_viewer'
  ],
  vendor: [
    'vendor_admin',
    'vendor_investigator'
  ],
  vendor_contact: [
    'vendor_contact'
  ]
};

/**
 * Role ranks determine authority hierarchy
 */
export const ROLE_RANKS: Record<string, number> = {
  // Employee roles
  super_admin: 100,
  admin: 90,
  case_manager: 70,
  senior_investigator: 50,
  investigator: 40,
  billing_clerk: 30,
  
  // Client roles
  client_admin: 50,
  client_contact: 30,
  client_viewer: 10,
  
  // Vendor roles  
  vendor_admin: 50,
  vendor_investigator: 30,
  vendor_contact: 20
};

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  case_manager: 'Case Manager',
  senior_investigator: 'Senior Investigator',
  investigator: 'Investigator',
  billing_clerk: 'Billing Clerk',
  client_admin: 'Client Admin',
  client_contact: 'Client Contact',
  client_viewer: 'Client Viewer',
  vendor_admin: 'Vendor Admin',
  vendor_investigator: 'Vendor Investigator',
  vendor_contact: 'Vendor Contact'
};

/**
 * System roles that cannot be deleted or cloned
 */
export const SYSTEM_ROLES: string[] = [
  'super_admin',
  'admin',
  'case_manager',
  'senior_investigator', 
  'investigator',
  'billing_clerk',
  'client_admin',
  'client_contact',
  'client_viewer',
  'vendor_admin',
  'vendor_investigator',
  'vendor_contact'
];

/**
 * Validate if a role can be assigned to a user of given type
 */
export function isRoleValidForUserType(role: string, userType: UserType): boolean {
  const allowedRoles = DEFAULT_ROLES[userType] || [];
  return allowedRoles.includes(role);
}

/**
 * Get the rank for a role
 */
export function getRoleRank(role: string): number {
  return ROLE_RANKS[role] ?? 0;
}

/**
 * Check if actor can assign a role to target
 */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
  const actorRank = getRoleRank(actorRole);
  const targetRank = getRoleRank(targetRole);
  return actorRank > targetRank;
}
```

---

## 8. Database Schema Updates

### Extend app_role Enum

```sql
-- Add new role values to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'case_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'senior_investigator';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'billing_clerk';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client_contact';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client_viewer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vendor_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vendor_investigator';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vendor_contact';
```

### Role Metadata Table (for custom roles)

```sql
CREATE TABLE public.role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  user_type user_type NOT NULL,
  rank INTEGER NOT NULL CHECK (rank >= 10 AND rank <= 100),
  permissions JSONB NOT NULL DEFAULT '{}',
  source_role TEXT, -- NULL for system roles, source role_key for cloned roles
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(organization_id, role_key),
  UNIQUE(organization_id, user_type, display_name)
);

-- RLS policies
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles in their organization"
  ON public.role_definitions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage roles"
  ON public.role_definitions FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
```

---

## 9. Migration Path

### Mapping Existing Roles

| Current Role | New Role | Rank |
|--------------|----------|:----:|
| `admin` | `admin` | 90 |
| `manager` | `case_manager` | 70 |
| `investigator` | `investigator` | 40 |
| `member` | `investigator` | 40 |
| `vendor` | `vendor_investigator` | 30 |

### Migration SQL

```sql
-- Update existing role assignments to new role names
UPDATE organization_members
SET role = CASE role::text
  WHEN 'manager' THEN 'case_manager'
  WHEN 'member' THEN 'investigator'
  WHEN 'vendor' THEN 'vendor_investigator'
  ELSE role::text
END::app_role;

-- Identify first admin in each org as super_admin
WITH first_admins AS (
  SELECT DISTINCT ON (organization_id) id, organization_id
  FROM organization_members
  WHERE role = 'admin'
  ORDER BY organization_id, created_at ASC
)
UPDATE organization_members om
SET role = 'super_admin'
FROM first_admins fa
WHERE om.id = fa.id;
```

---

## Document Revision

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-18 | 1.0 | System | Initial role specification with permission matrices |

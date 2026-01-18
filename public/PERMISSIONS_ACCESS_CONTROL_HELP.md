# Permissions and Access Control - Contextual Help Reference

This document serves as a master reference for all permissions and access control messaging used throughout the application. It ensures consistent language and explanations across all features.

## Role Definitions

### Admin
- **Description**: Full access to all features. Can manage all settings, users, and permissions.
- **Internal/External**: Internal staff
- **Key Capabilities**: User management, permissions configuration, organization settings, all data access
- **Tooltip**: "Full access to all features. Admin permissions are locked for security."

### Manager  
- **Description**: Case oversight and client management. Cannot modify user permissions.
- **Internal/External**: Internal staff
- **Key Capabilities**: All case operations, client management, report generation, financial oversight
- **Tooltip**: "Case oversight and client management. Cannot modify user permissions."

### Investigator
- **Description**: Fieldwork and case documentation. Financial data visibility is restricted.
- **Internal/External**: Internal staff  
- **Key Capabilities**: Assigned case work, update creation, activity logging, own time entries
- **Tooltip**: "Fieldwork and case documentation. Financial data visibility is restricted."

### Vendor
- **Description**: External contractor. Limited to assigned cases with restricted client data access.
- **Internal/External**: External contractor
- **Key Capabilities**: View assigned cases, submit updates, upload attachments
- **Tooltip**: "External contractor. Limited to assigned cases with restricted client data visibility."

## Data Visibility Matrix

| Data Type | Admin | Manager | Investigator | Vendor |
|-----------|:-----:|:-------:|:------------:|:------:|
| Subject SSN | ✓ | ✓ | ✗ | ✗ |
| Billing Rates | ✓ | ✓ | ✗ | ✗ |
| Staff Compensation | ✓ | View only | Own only | ✗ |
| Client Contacts | ✓ | ✓ | ✓ | ✗ |
| Case Finances | ✓ | ✓ | Per permission | ✗ |
| Attachments | ✓ | ✓ | Per permission | Per case |
| Generated Reports | ✓ | ✓ | View only | ✗ |
| Audit Logs | ✓ | ✓ | ✗ | ✗ |
| User List | ✓ | ✓ | ✗ | ✗ |
| Organization Settings | ✓ | ✗ | ✗ | ✗ |

## Permission Feature Groups

### Cases
- **Description**: Controls who can create, view, edit, and close cases.
- **Note**: View permission is required for all other case actions.
- **Security Impact**: High - cases contain sensitive investigation data.

### Subjects
- **Description**: Subject data includes personal information like SSNs.
- **Note**: Restricting view access hides subject details entirely.
- **Security Impact**: Very High - contains PII.

### Finances
- **Description**: Financial access includes time entries, expenses, and invoices.
- **Note**: Billing rates are always restricted to Admin/Manager.
- **Security Impact**: High - contains pricing and client billing data.

### Updates
- **Description**: Case updates document investigation progress.
- **Note**: Edit/delete permissions can be scoped to 'own' entries only.
- **Security Impact**: Medium - audit trail preservation is critical.

### Administration
- **Description**: Admin-only features for user management, permissions, and settings.
- **Note**: These permissions cannot be delegated to non-admin roles.
- **Security Impact**: Critical - controls system access.

## Access Restricted Messages

### Subjects Tab
**Short**: "You don't have permission to view subjects."
**Detailed**: "Subject information is restricted to protect personal data. Your role does not include subject access for this case. Subject profiles may contain sensitive information like SSNs, addresses, and personal identifiers that require controlled access."

### Finances Tab
**Short**: "You don't have permission to view finances."
**Detailed**: "Financial data is restricted based on your role and case assignment. Billing rates, client invoices, and expense details require management oversight. This protects both client confidentiality and internal pricing. Investigators can view their own time entries on the My Time page."

### Attachments Tab
**Short**: "You don't have permission to view attachments."
**Detailed**: "Attachment access is controlled to protect case evidence and documentation. Case files may contain sensitive evidence, legal documents, or privileged communications. Access is granted based on case assignment and role."

## Vendor Access Restrictions

**Banner Message**: "Vendor Access - You're viewing this case as an external contractor."

**What vendors can do**:
- View case details and subject information
- Submit updates and activity timelines
- Upload attachments for their work

**What's restricted**:
- Client contact information (privacy protection)
- Account and billing details (internal only)
- Other cases not assigned to them
- Financial data and invoices

**Why**: "This ensures client confidentiality while allowing you to complete your assignment."

## Security Reassurance Messages

| Context | Icon | Message |
|---------|------|---------|
| Personal data form | Shield | "Personal information is encrypted and access-controlled." |
| SSN display | Shield | "SSNs are masked in logs and restricted to authorized roles." |
| Case request submission | Lock | "Your submission is encrypted and only accessible by authorized staff." |
| Attachment upload | Shield | "Files are stored securely and access is logged." |
| Financial entry | Lock | "Financial records are audit-logged and protected by role-based access." |
| User invite | Shield | "Credentials are transmitted securely. Users set their own password on first login." |

## Why Actions Are Restricted

| Action | Reason |
|--------|--------|
| Delete Case | Prevents accidental data loss. Cases are permanent records needed for legal/compliance. |
| Generate Report | Reports are client-facing deliverables requiring quality review before distribution. |
| Manage Users | Admin-only to maintain security. Includes account creation, role changes, password resets. |
| View Audit Logs | Contains detailed system activity for compliance and security monitoring. |
| Edit Others' Time | Only own entries editable. Manager approval required for others' modifications. |
| Approve Expenses | Requires Manager/Admin for proper authorization and budget control. |

## External vs Internal Visibility

### Internal Users (Admin, Manager, Investigator)
- Can see client company and contact details
- Full case details based on role permissions
- Financial data per permission settings
- All access is logged for compliance

### External Users (Vendor)
- Cannot see client company or contact details
- Cannot access cases not assigned to them
- Cannot view billing or invoice information
- Updates they submit are logged with their identity
- Limited to case-specific work only


-- Add comprehensive Public Case Request Forms documentation
-- 5 articles in the Case Requests and Intake category

-- Article 1: Understanding Public Case Request Forms
INSERT INTO public.help_articles (
  category_id,
  title,
  slug,
  summary,
  content,
  display_order,
  is_active
)
SELECT 
  id,
  'Understanding Public Case Request Forms',
  'understanding-public-case-request-forms',
  'Complete overview of public intake forms - what they are, who uses them, how they differ from internal case creation, and the step-by-step submission workflow.',
  '## What Are Public Case Request Forms

Public Case Request Forms are self-service intake portals that allow clients, attorneys, and external parties to submit case requests without logging into CaseWyze. Each form has a unique, shareable URL (such as `/request/your-company-intake`) that can be distributed to clients and partners.

These forms operate independently from internal case creation. When someone submits a public form, it creates a "pending" request that must be reviewed and approved by authorized staff before becoming an active case.

---

## Who Uses These Forms

Public Case Request Forms serve different user types depending on your organization''s workflow:

| User Type | Typical Use Case |
|-----------|------------------|
| **Insurance Adjusters** | Submitting SIU investigation requests |
| **Law Firms** | Requesting background checks or surveillance |
| **Corporate Clients** | Reporting internal investigation needs |
| **Internal Intake Staff** | Creating requests on behalf of phone callers |
| **HR Departments** | Submitting employee investigation requests |

Each client type may have different information requirements, which is why CaseWyze allows you to create multiple forms with different field configurations.

---

## How Public Forms Differ From Internal Case Creation

Understanding the distinction between these two methods is essential for proper workflow design:

| Public Form Request | Internal Case Creation |
|---------------------|------------------------|
| Creates a "pending" request requiring review | Creates an active case immediately |
| No CaseWyze login required | Requires authenticated user with case creation permission |
| Client/contact matching happens during review | Client selected directly during creation |
| Limited to configured visible fields | Full access to all case fields |
| Subjects transferred to case on approval | Subjects created directly on case |
| Request number assigned (REQ-00145) | Case number assigned immediately |
| Captured source IP and user agent for audit | Created by known, authenticated user |

---

## What Information Is Collected

Public forms can collect the following information, depending on your configuration:

### Always Required
- **Case Type**: Determines workflow and available services

### Client Information (Optional)
- Company/Client Name
- Country
- Address (multiple lines)
- City, State, ZIP

### Contact Information (Optional)
- First Name, Middle Name, Last Name
- Email Address
- Home Phone, Office Phone, Mobile Phone
- Mobile Carrier

### Case Details (Optional)
- Requested Services
- Claim Number
- Budget (Hours and Dollars)
- Notes/Instructions
- Custom Fields (organization-defined)

### Subject Information (Optional)
- Primary Subject details (name, DOB, SSN, address, physical description)
- Additional Subjects
- Subject Photos

### Supporting Files (Optional)
- Document uploads with configurable size limits
- File type restrictions available

---

## What Happens After Submission

When someone submits a public case request form, the following sequence occurs:

### Step 1: Immediate Feedback
The submitter sees your configured success message and receives a request number (e.g., REQ-00145) for reference.

### Step 2: Confirmation Email (If Enabled)
If you''ve enabled submitter confirmation emails, an email is sent containing:
- The request number
- Your organization''s contact information
- Any custom message you''ve configured

### Step 3: Staff Notification (If Configured)
Staff members listed in your notification settings receive an email alert with:
- The request number
- Company and submitter name
- A link to the Case Requests queue

### Step 4: Request Appears in Queue
The request immediately appears in the Case Requests section with:
- Status: **Pending**
- All submitted data, subjects, and files attached
- Source information (form used, IP address, timestamp)

### Step 5: Staff Review
An authorized staff member reviews the request:
- Matches or creates the client account
- Matches or creates the contact record
- Verifies submitted information
- Reviews subjects and files

### Step 6: Accept or Decline
The reviewer either:
- **Accepts**: Creates a new case with all data transferred
- **Declines**: Records a reason (visible in audit log)

### Step 7: Permanent Audit Record
All actions are logged permanently:
- Who submitted the request
- When it was submitted
- Who reviewed it
- What decision was made
- When the case was created (if accepted)

---

## Related Articles
- Configuring Form Fields and Branding
- Setting Up Form Notifications
- Sharing and Publishing Forms
- Form Security and Data Protection
- Reviewing and Approving Case Requests',
  10,
  true
FROM public.help_categories
WHERE slug = 'case-requests-intake'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- Article 2: Configuring Form Fields and Branding
INSERT INTO public.help_articles (
  category_id,
  title,
  slug,
  summary,
  content,
  display_order,
  is_active
)
SELECT 
  id,
  'Configuring Form Fields and Branding',
  'configuring-form-fields-branding',
  'Administrator guide for setting up public intake forms - branding options, field visibility, required fields, custom labels, and file upload settings.',
  '## Accessing Form Management

To create or modify public case request forms:

1. Navigate to **Settings** in the main navigation
2. Select **Case Request Forms**
3. You''ll see a list of existing forms with their status and URLs

**Required Permission**: You must have the `manage_case_request_forms` permission, which is assigned to the Admin role by default.

---

## Creating a New Form

Click **Create Form** to start a new intake form. You''ll configure:

| Setting | Purpose |
|---------|---------|
| **Form Name** | Internal identifier (not shown to submitters) |
| **URL Slug** | Public-facing URL path (auto-generated from name if left blank) |
| **Active** | Controls whether the form accepts submissions |
| **Public Access** | Controls whether unauthenticated users can access the form |

---

## Configuring Branding

The Branding tab controls how your form appears to submitters:

| Setting | Purpose | Default Source |
|---------|---------|----------------|
| **Logo** | Header image displayed on the form | Your organization''s profile logo |
| **Display Name** | Organization name shown to submitters | Your organization name |
| **Phone** | Contact phone number on the form | Your organization phone |
| **Website** | Link displayed on the form | Your organization website |
| **Primary Color** | Theme accent color for buttons and links | Navy blue (#1a365d) |
| **Header Instructions** | Custom instructional text below the logo | None |
| **Success Message** | Message shown after successful submission | Default confirmation |

**Best Practice**: Keep your logo file under 200KB to ensure fast form loading.

---

## Field Configuration

The Field Configuration tab lets you control which fields appear and whether they''re required.

### For Each Field Section, You Can Set:
- **Visible**: Whether the field appears on the form
- **Required**: Whether submission fails without this field
- **Custom Label**: Override the default field label with your own text

### Available Field Sections

**Case Type** (Always visible, always required)
- Cannot be hidden as it determines workflow routing

**Client Information**
- Company/Client Name
- Country
- Address Lines (1, 2, 3)
- City, State, ZIP

**Contact Information**
- First Name, Middle Name, Last Name
- Email Address
- Home Phone, Office Phone, Mobile Phone
- Mobile Carrier

**Case Details**
- Requested Services (multi-select based on Case Type)
- Claim Number
- Budget Hours
- Budget Dollars
- Notes/Instructions
- Custom Fields (if configured for your organization)

**Subject Information**
- Primary Subject (name, DOB, SSN, address, demographics)
- Additional Subjects (expandable list)
- Subject Photos

**Supporting Files**
- File Upload area with drag-and-drop support

---

## File Upload Settings

Configure how file uploads work for your form:

| Setting | Default | Notes |
|---------|---------|-------|
| **Maximum File Size** | 1 GB | Per-file limit |
| **Allowed File Types** | All types | Can restrict to specific MIME types |
| **Enable File Uploads** | On | Toggle to hide the file upload section |

---

## Common Configuration Mistakes

Avoid these frequent errors when setting up forms:

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| Making email optional | Cannot send confirmation emails | Always require email for external-facing forms |
| Too many required fields | Submitters abandon the form | Only require fields essential for initial review |
| No staff notification emails | Requests sit unnoticed in queue | Always configure at least one notification recipient |
| Overly large logo file | Slow form loading | Keep logo under 200KB, use optimized formats |
| Confusing field labels | Submitters enter wrong information | Test your form as if you were a new client |
| Not testing after changes | Broken form goes live | Always submit a test request after configuration changes |

---

## Saving and Testing

After configuring your form:

1. Click **Save Changes** to apply your configuration
2. Use the **Preview** button to see the form as submitters will
3. Submit a test request to verify the entire workflow
4. Check that notifications arrive as expected
5. Verify the test request appears correctly in the Case Requests queue

---

## Related Articles
- Understanding Public Case Request Forms
- Setting Up Form Notifications
- Sharing and Publishing Forms',
  11,
  true
FROM public.help_categories
WHERE slug = 'case-requests-intake'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- Article 3: Setting Up Form Notifications
INSERT INTO public.help_articles (
  category_id,
  title,
  slug,
  summary,
  content,
  display_order,
  is_active
)
SELECT 
  id,
  'Setting Up Form Notifications',
  'setting-up-form-notifications',
  'Configure confirmation emails for submitters and notification alerts for staff when new case requests arrive through public forms.',
  '## Overview

CaseWyze supports two types of notifications for public case request forms:

1. **Submitter Confirmation Emails** - Sent to the person who submitted the request
2. **Staff Notification Emails** - Sent to your team when new requests arrive

Both are optional but strongly recommended for professional intake workflows.

---

## Submitter Confirmation Emails

When enabled, the system automatically sends an email to the submitter after successful form submission.

### Enabling Confirmation Emails

1. Open your form in **Settings > Case Request Forms**
2. Navigate to the **Notifications** tab
3. Toggle **Send Confirmation Email** to On
4. Configure the email content

### Configuring Email Content

| Field | Purpose | Example |
|-------|---------|---------|
| **Subject Line** | Email subject | "Your Investigation Request Has Been Received" |
| **Email Body** | Message content | See template below |

### Available Merge Fields

Use these placeholders in your email content - they''ll be replaced with actual values:

| Merge Field | Replaced With |
|-------------|---------------|
| `{request_number}` | The assigned request number (e.g., REQ-00145) |
| `{name}` | The submitter''s first and last name |
| `{company}` | The company name provided on the form |

### Example Confirmation Email Template

```
Subject: Your Request {request_number} Has Been Received

Dear {name},

Thank you for submitting your investigation request. Your request number is {request_number}. Please save this number for your records.

Our team will review your submission and contact you within one business day.

If you have questions, please contact us at [your phone number] or reply to this email.

Best regards,
[Your Organization Name]
```

**Best Practice**: Always include the request number so submitters can reference it in follow-up communications.

---

## Staff Notification Emails

Configure your team to receive instant alerts when new requests arrive.

### Configuring Staff Notifications

1. Open your form in **Settings > Case Request Forms**
2. Navigate to the **Notifications** tab
3. Toggle **Notify Staff on Submission** to On
4. Enter email addresses in the **Staff Notification Emails** field

### Email Format

Enter email addresses separated by commas:
```
intake@yourcompany.com, supervisor@yourcompany.com, manager@yourcompany.com
```

### What Staff Notifications Include

Each notification email contains:
- The request number
- Company name (if provided)
- Submitter name
- A direct link to the Case Requests queue

**Security Note**: Staff email addresses are never exposed to the public. They''re stored securely and excluded from any public-facing form data.

---

## What Users Should Expect

### Submitters Will See:
1. A loading spinner during form submission
2. Your success message with the request number
3. A confirmation email within minutes (if enabled)

### Staff Will Receive:
1. Email notification within minutes of submission (if configured)
2. The request visible immediately in the Case Requests queue
3. All submitted data, subjects, and files ready for review

---

## Troubleshooting Notifications

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Submitter didn''t receive confirmation | Email field was optional and left blank | Make email field required in Field Configuration |
| Confirmation going to spam | Email reputation issues | Ask submitters to whitelist your domain |
| Staff not receiving alerts | No emails configured | Add at least one email in Staff Notification Emails |
| Staff emails going to spam | Corporate email filters | Whitelist the sender domain in your email system |
| Delayed notifications | Email service queue | Allow up to 10 minutes; check again before troubleshooting further |
| Merge fields showing as text | Incorrect syntax | Ensure you''re using `{field_name}` format with curly braces |

---

## Best Practices

1. **Always require email** on external-facing forms to enable confirmation
2. **Include request number** in confirmation emails for easy reference
3. **Configure multiple staff recipients** to ensure coverage during absences
4. **Test notifications** after any configuration changes
5. **Keep confirmation emails concise** - provide essentials only
6. **Set expectations** about response time in your confirmation message

---

## Related Articles
- Configuring Form Fields and Branding
- Sharing and Publishing Forms
- Reviewing and Approving Case Requests',
  12,
  true
FROM public.help_categories
WHERE slug = 'case-requests-intake'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- Article 4: Sharing and Publishing Forms
INSERT INTO public.help_articles (
  category_id,
  title,
  slug,
  summary,
  content,
  display_order,
  is_active
)
SELECT 
  id,
  'Sharing and Publishing Forms',
  'sharing-publishing-forms',
  'How to distribute public intake forms to clients - getting form URLs, access control settings, creating multiple forms for different use cases, and form lifecycle management.',
  '## Getting the Form URL

Each public case request form has a unique URL based on its slug:

```
https://[your-domain]/request/[slug]
```

**Example**: If your form slug is "intake", clients would access:
```
https://yourapp.com/request/intake
```

### Finding Your Form URL

1. Go to **Settings > Case Request Forms**
2. Click on the form you want to share
3. The full URL is displayed in the form details
4. Use the **Copy URL** button for easy sharing

---

## Sharing Methods

Distribute your form URL through various channels:

### Email to Clients
Include the form link in:
- New client onboarding emails
- Service agreements
- Regular client communications
- Auto-responder messages

### Website Integration
- Add a "Submit a Request" button linking to your form
- Include in your website''s contact or services page
- Add to client portal navigation

### QR Codes
Generate QR codes for:
- Business cards
- Printed marketing materials
- Conference booth displays
- Leave-behind documents

### Client Portals
If your clients use a portal system:
- Embed the link in their dashboard
- Add to their bookmarks or quick links
- Include in automated workflows

---

## Access Control Settings

Control who can access your form with two toggles:

| Active | Public | Who Can Access |
|--------|--------|----------------|
| ✓ On | ✓ On | Anyone with the link (most common) |
| ✓ On | ✗ Off | Only authenticated CaseWyze users |
| ✗ Off | Any | No one - form displays error message |

### When to Use Each Setting

**Active + Public** (Default)
- External client intake
- Partner submissions
- Public-facing request collection

**Active + Not Public**
- Internal intake staff use only
- Forms for logged-in employees
- Testing before public launch

**Inactive**
- Temporarily disabled forms
- Archived form configurations
- Forms pending review before launch

---

## Creating Multiple Forms

Create separate forms for different client types or use cases:

### Insurance Clients Form
- Require: Claim Number, Insured Name
- Show: SIU-specific case types
- Hide: Budget fields (handled separately)

### Law Firm Form
- Require: Case Reference, Attorney Name
- Show: Legal-specific services
- Custom labels for legal terminology

### Corporate Clients Form
- Require: Company Name, HR Contact
- Show: Employee investigation types
- Include: Custom fields for internal reference numbers

### Internal Intake Form (Staff Use)
- Show: All available fields
- Active but Not Public
- Used when taking requests by phone

### Benefits of Multiple Forms

Each form maintains independent:
- Field configuration and requirements
- Branding and messaging
- Notification settings
- URL slug
- Active/public status

---

## Form Lifecycle Management

### Launching a New Form

1. Create and configure the form completely
2. Set Active: Off, Public: Off initially
3. Test thoroughly with sample submissions
4. Enable Active, then Public when ready
5. Distribute the URL to intended users

### Temporarily Disabling a Form

Toggle **Active** to Off when you need to:
- Pause intake for a specific client type
- Make significant configuration changes
- Investigate issues with submissions

Existing pending requests remain in the queue and can still be processed.

### Permanently Retiring a Form

When a form is no longer needed:
1. Toggle **Active** to Off
2. Document the retirement reason in your records
3. Keep the form configuration for historical reference
4. Redirect clients to your new preferred form

**Note**: You cannot delete a form that has associated requests. The form record is preserved for audit purposes.

### Changing Form URLs

If you need to change a form''s URL:
1. Update the **URL Slug** field
2. Save the changes
3. Update all distributed links to the new URL
4. The old URL will return a "Form Not Found" error

**Warning**: Changing URLs breaks existing bookmarks and links. Notify affected clients before making changes.

---

## Related Articles
- Understanding Public Case Request Forms
- Configuring Form Fields and Branding
- Form Security and Data Protection',
  13,
  true
FROM public.help_categories
WHERE slug = 'case-requests-intake'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- Article 5: Form Security and Data Protection
INSERT INTO public.help_articles (
  category_id,
  title,
  slug,
  summary,
  content,
  display_order,
  is_active
)
SELECT 
  id,
  'Form Security and Data Protection',
  'form-security-data-protection',
  'Security measures for public intake forms - data capture and logging, file upload protection, access permissions, audit trails, and best practices for sensitive investigations.',
  '## Data Captured on Submission

Every public form submission automatically records metadata for security and audit purposes:

| Data Point | Purpose | Can Be Modified |
|------------|---------|-----------------|
| **Submission Timestamp** | Exact time the form was submitted | No |
| **Source IP Address** | Submitter''s IP for audit trail | No |
| **User Agent** | Browser and device information | No |
| **Source Form ID** | Which form configuration was used | No |
| **Request Number** | Unique identifier for tracking | No |

This metadata is captured automatically and cannot be edited by anyone, ensuring a reliable audit trail.

### Viewing Source Information

When reviewing a case request:
1. Open the request from the Case Requests queue
2. Look for the **Submission Details** section
3. View IP address, timestamp, user agent, and source form

---

## File Upload Security

Files submitted through public forms are protected at multiple levels:

### SHA-256 File Hashing
Every uploaded file receives a SHA-256 hash at upload time:
- Provides cryptographic proof of file integrity
- Hash is stored with the file record
- Can verify files haven''t been modified since submission

### Secure Storage
Uploaded files are stored with:
- Isolated storage buckets per organization
- Encrypted at rest
- Access controlled by authentication

### Access Control
Only authorized CaseWyze users can:
- View file lists on requests
- Download submitted files
- Transfer files to cases on approval

### File Transfer on Approval
When a request is approved and becomes a case:
- All files are copied to the case attachments
- Original file hashes are preserved
- File metadata (name, size, type) maintained
- Upload timestamp recorded

---

## Access Permissions

Different actions require specific permissions:

| Action | Required Permission | Default Roles |
|--------|---------------------|---------------|
| View case requests | `view_case_requests` | Admin, Manager, Investigator |
| Approve or decline requests | `approve_case_requests` | Admin, Manager |
| Delete requests | `delete_case_requests` | Admin |
| Manage form configuration | `manage_case_request_forms` | Admin |

### Permission Inheritance

- **Viewing** allows seeing request details and files
- **Approving** includes viewing plus status changes
- **Deleting** is typically restricted to administrators
- **Managing forms** is separate from request processing

---

## Audit Trail

All actions on case requests are permanently logged and cannot be deleted or modified:

### Logged Events Include:
- Request submission (with source details)
- Status changes (pending → approved/declined)
- Approval decisions with linked case
- Decline decisions with recorded reason
- User who performed each action
- Timestamp of each action

### Viewing the Audit Trail

1. Open any case request
2. Navigate to the **History** tab
3. View chronological list of all actions

### Audit Trail Uses
- Compliance documentation
- Dispute resolution
- Quality assurance reviews
- Training and process improvement
- Legal discovery support

---

## Public View Security

The public-facing form intentionally excludes sensitive information:

### What Submitters Cannot See:
- Staff notification email addresses
- Internal notification settings
- Confirmation email templates
- Other form configurations
- Organization internal settings
- Request queue or status

### Why This Matters
Preventing information leakage:
- Protects staff email addresses from harvesting
- Prevents social engineering attempts
- Maintains professional separation
- Reduces phishing risk

---

## Best Practices for Sensitive Investigations

When handling confidential or legally sensitive matters:

### 1. Minimize Visible Fields
Only request information essential for initial review. Collect sensitive details after approval through secure channels.

### 2. Always Require Email
Ensures you can follow up with submitters and send confirmation of receipt.

### 3. Configure Staff Notifications
Ensures timely review of sensitive requests. Include supervisors for high-risk case types.

### 4. Review Pending Requests Daily
Establish a routine to check the Case Requests queue. Delayed responses can impact investigations.

### 5. Train Staff on Client Matching
Prevent duplicate records by teaching proper client/contact matching during approval. Duplicates complicate future reference checks.

### 6. Document Decline Reasons
When declining requests, record specific reasons. This creates an audit trail if decisions are later questioned.

### 7. Limit Form Access When Needed
Use the "Active but Not Public" setting for forms that should only be used by authenticated staff.

### 8. Regular Access Reviews
Periodically review who has `approve_case_requests` permission. Remove access for users who no longer need it.

---

## Compliance Considerations

Public case request forms support compliance with:
- **Data retention requirements**: All submissions preserved with metadata
- **Audit trail requirements**: Immutable action logging
- **Access control requirements**: Permission-based access
- **Evidence integrity**: SHA-256 file hashing

Consult your compliance officer for specific regulatory requirements in your jurisdiction.

---

## Related Articles
- Understanding Public Case Request Forms
- Configuring Form Fields and Branding
- Role-Based Access Control
- Audit Logs and Compliance',
  14,
  true
FROM public.help_categories
WHERE slug = 'case-requests-intake'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

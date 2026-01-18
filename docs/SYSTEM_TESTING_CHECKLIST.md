# CaseWyze System Testing & Validation Checklist

## Document Purpose

This testing document validates the complete functionality, workflow integrity, data consistency, and security of the CaseWyze platform. It is designed for use by:
- Internal QA teams
- Beta testers
- Professional end users validating production readiness

Each test specifies: **What to do**, **What should happen**, **What should NOT happen**, and **Failure indicators**.

---

## SECTION 1: GLOBAL SYSTEM ACCESS & ACCOUNT SETUP

### 1.1 Account Creation

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Create new account | 1. Navigate to login page. 2. Click "Create Account". 3. Enter full name (2-100 chars). 4. Enter organization name (2+ chars). 5. Enter valid email. 6. Enter password (8+ chars with uppercase, lowercase, number). 7. Submit. | Account created. User logged in. Dashboard displays. Organization created automatically. | Empty or invalid fields accepted. Password without requirements accepted. | Error message on valid input. Redirect to unexpected page. Dashboard shows wrong organization. |
| Password requirements | Attempt passwords: "short", "nouppercase1", "NOLOWERCASE1", "NoNumbers" | Each rejected with specific requirement message. | Weak passwords accepted. | Account created with insecure password. |
| Duplicate email | Register with an existing email address. | Clear error: "Email already registered" or similar. | Account created with duplicate. Generic error with no explanation. | User confused about what went wrong. |

### 1.2 Login/Logout Behavior

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Standard login | Enter valid email and password. Click Sign In. | Dashboard loads. User name visible in sidebar. | Redirect loop. Partial page load. | Blank screen. Infinite loading spinner. |
| Invalid credentials | Enter wrong password for valid email. | Clear error message. No account lockout on first attempt. | Reveal whether email exists. Allow unlimited attempts without notification. | Brute force possible. Error message reveals account existence. |
| Logout | Click user menu. Select "Sign Out". | Redirect to login page. Session ended. Protected pages inaccessible. | Remain logged in. Session data persists. | Clicking back button shows protected content. |
| Session persistence | Log in. Close browser. Reopen and navigate to app. | User remains logged in (unless session expired). Dashboard loads without re-authentication. | Logged out unexpectedly on browser close. | Forced to re-login after short period. |

### 1.3 Password Reset Flow

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Request reset | Click "Forgot Password". Enter registered email. Submit. | Confirmation message. Reset email sent within 2 minutes. | Reveal if email is registered. Email never arrives. | Generic error. No email. |
| Complete reset | Click link in email. Enter new valid password. Confirm password. Submit. | Password updated. Redirect to login. New password works. | Old password still works. Expired link accepted indefinitely. | Unable to login with new password. |
| Invalid reset link | Use expired or modified reset link. | Clear error: "Link expired" or "Invalid link". | Accept modified token. | Successful reset with tampered link. |

### 1.4 Multi-Device Access

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Concurrent sessions | Log in on desktop. Log in on mobile. | Both sessions active. Changes on one device visible on other after refresh. | Forced logout of first session. Data conflicts. | One session kicked. Stale data displayed. |

---

## SECTION 2: ORGANIZATION & ACCOUNT SETTINGS

### 2.1 Organization Profile

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| View settings | Navigate to Settings. Open Organization tab. | Organization name, address, contact info displayed. | Access denied for authorized user. | Settings page fails to load. |
| Edit and save | Change organization name. Click Save. | Success toast: "Settings saved". New name appears in sidebar. | Changes lost. No confirmation. | Old name persists after refresh. |
| Cancel changes | Make edits. Click Cancel or navigate away. | Prompt to discard changes OR changes not saved. | Changes applied without confirmation. | Unintended changes saved. |

### 2.2 Branding Settings

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Upload logo | Upload square logo (PNG/JPG, under 5MB). Save. | Logo appears in sidebar and public forms. | Broken image. Oversized file accepted. | Logo does not display. |
| Accent color | Set accent color via color picker. Save. | Accent color applied to login page and buttons. | Color not visible. Invalid hex accepted. | Color reverts or looks broken. |
| Disable branding | Toggle off branding. Save. | Login page shows default CaseWyze branding. | Organization logo still visible. | Branding changes do not take effect. |

### 2.3 Timezone and Locale

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Set timezone | Select different timezone. Save. Create time entry. | Time entry timestamp reflects selected timezone. | Timezone ignored. | Timestamps in wrong timezone. |
| Date format | Set date format preference. View case list. | Dates display in selected format. | Format ignored. | Dates show in wrong format. |

### 2.4 Permission Restrictions

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Non-admin access | Log in as Manager or Investigator. Navigate to Settings. | Organization settings tab hidden or disabled. | Full access granted. | Non-admin can modify org settings. |

---

## SECTION 3: USER ROLES, PERMISSIONS & ACCESS CONTROL

### 3.1 Role Definitions

| Role | This user CAN... | This user CANNOT... |
|------|------------------|---------------------|
| **Admin** | Manage all users. Configure permissions. Access all settings. View audit logs. Delete cases. | N/A - Full access. |
| **Manager** | Oversee all cases. View all finances. Generate reports. Manage case assignments. | Modify user permissions. Access admin settings. Delete users. |
| **Investigator** | Work assigned cases. Create updates. Log own time. Upload attachments. | View billing rates. Access finances (unless permitted). See client contact details (depends on config). |
| **Vendor** | View assigned cases only. Submit updates. Upload attachments. | See client contacts. Access unassigned cases. View finances or invoices. |

### 3.2 Role Assignment Tests

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Assign role | Admin opens Users. Invites new user. Selects "Investigator" role. | User receives invite. Upon login, user has Investigator permissions only. | Role defaults to Admin. | New user has wrong permissions. |
| Change role | Admin changes existing user from Investigator to Manager. | User gains Manager capabilities immediately on next action. | Delayed effect. User keeps old permissions. | User cannot access Manager features. |
| Remove user | Admin deletes a user. | User disappears from list. User cannot log in. | Data orphaned. User still appears. | Deleted user still has access. |

### 3.3 Permission Enforcement

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Investigator finance access | Log in as Investigator. Navigate to case. Click Finances tab. | "Access restricted" message. No financial data visible. | Financial data visible. | Budget, expenses, or invoices displayed. |
| Vendor case restriction | Log in as Vendor. Try to access unassigned case URL directly. | Redirect or "Not authorized" message. | Case data loads. | Vendor sees case they shouldn't. |
| Admin override | Log in as Admin. Open closed case. Edit a field. | Edit succeeds with "Admin override" indicator. | Edit blocked. | Admin cannot modify closed case. |

### 3.4 Visibility Boundaries

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Client contact masking | Log in as Vendor. View assigned case. | Client contact phone/email NOT displayed. "Restricted" message in contact section. | Client details visible. | Vendor sees client phone number. |
| Subject SSN masking | Log in as Investigator. View subject with SSN. | SSN masked or hidden based on role. | Full SSN displayed. | Sensitive PII exposed to wrong role. |

---

## SECTION 4: CASE CREATION & MANAGEMENT

### 4.1 Case Wizard Flow

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Start new case | Click "New Case". Complete wizard steps: Title, Client, Type. | Case created with case number. Redirected to case detail. | Case created without required fields. | Error on valid submission. |
| Required fields | Attempt to proceed without case title. | "Title is required" validation. Cannot advance. | Empty title accepted. | Case created without title. |
| Optional fields | Skip optional fields (description, due date). Complete wizard. | Case created successfully. Optional fields show as empty. | Errors for skipped optional fields. | Forced to fill optional data. |
| Cancel wizard | Start wizard. Click Cancel. Confirm dialog. | Draft discarded. Return to cases list. No orphan case. | Partial case saved. | Draft case appears in list. |

### 4.2 Case Editing

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Edit case details | Open case. Click Edit. Change title. Save. | Title updated. Success toast. Change reflected immediately. | Changes lost. | Old title persists after save. |
| Status change | Change case status from "New" to "Active". | Status badge updates. Status history entry created. | Status jumps incorrectly. Timestamp missing. | Status change not logged. |

### 4.3 Case Deletion

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Delete case (Admin) | Admin opens case. Clicks Delete. Confirms in dialog. | Case removed from list. Audit log entry created. | Case still appears. | Deletion not logged. |
| Delete case (non-Admin) | Manager tries to delete case. | Delete button hidden or disabled. "Permission denied" if attempted. | Deletion succeeds. | Non-admin deletes case. |
| Delete with linked data | Delete case with time entries and attachments. | Warning lists linked data. Confirmation required. All linked data removed or orphaned gracefully. | Linked data remains accessible. | Orphaned records in database. |

---

## SECTION 5: PUBLIC CASE REQUEST FORMS

### 5.1 Form Accessibility

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Access public form | Navigate to form URL without logging in. | Form loads. Organization branding displayed. All required fields visible. | Login required. 404 error for valid URL. | Form not accessible publicly. |
| Invalid form URL | Navigate to /intake/invalid-slug. | Clear "Form not found" message with login link. | Blank page. Cryptic error. | User sees technical error. |

### 5.2 Form Submission

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Valid submission | Complete all required fields. Add subject. Upload supporting file. Submit. | Confirmation page: "Request submitted". Request ID displayed. | Form resets without confirmation. | No submission confirmation. |
| Required field validation | Leave required fields empty. Submit. | Inline errors on missing fields. Form does not submit. | Form submits with missing data. | Incomplete request saved. |
| File upload | Upload PDF under 10MB. | File accepted. Visible in list. | Large file accepted beyond limit. | Upload fails silently. |

### 5.3 Spam/Duplicate Prevention

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Duplicate submission | Submit same form twice rapidly. | Second submission blocked or merged. Warning message. | Two identical requests created. | Duplicate requests in queue. |
| Session persistence | Complete half of form. Refresh page. | Draft data preserved. Can continue. | All data lost on refresh. | User must restart from scratch. |

---

## SECTION 6: CASE REQUEST REVIEW & CONVERSION

### 6.1 Review Workflow

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| View request | Navigate to Case Requests. Click pending request. | Full request details displayed: subjects, files, client info. | Partial data. Missing attachments. | Request data incomplete. |
| Match to client | Click "Match to Client". Select existing account or create new. | Client linked. Ready for approval. | Wrong client matched. | Client mismatch in created case. |

### 6.2 Approval / Rejection

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Approve request | Click Approve. Confirm. | Case created. Status changes to "Approved". Case number assigned. Subjects copied. | Request remains pending. Subjects not transferred. | Case not created on approval. |
| Decline request | Click Decline. Enter reason. Confirm. | Status changes to "Declined". Reason saved. Request archived. | Decline without reason. | No decline reason recorded. |

### 6.3 Conversion Effects

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Data mapping | Approve request with 2 subjects and 3 files. | Case has 2 subjects and 3 attachments. All metadata preserved. | Partial data transferred. | Missing subjects or files in new case. |
| Audit trail | Review approved request. | Conversion timestamp, approving user, and case link visible. | No audit record. | Cannot trace request to case. |

---

## SECTION 7: CASE STATUS SYSTEM & WORKFLOW

### 7.1 Status Selection

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Change status | Open case. Click status dropdown. Select new status. | Status badge updates. Lifecycle banner shows phase guidance. | Invalid transition allowed. | Closed case shows as "New". |
| Status restrictions | Attempt to move from "New" directly to "Closed". | Transition blocked with explanation. | Status jumps skipping required steps. | Status history shows gap. |

### 7.2 Status History

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| View history | Open case. Click "Status History" or timeline. | Chronological list: each status, timestamp, user who changed. | Entries missing. Editable history. | Cannot see when status changed. |
| History immutability | Attempt to edit or delete status history entry. | No edit/delete options available. | History editable. | Status history can be altered. |

### 7.3 Status Impact

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| On Hold restrictions | Set case to "On Hold". Try to add time entry. | Time entry blocked. Message: "Time entries disabled while on hold." | Time entry allowed. | Billable work logged during hold. |
| Closed case read-only | Close case. Try to edit update. | Edit blocked (except Admin override). | Edits allowed freely. | Closed case data modified. |

---

## SECTION 8: CASE LIFECYCLE (CASE CENTURY)

### 8.1 Intake Phase

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Intake banner | View request in "Requested" status. | Banner: "Intake Phase - No billable work should occur." | No phase indication. | User confused about case state. |
| Billing blocked | Attempt to log time on intake-phase request. | Blocked: "Time entries not available during intake." | Time entry form accessible. | Time logged before approval. |

### 8.2 Execution Phase

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Progress indicator | View case in "Active" status. | Progress shows: New → Assigned → Active (current) → Completed → Closed. | Progress bar missing. | No visual lifecycle guidance. |
| Phase transition | Move from Intake (Approved) to Execution (New). | Case created in Execution phase. All billing features unlocked. | Features remain locked. | Cannot log time after approval. |

### 8.3 Lifecycle Guidance

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| What's Next prompt | View case in each status. | Banner shows contextual "What's Next" guidance for each status. | Generic or missing guidance. | User unclear on next action. |

---

## SECTION 9: UPDATES, EVENTS & TIMELINES

### 9.1 Creating Updates

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Create narrative update | Open case. Click "New Update". Enter title, body, date. Save. | Update appears in timeline. Author and timestamp displayed. | Update created without author. | Anonymous update in timeline. |
| Rich text formatting | Add bold, italic, bullet points to update body. | Formatting preserved on save and display. | Formatting stripped. | Plain text only. |

### 9.2 Creating Events

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Schedule event | Open Activities. Click "New Event". Set title, date, time, location. Save. | Event appears in calendar and activity list. | Event without date accepted. | Event not visible in calendar. |
| Assign event | Assign event to specific investigator. | Event appears in assignee's dashboard. | Assignment not saved. | Wrong person sees event. |

### 9.3 Timeline Ordering

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Chronological display | View case timeline with multiple updates and events. | Items ordered by date, newest first (or as configured). | Random ordering. | Timeline out of sequence. |
| Mixed item types | Timeline includes updates, events, status changes, file uploads. | Each type clearly distinguished with icon and label. | All items look identical. | Cannot differentiate update from event. |

### 9.4 Editing and Deletion Rules

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Edit own update | Author clicks Edit on their update. Changes body. Saves. | Update modified. Edit timestamp or indicator added. | Other user's update editable. | Non-author can modify update. |
| Delete update | Author or Admin deletes update. Confirms. | Update removed from timeline. Audit log entry created. | Deleted without confirmation. | No audit record of deletion. |
| Closed case restriction | Case is closed. Try to create update. | Blocked (except Admin override). | Update created on closed case. | Data added after case closed. |

---

## SECTION 10: EXPENSES, TIME & BUDGETS

### 10.1 Time Entry Creation

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Log time | Go to Time Entries. Click New. Select case, date, hours, description. Save. | Entry appears in list. Case budget updated. | Time without case link. Negative hours accepted. | Time entry orphaned from case. |
| Duplicate prevention | Create same time entry twice. | Warning: "Similar entry exists" or merge option. | Silent duplicate created. | Double-billed hours. |

### 10.2 Expense Creation

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Log expense | Create expense: amount, category, date, description. Attach receipt. | Expense saved. Total expenses update. | Expense without amount. | Zero-dollar expense accepted. |
| Link to update | Link expense to existing update. | Expense shows reference to update in detail view. | Link broken. | Cannot trace expense source. |

### 10.3 Budget Calculations

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Budget total | Set case budget to $5,000. Log $1,000 in time. | Budget shows: $1,000 used, $4,000 remaining. | Math errors. | Wrong remaining amount. |
| Budget warning | Exceed 80% of budget. | Warning indicator on case card and budget widget. | No warning. | Budget exceeded without notice. |
| Budget exceeded | Exceed 100% of budget. | Critical alert. Entries still allowed but flagged. | Entries blocked unexpectedly. | Cannot log legitimate work. |

### 10.4 Orphaned Records Prevention

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Delete case with finances | Attempt to delete case with unbilled time. | Warning: "Case has unbilled time. Invoice or delete entries first." | Silent deletion. | Unbilled time lost forever. |

---

## SECTION 11: EVIDENCE & ATTACHMENTS

### 11.1 Upload Behavior

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Upload file | Drag file to attachments area. Wait for upload. | Progress indicator. Success message. File in list with name, size, date. | Upload fails silently. | File listed but not accessible. |
| Multiple files | Drop 5 files at once. | All uploaded. Individual progress for each. | Some files skipped without notice. | Partial upload without error. |

### 11.2 File Type and Size Restrictions

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Oversized file | Upload file exceeding storage limit (per plan). | Error: "Storage limit exceeded. Upgrade plan or remove files." | Upload succeeds beyond quota. | Storage over limit. |
| Allowed types | Upload PDF, JPG, PNG, DOC. | All accepted. | Rejection of common types. | Standard file type blocked. |
| Executable blocked | Upload .exe or .bat file. | Rejected: "File type not allowed." | Executable uploaded. | Security risk in storage. |

### 11.3 Download and Access

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Download file | Click download button on attachment. | File downloads to device with original filename. | Download blocked. Wrong file. | Corrupted or wrong file downloaded. |
| Permission enforcement | Investigator without attachment permission opens case. | Attachments tab hidden or "Access restricted". | Files visible without permission. | Unauthorized file access. |

### 11.4 External Sharing

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Generate share link | Click "Share" on attachment. Set expiration. Copy link. | Link works for external recipient. Downloads file. | Link works after expiration. | Access after link expired. |
| Revoke share link | Revoke active share link. Try link. | "Access revoked" error. | Download still possible. | Revoked link still works. |

---

## SECTION 12: REPORTS & EXPORTS

### 12.1 Report Generation

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Generate DOCX report | Select template. Choose attachments to include. Click Generate. | DOCX file downloads. Variables populated correctly (case number, dates, etc.). | Empty or corrupt file. | Template variables not replaced. |
| Select evidence | Generate report with 3 attachments selected. | Attachments listed in report body with references. | Wrong attachments included. | Evidence mismatch in report. |

### 12.2 Export Formats

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| CSV export | Export cases list to CSV. Open in spreadsheet. | All visible columns exported. Data matches screen. | Missing columns. Garbled characters. | Data corruption in export. |
| PDF export | Export invoices to PDF. | Formatted table with headers, totals, date generated. | Formatting broken. | Unreadable PDF. |

### 12.3 Data Accuracy

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Financial totals | Export expenses for case. Sum manually. | Export total matches manual sum. | Rounding errors. Missing entries. | Totals don't match. |
| Date accuracy | Export activities. Check dates. | All dates match system records. | Wrong timezone applied. | Dates off by hours or days. |

### 12.4 Report Archive

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| View generated reports | Open case. Go to Reports tab. | List of all generated reports with date, template, author. | Reports missing. | Cannot find previously generated report. |
| Report immutability | Download old report. Compare to original. | Content identical. No modifications possible. | Report changed after generation. | Report integrity compromised. |

---

## SECTION 13: NOTIFICATIONS & SYSTEM FEEDBACK

### 13.1 Success Messages

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Save confirmation | Save any form. | Green toast: "Saved successfully" or specific confirmation. | No feedback. | User unsure if action worked. |
| Action completion | Complete multi-step action (e.g., approve request). | Clear confirmation with result (e.g., "Case #1234 created"). | Generic "Success" only. | User unclear what happened. |

### 13.2 Error Messages

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Validation error | Submit form with invalid email. | Red highlight on field. Specific message: "Invalid email format". | Generic "Error occurred". | User doesn't know what to fix. |
| Server error | Disconnect network. Try to save. | Error toast: "Unable to save. Check connection." Retry option. | Silent failure. | Data lost without notice. |

### 13.3 Warning Messages

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Budget warning | Approach budget limit. | Yellow/orange indicator with percentage used. | No warning until exceeded. | Surprise budget overrun. |
| Destructive action | Click Delete on any item. | Confirmation dialog: "Are you sure? This cannot be undone." | Immediate deletion. | Accidental permanent deletion. |

### 13.4 First-Time Guidance

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| New user guidance | Log in as new user. Navigate to Dashboard. | Blue guidance callout with welcome message and first steps. | Overwhelming text. Required dismissal to proceed. | Guidance blocks workflow. |
| Dismissal persistence | Dismiss guidance. Log out. Log back in. | Guidance does not reappear on that screen. | Guidance reappears every time. | Annoying repeat messages. |

### 13.5 Tooltips & Inline Help

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Help icons | Hover over (?) icon next to complex field. | Tooltip with clear explanation (under 25 words). | No tooltip. Technical jargon. | User still confused after reading. |
| Keyboard accessibility | Tab to help icon. Press Enter. | Tooltip opens via keyboard. | Keyboard-inaccessible tooltip. | Screen reader users cannot access help. |

---

## SECTION 14: SECURITY, AUDIT & COMPLIANCE

### 14.1 Audit Trail Creation

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Log case actions | Create case. Edit. Add subject. Delete subject. | Each action logged with: timestamp, user, action type, affected record. | Actions not logged. | Missing audit entries. |
| View audit log | Admin opens case audit or system audit log. | Complete chronological history. Filter by date, user, action type. | Audit log empty or incomplete. | Cannot verify who did what. |

### 14.2 Immutable Records

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Attempt audit edit | Directly inspect audit log table. | No edit/delete interface. Read-only. | Audit entries editable via UI. | Audit log can be altered. |
| Status history protection | Attempt to modify status history via API. | Rejected. Insert-only table. | Past entries modifiable. | Historical records changeable. |

### 14.3 Role-Based Visibility

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Audit log access | Non-Admin attempts to view audit logs. | Access denied. Menu option hidden. | Full audit access. | Investigator sees all audit logs. |
| SSN protection | Non-Admin views subject with SSN. | SSN masked: ***-**-1234. | Full SSN displayed. | Sensitive data exposed. |

### 14.4 Data Encryption Indicators

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Sensitive fields | View form with SSN or banking info. | Shield icon with "Encrypted" indicator near field. | No security indication. | User unsure if data protected. |

---

## SECTION 15: ERROR HANDLING & EDGE CASES

### 15.1 Missing Required Data

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Empty required field | Clear required field. Submit. | Inline validation: "This field is required." Focus on field. | Form submits. | Record created with null required field. |
| Required relationship | Create invoice without line items. | Blocked: "Invoice must have at least one item." | Empty invoice created. | Zero-dollar invoice in system. |

### 15.2 Invalid Inputs

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Invalid email format | Enter "notanemail" in email field. | Validation: "Invalid email format." | Email saved. | Malformed data in database. |
| Negative currency | Enter -500 in amount field. | Validation: "Amount must be positive." | Negative amount saved. | Financial calculation errors. |
| Future date restriction | Enter date 100 years in future for time entry. | Blocked or warning: "Date seems incorrect." | Accepted without question. | Obvious error data saved. |

### 15.3 Interrupted Workflows

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Browser refresh mid-form | Fill half of case wizard. Refresh page. | Draft preserved OR clear warning about data loss before refresh. | Silent data loss. | User must start over unexpectedly. |
| Network disconnect | Disconnect during save. Reconnect. | Error message. Retry option. Data not lost. | Partial save. Corrupted record. | Half-saved data in system. |
| Session timeout | Leave page open 24 hours. Try to save. | Graceful prompt to re-authenticate. Data preserved. | Silent failure. Work lost. | Action fails without explanation. |

### 15.4 Permission Conflicts

| Test | Steps | Expected Result | Should NOT Happen | Failure Indicator |
|------|-------|-----------------|-------------------|-------------------|
| Permission changed mid-session | Admin removes permission while user is logged in. User tries action. | Action blocked immediately. Clear message. | Action succeeds with stale permissions. | Unauthorized action completed. |
| Role downgrade | User's role changed from Manager to Investigator. Access finance page. | Redirect or access denied. | Finance data still visible. | Stale permission grants access. |

---

## SECTION 16: FINAL SYSTEM CONFIDENCE CHECK

### 16.1 Predictability

| Question | Verification |
|----------|--------------|
| Does every button do what its label says? | ☐ Tested all primary action buttons. |
| Are confirmation dialogs consistent? | ☐ Same pattern for all destructive actions. |
| Do loading states appear during async actions? | ☐ Spinners/skeletons visible when waiting. |

### 16.2 User Guidance

| Question | Verification |
|----------|--------------|
| Does the user always know what to do next? | ☐ Lifecycle banners and "What's Next" prompts tested. |
| Are empty states informative? | ☐ Empty lists show helpful message, not blank space. |
| Can new users complete core tasks without training? | ☐ First-time guidance sufficient for basic workflows. |

### 16.3 Error Prevention

| Question | Verification |
|----------|--------------|
| Are mistakes prevented before they happen? | ☐ Validation occurs before submission. Confirmations for destructive actions. |
| Can data be recovered from accidental deletion? | ☐ Appropriate warnings in place. Admins have override capabilities. |
| Are calculations accurate and consistent? | ☐ Financial totals verified across exports and UI. |

### 16.4 Professional Trust

| Question | Verification |
|----------|--------------|
| Does the platform look professional? | ☐ Consistent design. No broken images. Proper typography. |
| Is sensitive data protected visibly? | ☐ Shield icons, masking, restricted access messages. |
| Would you present this to a client or court? | ☐ Reports are accurate, formatted, and audit-defensible. |

---

## FINAL SIGN-OFF

| Status | Signature | Date |
|--------|-----------|------|
| ☐ Ready for Production | _________________ | __________ |
| ☐ Needs Revision (see notes) | _________________ | __________ |
| ☐ Blocked Issue Identified (critical) | _________________ | __________ |

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

---

*Document Version: 1.0*  
*Generated: January 2026*  
*Platform: CaseWyze*

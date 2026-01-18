# Case Request Feature - Testing Checklist

This document provides a comprehensive testing checklist for the Case Request feature, covering public forms, internal dashboard, permissions, form builder, and edge cases.

---

## Table of Contents

1. [Public Form Testing](#1-public-form-testing)
2. [Internal Dashboard Testing](#2-internal-dashboard-testing)
3. [Internal Case Request Flow](#3-internal-case-request-flow)
4. [Permissions Testing](#4-permissions-testing)
5. [Form Builder Testing](#5-form-builder-testing)
6. [Edge Cases & Stress Testing](#6-edge-cases--stress-testing)
7. [Database Verification](#7-database-verification)

---

## 1. Public Form Testing

### 1.1 Form Loading & Branding

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.1.1 | Navigate to `/request/{valid-slug}` | Form loads without errors | ☐ |
| 1.1.2 | Check organization logo display | Logo appears in header if configured | ☐ |
| 1.1.3 | Check primary color theming | Buttons, links, progress bar use configured primary color | ☐ |
| 1.1.4 | Check organization display name | Shows configured display name in header | ☐ |
| 1.1.5 | Check header instructions | Displays custom instructions if configured | ☐ |
| 1.1.6 | Navigate to `/request/{invalid-slug}` | Shows "Form not found" error page | ☐ |
| 1.1.7 | Navigate to `/request/{inactive-form-slug}` | Shows "Form not available" message | ☐ |
| 1.1.8 | Navigate to `/request/{non-public-form-slug}` | Shows "Form not available" message | ☐ |

### 1.2 Case Types Population

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.2.1 | Check case type dropdown | Only active, public-allowed case types appear | ☐ |
| 1.2.2 | Select a case type | Case type is selected and stored | ☐ |
| 1.2.3 | Verify case type filtering | Only case types for this organization appear | ☐ |

### 1.3 Step 1: Client Information Validation

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.3.1 | Submit Step 1 with all fields empty | Required field errors appear | ☐ |
| 1.3.2 | Enter invalid email format | Email validation error appears | ☐ |
| 1.3.3 | Enter invalid phone format | Phone validation error appears | ☐ |
| 1.3.4 | Fill all required fields correctly | Proceed to Step 2 | ☐ |
| 1.3.5 | Check field visibility based on config | Hidden fields don't appear | ☐ |
| 1.3.6 | Check field required status based on config | Only configured required fields show asterisk | ☐ |

### 1.4 Step 2: Case Details Validation

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.4.1 | Submit Step 2 with required fields empty | Required field errors appear | ☐ |
| 1.4.2 | Check services dropdown | Only active services for org appear | ☐ |
| 1.4.3 | Enter budget hours (if visible) | Accepts valid number | ☐ |
| 1.4.4 | Enter budget dollars (if visible) | Accepts valid currency format | ☐ |
| 1.4.5 | Enter claim number | Accepts alphanumeric input | ☐ |
| 1.4.6 | Fill notes/instructions | Text area accepts long text | ☐ |

### 1.5 Progress Updates

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.5.1 | Complete Step 1 | Progress bar shows ~25% complete | ☐ |
| 1.5.2 | Complete Step 2 | Progress bar shows ~50% complete | ☐ |
| 1.5.3 | Complete Step 3 | Progress bar shows ~75% complete | ☐ |
| 1.5.4 | Reach Step 4 (Summary) | Progress bar shows ~100% complete | ☐ |
| 1.5.5 | Navigate back to previous step | Progress bar updates correctly | ☐ |

### 1.6 Step 3: Subject Management

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.6.1 | Add first subject | Subject form appears, marked as primary | ☐ |
| 1.6.2 | Fill minimum subject fields | Subject saves successfully | ☐ |
| 1.6.3 | Add second subject | Second subject form appears, not primary | ☐ |
| 1.6.4 | Edit existing subject | Click edit, modify, save updates subject | ☐ |
| 1.6.5 | Delete non-primary subject | Subject removed from list | ☐ |
| 1.6.6 | Try to delete primary subject | Error or prevented (must have primary) | ☐ |
| 1.6.7 | Check subject type dropdown | Only active subject types appear | ☐ |
| 1.6.8 | Verify date of birth picker | Calendar works, accepts valid dates | ☐ |
| 1.6.9 | Add subject with all fields | All data persists correctly | ☐ |

### 1.7 File Upload

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.7.1 | Upload single file via click | File appears in upload list | ☐ |
| 1.7.2 | Upload file via drag-and-drop | File appears in upload list | ☐ |
| 1.7.3 | Upload multiple files | All files appear in list | ☐ |
| 1.7.4 | Remove uploaded file | File removed from list | ☐ |
| 1.7.5 | Upload file > max size (if configured) | Error message about file size | ☐ |
| 1.7.6 | Upload restricted file type (if configured) | Error message about file type | ☐ |
| 1.7.7 | Check file size display | Shows human-readable size (KB/MB) | ☐ |
| 1.7.8 | Check file type icon | Correct icon for file type | ☐ |

### 1.8 Step 4: Summary Display

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.8.1 | Verify client info in summary | All client fields display correctly | ☐ |
| 1.8.2 | Verify case details in summary | Case type, services, notes display | ☐ |
| 1.8.3 | Verify subjects in summary | All subjects listed with details | ☐ |
| 1.8.4 | Verify files in summary | All uploaded files listed | ☐ |
| 1.8.5 | Click "Edit" on client section | Returns to Step 1 with data preserved | ☐ |
| 1.8.6 | Click "Edit" on case section | Returns to Step 2 with data preserved | ☐ |
| 1.8.7 | Click "Edit" on subjects section | Returns to Step 3 with data preserved | ☐ |

### 1.9 Submission

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.9.1 | Submit complete request | Loading state shows | ☐ |
| 1.9.2 | Successful submission | Success page with confirmation displayed | ☐ |
| 1.9.3 | Check request number display | Unique request number shown | ☐ |
| 1.9.4 | Check success message | Custom or default success message appears | ☐ |
| 1.9.5 | Verify database record created | `case_requests` row exists with correct data | ☐ |
| 1.9.6 | Verify subjects created | `case_request_subjects` rows exist | ☐ |
| 1.9.7 | Verify files uploaded | Files in storage, `case_request_files` rows exist | ☐ |
| 1.9.8 | Verify history record | `case_request_history` has "submitted" entry | ☐ |

### 1.10 Email Notifications

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.10.1 | Confirmation email (if enabled) | Email sent to submitter with details | ☐ |
| 1.10.2 | Staff notification (if enabled) | Email sent to configured staff addresses | ☐ |
| 1.10.3 | Custom email subject used | Email has configured subject | ☐ |
| 1.10.4 | Custom email body used | Email has configured body content | ☐ |
| 1.10.5 | Email with no confirmation enabled | No confirmation email sent | ☐ |

### 1.11 Mobile Responsiveness

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.11.1 | View on mobile (320px width) | Form is usable, no horizontal scroll | ☐ |
| 1.11.2 | View on tablet (768px width) | Layout adjusts appropriately | ☐ |
| 1.11.3 | Check button sizes on mobile | Touch targets are adequate (44px min) | ☐ |
| 1.11.4 | Check form inputs on mobile | Easy to tap and type | ☐ |
| 1.11.5 | File upload on mobile | Works with camera/photo picker | ☐ |
| 1.11.6 | Date picker on mobile | Native or mobile-friendly picker | ☐ |

### 1.12 Error Handling

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.12.1 | Network error during submission | User-friendly error message | ☐ |
| 1.12.2 | Server error (500) | Generic error message, retry option | ☐ |
| 1.12.3 | Session timeout (if applicable) | Graceful handling | ☐ |
| 1.12.4 | File upload failure | Error message, other files still listed | ☐ |
| 1.12.5 | Database constraint violation | Appropriate error message | ☐ |

---

## 2. Internal Dashboard Testing

### 2.1 Case Requests List

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.1.1 | Navigate to `/cases/requests` | List loads with requests | ☐ |
| 2.1.2 | Empty state | Shows "No case requests" message | ☐ |
| 2.1.3 | Verify columns displayed | Request #, Client, Type, Status, Submitted, Actions | ☐ |
| 2.1.4 | Click on request row | Navigates to detail page | ☐ |

### 2.2 Filtering

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.2.1 | Filter by status: Pending | Only pending requests shown | ☐ |
| 2.2.2 | Filter by status: Approved | Only approved requests shown | ☐ |
| 2.2.3 | Filter by status: Declined | Only declined requests shown | ☐ |
| 2.2.4 | Filter by status: All | All requests shown | ☐ |
| 2.2.5 | Search by request number | Matching requests shown | ☐ |
| 2.2.6 | Search by client name | Matching requests shown | ☐ |
| 2.2.7 | Clear filters | All requests shown | ☐ |

### 2.3 Pagination

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.3.1 | Page with 10+ requests | Pagination controls appear | ☐ |
| 2.3.2 | Click next page | Next set of requests loads | ☐ |
| 2.3.3 | Click previous page | Previous set loads | ☐ |
| 2.3.4 | Page size selector | Changes items per page | ☐ |
| 2.3.5 | Navigate to last page | Shows remaining requests | ☐ |

### 2.4 Dashboard Widget

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.4.1 | View dashboard | "Pending Requests" widget visible | ☐ |
| 2.4.2 | Check pending count | Matches actual pending count | ☐ |
| 2.4.3 | Click widget | Navigates to filtered pending list | ☐ |
| 2.4.4 | No pending requests | Widget shows "0" or hides | ☐ |

### 2.5 Sidebar Badge

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.5.1 | Pending requests exist | Badge shows count on sidebar | ☐ |
| 2.5.2 | No pending requests | Badge hidden or shows "0" | ☐ |
| 2.5.3 | Approve a request | Badge count decrements | ☐ |
| 2.5.4 | New request submitted | Badge count increments (may need refresh) | ☐ |

### 2.6 Detail Page

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.6.1 | Navigate to `/cases/requests/{id}` | Detail page loads | ☐ |
| 2.6.2 | Invalid request ID | 404 or "not found" page | ☐ |
| 2.6.3 | Verify request info displayed | Number, status, dates shown | ☐ |
| 2.6.4 | Verify client info section | All submitted client data shown | ☐ |
| 2.6.5 | Verify case details section | Type, services, budget, notes shown | ☐ |
| 2.6.6 | Verify subjects section | All subjects listed with details | ☐ |
| 2.6.7 | Verify files section | All files listed, downloadable | ☐ |
| 2.6.8 | Download file | File downloads correctly | ☐ |

### 2.7 Tabs

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.7.1 | Default tab | Overview/Details tab active | ☐ |
| 2.7.2 | Click Subjects tab | Subjects content shown | ☐ |
| 2.7.3 | Click Files tab | Files content shown | ☐ |
| 2.7.4 | Click History tab | Activity history shown | ☐ |
| 2.7.5 | Tab state persists on refresh | Same tab active (if URL param used) | ☐ |

### 2.8 Client Matching Flow

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.8.1 | View request with no match | "No matches found" or matching UI shown | ☐ |
| 2.8.2 | System suggests potential matches | Matching accounts displayed | ☐ |
| 2.8.3 | Select existing account | Account linked to request | ☐ |
| 2.8.4 | Create new account option | New account created, linked | ☐ |
| 2.8.5 | Contact matching | Similar flow for contacts | ☐ |
| 2.8.6 | Location matching | Similar flow for locations | ☐ |
| 2.8.7 | Match action saved | `client_match_action` updated in DB | ☐ |

### 2.9 Accept Flow

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.9.1 | Click Accept/Approve button | Confirmation dialog appears | ☐ |
| 2.9.2 | Confirm acceptance | Case created from request | ☐ |
| 2.9.3 | Verify case number generated | New case has proper case number | ☐ |
| 2.9.4 | Verify case data populated | All data transferred correctly | ☐ |
| 2.9.5 | Verify subjects transferred | `case_subjects` created from `case_request_subjects` | ☐ |
| 2.9.6 | Verify files transferred | Files linked/copied to case | ☐ |
| 2.9.7 | Request status updated | Status = "approved" | ☐ |
| 2.9.8 | `approved_case_id` set | Links to created case | ☐ |
| 2.9.9 | History entry added | "approved" action logged | ☐ |
| 2.9.10 | Navigate to created case | Link works, case page loads | ☐ |

### 2.10 Decline Flow

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.10.1 | Click Decline button | Decline dialog appears | ☐ |
| 2.10.2 | Try to decline without reason | Validation error | ☐ |
| 2.10.3 | Enter decline reason | Text area accepts input | ☐ |
| 2.10.4 | Confirm decline | Request status updated | ☐ |
| 2.10.5 | Status shows "Declined" | Visual indicator updated | ☐ |
| 2.10.6 | Decline reason saved | `decline_reason` column populated | ☐ |
| 2.10.7 | History entry added | "declined" action with reason | ☐ |
| 2.10.8 | Cannot approve after decline | Approve button disabled/hidden | ☐ |

---

## 3. Internal Case Request Flow

### 3.1 Page Loading

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.1.1 | Navigate to `/cases/requests/new` | Internal wizard loads | ☐ |
| 3.1.2 | Verify breadcrumbs | Shows "Cases > Case Requests > New" | ☐ |
| 3.1.3 | Verify page title | "New Case Request" or similar | ☐ |
| 3.1.4 | Unauthenticated user | Redirected to login | ☐ |

### 3.2 Client Mode Toggle

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.2.1 | Default mode | "New Client" selected by default | ☐ |
| 3.2.2 | Toggle to "Existing Client" | Client dropdowns appear | ☐ |
| 3.2.3 | Toggle back to "New Client" | Dropdowns hide, form clears prefill | ☐ |

### 3.3 Existing Client Selection

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.3.1 | Account dropdown loads | Shows organization's accounts | ☐ |
| 3.3.2 | Search accounts | Filters account list | ☐ |
| 3.3.3 | Select account | Contact dropdown populates | ☐ |
| 3.3.4 | Contact dropdown filtered | Only contacts for selected account | ☐ |
| 3.3.5 | Select contact | Contact info available for prefill | ☐ |
| 3.3.6 | Change account | Contact dropdown resets | ☐ |

### 3.4 Form Prefilling

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.4.1 | Select existing account | Client name field prefilled | ☐ |
| 3.4.2 | Account address prefilled | Address fields populated | ☐ |
| 3.4.3 | Select contact | Contact name fields prefilled | ☐ |
| 3.4.4 | Contact email prefilled | Email field populated | ☐ |
| 3.4.5 | Contact phone prefilled | Phone field populated | ☐ |
| 3.4.6 | Edit prefilled values | Can modify prefilled data | ☐ |
| 3.4.7 | Proceed to Step 2 | Prefilled data persists | ☐ |

### 3.5 Internal Submission

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.5.1 | Submit internal request | Request created successfully | ☐ |
| 3.5.2 | Verify `created_by` set | Current user ID in column | ☐ |
| 3.5.3 | Verify `source_type` = 'internal' | Column has correct value | ☐ |
| 3.5.4 | No captcha required | Form submits without captcha | ☐ |

### 3.6 Auto-Matching

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.6.1 | Submit with existing account selected | `matched_account_id` set | ☐ |
| 3.6.2 | Submit with existing contact selected | `matched_contact_id` set | ☐ |
| 3.6.3 | `client_match_action` = 'existing' | Set when account selected | ☐ |
| 3.6.4 | `contact_match_action` = 'existing' | Set when contact selected | ☐ |
| 3.6.5 | Submit as "New Client" | Match fields are null | ☐ |

---

## 4. Permissions Testing

### 4.1 Role-Based Access

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.1.1 | Admin views case requests | Full access to all features | ☐ |
| 4.1.2 | Manager views case requests | Access per configured permissions | ☐ |
| 4.1.3 | Investigator views case requests | Limited or no access (per config) | ☐ |
| 4.1.4 | Vendor views case requests | Blocked (if blockVendors enabled) | ☐ |

### 4.2 Specific Permissions

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.2.1 | User without `view_case_requests` | Cannot access list or details | ☐ |
| 4.2.2 | User with `view_case_requests` only | Can view but not approve/decline | ☐ |
| 4.2.3 | User without `approve_case_requests` | Approve button hidden/disabled | ☐ |
| 4.2.4 | User with `approve_case_requests` | Can approve requests | ☐ |
| 4.2.5 | User without `delete_case_requests` | Cannot delete requests | ☐ |
| 4.2.6 | User without `manage_case_request_forms` | Cannot access form builder | ☐ |
| 4.2.7 | User with `manage_case_request_forms` | Full form builder access | ☐ |

### 4.3 Cross-Organization Security

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.3.1 | Try to view other org's requests | Access denied or empty results | ☐ |
| 4.3.2 | Try to approve other org's request | Blocked by RLS | ☐ |
| 4.3.3 | Try to access other org's form | Access denied | ☐ |

---

## 5. Form Builder Testing

### 5.1 Form Management

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.1.1 | Navigate to form builder | Form list loads | ☐ |
| 5.1.2 | Create new form | Form created with default config | ☐ |
| 5.1.3 | Edit existing form | Form editor loads with data | ☐ |
| 5.1.4 | Delete form | Form removed after confirmation | ☐ |
| 5.1.5 | Duplicate form | New form created with copied config | ☐ |

### 5.2 General Settings Tab

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.2.1 | Edit form name | Name updates | ☐ |
| 5.2.2 | Edit form slug | Slug updates, URL changes | ☐ |
| 5.2.3 | Slug validation | No spaces, special chars limited | ☐ |
| 5.2.4 | Duplicate slug | Error message | ☐ |
| 5.2.5 | Edit header instructions | Text saves | ☐ |
| 5.2.6 | Edit success message | Text saves | ☐ |

### 5.3 Branding Tab

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.3.1 | Upload logo | Logo saves and displays | ☐ |
| 5.3.2 | Remove logo | Logo removed | ☐ |
| 5.3.3 | Set primary color | Color picker works | ☐ |
| 5.3.4 | Edit organization display name | Name updates | ☐ |
| 5.3.5 | Edit organization phone | Phone saves | ☐ |
| 5.3.6 | Edit organization website | URL saves | ☐ |

### 5.4 Fields Configuration Tab

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.4.1 | Toggle field visibility | Field shown/hidden on preview | ☐ |
| 5.4.2 | Toggle field required | Field required/optional on preview | ☐ |
| 5.4.3 | Edit field label | Label changes on preview | ☐ |
| 5.4.4 | Reorder fields (if supported) | Field order changes | ☐ |
| 5.4.5 | Reset to defaults | Config reverts | ☐ |

### 5.5 Notifications Tab

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.5.1 | Enable confirmation email | Toggle saves | ☐ |
| 5.5.2 | Edit confirmation subject | Subject saves | ☐ |
| 5.5.3 | Edit confirmation body | Body saves | ☐ |
| 5.5.4 | Enable staff notifications | Toggle saves | ☐ |
| 5.5.5 | Add staff email address | Address added to list | ☐ |
| 5.5.6 | Remove staff email address | Address removed | ☐ |
| 5.5.7 | Invalid email format | Validation error | ☐ |

### 5.6 Activation/Deactivation

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.6.1 | Activate form | `is_active` = true | ☐ |
| 5.6.2 | Deactivate form | `is_active` = false | ☐ |
| 5.6.3 | Make form public | `is_public` = true | ☐ |
| 5.6.4 | Make form private | `is_public` = false | ☐ |
| 5.6.5 | Inactive form not accessible | Public URL shows "not available" | ☐ |
| 5.6.6 | Private form not accessible | Public URL shows "not available" | ☐ |

### 5.7 Preview

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.7.1 | Click preview button | Preview modal/page opens | ☐ |
| 5.7.2 | Preview shows branding | Logo, colors applied | ☐ |
| 5.7.3 | Preview shows field config | Visible/hidden fields correct | ☐ |
| 5.7.4 | Preview is non-functional | Cannot submit from preview | ☐ |

### 5.8 Field Configuration Effects

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.8.1 | Hide "Client Address" fields | Fields not shown on public form | ☐ |
| 5.8.2 | Make "Claim Number" required | Public form requires it | ☐ |
| 5.8.3 | Hide entire "Budget" section | Budget fields not shown | ☐ |
| 5.8.4 | Custom label for field | Public form shows custom label | ☐ |
| 5.8.5 | Multiple forms, different configs | Each form reflects its config | ☐ |

---

## 6. Edge Cases & Stress Testing

### 6.1 Minimum Data

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.1.1 | Submit with only required fields | Submission succeeds | ☐ |
| 6.1.2 | Submit with no subjects (if allowed) | Handles gracefully | ☐ |
| 6.1.3 | Submit with no files | Submission succeeds | ☐ |
| 6.1.4 | All optional fields blank | No errors, nulls stored | ☐ |

### 6.2 Maximum Data

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.2.1 | All fields filled with max length | Submission succeeds | ☐ |
| 6.2.2 | 10+ subjects added | All subjects saved | ☐ |
| 6.2.3 | 20+ files uploaded | All files saved | ☐ |
| 6.2.4 | Very long notes/instructions | Text saved correctly | ☐ |
| 6.2.5 | Max length for each text field | No truncation | ☐ |

### 6.3 Special Characters

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.3.1 | Names with accents (José, François) | Saved and displayed correctly | ☐ |
| 6.3.2 | Names with apostrophes (O'Brien) | No SQL injection, saves correctly | ☐ |
| 6.3.3 | HTML in text fields (`<script>`) | Sanitized or escaped | ☐ |
| 6.3.4 | Emojis in notes | Saved and displayed | ☐ |
| 6.3.5 | Unicode characters | Handled correctly | ☐ |
| 6.3.6 | Quotes in text fields | No issues | ☐ |

### 6.4 File Edge Cases

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.4.1 | File with very long name | Name truncated or handled | ☐ |
| 6.4.2 | File with special characters in name | Handled correctly | ☐ |
| 6.4.3 | File with no extension | Accepted or appropriate error | ☐ |
| 6.4.4 | 0-byte file | Rejected or warning | ☐ |
| 6.4.5 | Large file (50MB+) | Size limit error or success | ☐ |
| 6.4.6 | Upload same file twice | Both saved or duplicate warning | ☐ |

### 6.5 International Addresses

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.5.1 | Non-US address format | All fields accept input | ☐ |
| 6.5.2 | Country selection (if available) | Country saves | ☐ |
| 6.5.3 | Postal code variations (UK, Canada) | Accepted | ☐ |
| 6.5.4 | Address with non-ASCII characters | Saved correctly | ☐ |

### 6.6 Concurrent Operations

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.6.1 | Two users approve same request | One succeeds, one gets conflict | ☐ |
| 6.6.2 | Approve while editing | Handles gracefully | ☐ |
| 6.6.3 | Multiple simultaneous submissions | All processed correctly | ☐ |
| 6.6.4 | Rapid consecutive submissions | Rate limiting or all succeed | ☐ |

### 6.7 Browser/Session

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.7.1 | Refresh mid-form (public) | Data persisted or warning | ☐ |
| 6.7.2 | Back button navigation | Form state handled | ☐ |
| 6.7.3 | Multiple tabs same form | Independent sessions | ☐ |
| 6.7.4 | Session expires during form | Graceful error on submit | ☐ |
| 6.7.5 | Submit from very old tab | Handles token expiry | ☐ |

---

## 7. Database Verification

### 7.1 Record Integrity

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.1.1 | `case_requests` record complete | All columns populated correctly | ☐ |
| 7.1.2 | `request_number` unique | No duplicates | ☐ |
| 7.1.3 | `organization_id` correct | Matches form's organization | ☐ |
| 7.1.4 | Timestamps accurate | `created_at`, `submitted_at` correct | ☐ |
| 7.1.5 | Source tracking | `source_ip`, `source_user_agent` saved | ☐ |

### 7.2 Related Records

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.2.1 | Subjects have correct `case_request_id` | FK relationship intact | ☐ |
| 7.2.2 | Files have correct `case_request_id` | FK relationship intact | ☐ |
| 7.2.3 | History has correct `case_request_id` | FK relationship intact | ☐ |
| 7.2.4 | Primary subject marked | `is_primary = true` for one subject | ☐ |

### 7.3 Cascade Operations

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.3.1 | Delete request | Related subjects deleted (if cascade) | ☐ |
| 7.3.2 | Delete request | Related files deleted (if cascade) | ☐ |
| 7.3.3 | Delete request | Related history deleted (if cascade) | ☐ |
| 7.3.4 | Storage files cleaned up | Orphan files removed | ☐ |

---

## Notes

- **Status Legend**: ☐ = Not Tested, ✓ = Passed, ✗ = Failed
- **Priority**: Tests in sections 1-3 are highest priority for release
- **Automation**: Tests marked with [AUTO] are candidates for automated testing
- **Date**: This checklist was last updated on January 16, 2026

---

## Test Execution Log

| Date | Tester | Sections Tested | Issues Found | Notes |
|------|--------|-----------------|--------------|-------|
| | | | | |
| | | | | |
| | | | | |

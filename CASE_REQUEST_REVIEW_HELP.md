# Case Request Review and Conversion Flow - Help Content Reference

This document contains all tooltips, inline explanations, confirmation modal copy, and warning text for the Case Request review and conversion workflow.

---

## 1. Flow Overview Guidance

### What Converting a Request Does
> Converting a request creates a new active case in your organization. All subject information and uploaded files are automatically transferred from the request to the new case. The original request is marked as 'Approved' and preserved for audit purposes.

### What Cannot Be Undone
- **Acceptance**: The case is created permanently; you can close the case but cannot "un-convert" the request
- **Decline**: The request status change is final; declined requests cannot be reopened
- **Delete**: Request and all associated files are permanently removed

### Who Gains Access
> The new case inherits your organization's standard case permissions. Staff with case access can view and manage the case. The original requester does NOT gain system access.

### Records Created Automatically
- New case record with auto-generated case number
- Case subjects copied from request subjects
- Case attachments transferred from request files
- Case history record documenting the conversion
- Status history record tracking the approval

---

## 2. Action Button Tooltips

### Accept Button
| State | Tooltip |
|-------|---------|
| Enabled | "Create a new case from this request" |
| Disabled (no client matched) | "Match a client before accepting this request" |
| Disabled (no permission) | "You don't have permission to approve case requests" |

### Decline Button
| State | Tooltip |
|-------|---------|
| Enabled | "Reject this request without creating a case" |
| Disabled (no permission) | "You don't have permission to decline case requests" |

### Delete Button
| State | Tooltip |
|-------|---------|
| Enabled | "Permanently remove this request and all associated files" |
| Disabled (no permission) | "You don't have permission to delete case requests" |

---

## 3. Confirmation Modal Copy

### Accept & Create Case Dialog

**Title**: Accept Case Request

**Description**:
> This will create a new case from this request:
> - A unique case number will be generated
> - Subject information will be transferred to the case
> - Uploaded files will be copied to case attachments
> - You will be assigned as the initial Case Manager
> - The request will be marked as Approved
>
> This action cannot be reversed. The case can be closed but not deleted.

**Primary Action**: Accept & Create Case
**Cancel Action**: Cancel

---

### Decline Request Dialog

**Title**: Decline Case Request

**Description**:
> Declining this request marks it as rejected. The request data remains available for reference but no case will be created.
>
> Provide a reason to help staff understand why this request was declined. The requester will not see this reason unless you contact them separately.

**Reason Field Label**: Reason for Declining
**Reason Field Placeholder**: "e.g., Duplicate request, Out of service area, Insufficient information..."
**Reason Field Inline Help**: "Optional. Visible only to staff with request access."

**Primary Action**: Decline Request
**Cancel Action**: Cancel

---

### Delete Request Dialog

**Title**: Delete Case Request

**Description**:
> This permanently deletes the case request and all associated data:
> - All uploaded files will be removed from storage
> - All request history will be erased
> - This action cannot be undone
>
> Consider declining the request instead if you want to preserve the submission record.

**Security Warning**:
> ⚠️ Deleting requests may affect compliance records. Ensure this is appropriate for your organization's retention policies.

**Primary Action**: Delete Request
**Cancel Action**: Cancel

---

## 4. Client Matching Section Guidance

### Warning Alert (Unmatched Request)
**Current**: "This request was entered using the public request form, so you'll have to match it to an existing client before you can accept the request."

**Enhanced**:
> This request was submitted through the public form and is not linked to your client records. Match it to an existing client or create a new one before accepting.

### Client Selection
| Element | Tooltip/Help |
|---------|--------------|
| Client Field Label | Tooltip: "The account that will be billed for this case" |
| Create New Client Button (+) | Tooltip: "Create a new client account from this request's information" |
| Client Dropdown | Inline: "Select the client this case should be associated with." |

### Contact Selection
| Element | Tooltip/Help |
|---------|--------------|
| Primary Contact Label | Tooltip: "The person at the client company who will receive case updates" |
| Create New Contact Button (+) | Tooltip: "Create a new contact from the requester's information" |
| Contact Dropdown | Inline: "Optional. Links a specific contact to the case." |

### Match Client Button
| Element | Tooltip/Help |
|---------|--------------|
| Tooltip | "Link this request to the selected client" |
| Inline (before matching) | "Matching saves the client association. You can still change it before accepting." |

### Success State (After Matching)
**Alert Text**: "Client matched: [Client Name] - [Contact Name]"
**Additional Context**: "You can now accept this request to create a case."

---

## 5. Status Panel Guidance

### Status Tooltips
| Status | Tooltip |
|--------|---------|
| Pending | "This request is awaiting review by staff" |
| Approved | "This request was converted to an active case" |
| Declined | "This request was rejected without creating a case" |

### Converted to Case Section
**Inline explanation**: "This request has been converted to a case. All further work should be done in the case record. The request is preserved for audit purposes."

---

## 6. History Tab Guidance

### Section Header Help
> This timeline shows all activity on this request, including when it was submitted, who reviewed it, and any changes to client matching.

### Event Type Tooltips
| Event | Tooltip |
|-------|---------|
| Request Submitted | "The request was created via the public submission form" |
| Request Viewed | "A staff member opened this request" |
| Client Matched | "The request was linked to a client account" |
| Contact Matched | "A primary contact was assigned to the request" |
| Request Approved | "The request was accepted and a case was created" |
| Request Declined | "The request was rejected without creating a case" |
| Request Edited | "Request details were modified by staff" |

---

## 7. Implementation Files

1. `src/pages/CaseRequestDetail.tsx` - Enhanced dialog copy
2. `src/components/case-request-detail/CaseRequestDetailHeader.tsx` - Button tooltips
3. `src/components/case-request-detail/ClientMatchingSection.tsx` - Matching guidance
4. `src/components/case-request-detail/RequestStatusPanel.tsx` - Status tooltips
5. `src/components/case-request-detail/RequestHistoryTab.tsx` - Event explanations

---

## 8. Components Used

- `HelpTooltip` for field-level info icons
- `DelayedTooltip` for action buttons and status badges
- `Alert` component for section-level warnings
- Enhanced `AlertDialogDescription` content for confirmation modals
- Inline `<p className="text-xs text-muted-foreground">` for help text

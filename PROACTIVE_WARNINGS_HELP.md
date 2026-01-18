# Proactive Warning Messages Reference

This document serves as a master reference for all proactive warning messages displayed in the application. Warnings are designed to prevent mistakes by explaining consequences, offering guidance, and maintaining a supportive (non-punitive) tone.

---

## Implementation Details

- **Component**: `src/components/shared/ProactiveWarning.tsx`
- **Severity Levels**: `info` (blue), `caution` (amber), `critical` (red border, amber fill)
- **Tone**: Explain, don't blame. Offer alternatives. Assume good intent.

---

## Category A: Irreversible Actions

### Delete Case
| Element | Content |
|---------|---------|
| **Title** | Permanent Deletion |
| **Consequence** | This case and all associated data (subjects, updates, attachments, financial records) will be permanently deleted. |
| **Guidance** | Consider archiving instead to preserve records for compliance. Closed cases remain accessible but read-only. |

### Delete Subject
| Element | Content |
|---------|---------|
| **Title** | Remove Subject from Case |
| **Consequence** | This subject and their linked evidence will be removed from this case. The subject profile remains in the system if linked to other cases. |
| **Guidance** | If this subject was added in error, deletion is appropriate. For inactive subjects, consider marking as 'No longer relevant' instead. |

### Delete Approved Time Entry
| Element | Content |
|---------|---------|
| **Title** | Delete Approved Time Entry |
| **Consequence** | This time entry has been approved and may have been included in client reports. Deletion is logged in the audit trail. |
| **Guidance** | If this entry was invoiced, contact your administrator. Adjustments to invoiced time require invoice amendments. |

### Finalize Invoice
| Element | Content |
|---------|---------|
| **Title** | Finalize Invoice |
| **Consequence** | Finalizing locks all included time entries, expenses, and services. These items cannot be edited or reassigned after finalization. |
| **Guidance** | Review the invoice PDF preview before finalizing. Draft invoices can be edited; finalized invoices require amendments. |

### Close Case
| Element | Content |
|---------|---------|
| **Title** | Close Case |
| **Consequence** | Closing prevents new time entries, expenses, and subject additions. The case becomes read-only for most users. |
| **Guidance** | Ensure all billable work is logged before closing. Cases can be reopened if additional work is needed. |

### Decline Case Request
| Element | Content |
|---------|---------|
| **Title** | Decline Request |
| **Consequence** | The requestor will be notified that their case request was declined. This decision is logged and cannot be undone. |
| **Guidance** | Include a reason to help the requestor understand the decision. They may submit a corrected request. |

---

## Category B: Missing Required Data

### Invoice Generation - Missing Billing Rates
| Element | Content |
|---------|---------|
| **Title** | Billing Rates Required |
| **Consequence** | Invoice cannot be generated without configured billing rates. Some line items have no pricing. |
| **Guidance** | Configure rates in Account Settings → Billing Rates. All services used in this case need pricing rules. |
| **Action** | Configure Rates |

### Case Creation - No Client
| Element | Content |
|---------|---------|
| **Title** | Client Required |
| **Consequence** | Cases must be associated with a client account for billing and reporting purposes. |
| **Guidance** | Select an existing client or create a new account. Client information can be updated after case creation. |

### Time Entry - Missing Description
| Element | Content |
|---------|---------|
| **Title** | Description Recommended |
| **Consequence** | Time entries without descriptions may be questioned during client review and are harder to defend in billing disputes. |
| **Guidance** | Include what was done and why. Example: 'Conducted surveillance at subject residence - no activity observed.' |

### Expense - Missing Receipt
| Element | Content |
|---------|---------|
| **Title** | Receipt Recommended |
| **Consequence** | Expenses without receipts may be rejected during approval or questioned by clients. |
| **Guidance** | Attach a photo of the receipt. If unavailable, note the reason in the description. |

### Subject Profile - Incomplete Address
| Element | Content |
|---------|---------|
| **Title** | Address Incomplete |
| **Consequence** | Incomplete addresses reduce location success rates for field investigators. |
| **Guidance** | Include at minimum: street address, city, and state. Apartment numbers and landmarks improve accuracy. |

### Report Generation - No Attachments
| Element | Content |
|---------|---------|
| **Title** | No Evidence Selected |
| **Consequence** | The generated report will not include any attachment references. This may weaken the report's evidentiary value. |
| **Guidance** | Select relevant attachments to include as evidence. Linked attachments provide the strongest evidence chain. |

---

## Category C: Permission Conflicts

### Edit Others' Time Entry
| Element | Content |
|---------|---------|
| **Title** | Editing Another User's Entry |
| **Consequence** | This time entry belongs to another user. Your edit will be logged and attributed to you. |
| **Guidance** | Contact the original author for corrections when possible. Manager edits should include a reason. |

### Case Reassignment
| Element | Content |
|---------|---------|
| **Title** | Case Reassignment |
| **Consequence** | The current assignee will lose access. Notifications will be sent to both the old and new assignees. |
| **Guidance** | Ensure the new assignee has capacity. Consider adding as secondary investigator instead if collaboration is needed. |

### Change User Role
| Element | Content |
|---------|---------|
| **Title** | Role Change Impact |
| **Consequence** | Changing this user's role immediately affects their permissions. They may gain or lose access to cases and features. |
| **Guidance** | Review the permissions matrix before changing roles. Consider discussing with the user first. |

### Remove Vendor Access
| Element | Content |
|---------|---------|
| **Title** | Revoke Vendor Access |
| **Consequence** | This vendor will immediately lose access to this case. Any in-progress work may be interrupted. |
| **Guidance** | Ensure the vendor has submitted all updates before removal. Their historical contributions remain visible. |

### Bulk Permission Change
| Element | Content |
|---------|---------|
| **Title** | Organization-Wide Change |
| **Consequence** | This permission change affects all users with this role across your organization. Changes take effect immediately. |
| **Guidance** | Test with a single user first if unsure. Permission changes are logged but reversible. |

---

## Category D: Compliance Risks

### Audit Trail Protection
| Element | Content |
|---------|---------|
| **Title** | Audit Trail Protected |
| **Consequence** | Audit log entries cannot be deleted. This ensures compliance with evidence preservation requirements. |
| **Guidance** | If an entry contains an error, contact support. Corrections are appended, not overwritten. |

### Export Subject PII
| Element | Content |
|---------|---------|
| **Title** | Sensitive Data Export |
| **Consequence** | This export includes personally identifiable information (SSNs, addresses). Unauthorized disclosure may violate privacy regulations. |
| **Guidance** | Ensure you have authorization to access this data outside the system. Consider excluding SSNs if not required. |

### Backdate Time Entry
| Element | Content |
|---------|---------|
| **Title** | Backdated Entry |
| **Consequence** | Entries more than 7 days old may be flagged during audits. Backdated entries are logged with creation timestamp for transparency. |
| **Guidance** | Include a note explaining why this entry is being added late. Consistent late entries may trigger compliance review. |

### Override Budget Cap
| Element | Content |
|---------|---------|
| **Title** | Budget Override Required |
| **Consequence** | This case has exceeded its authorized budget. Adding billable entries requires manager authorization and is logged. |
| **Guidance** | Request a budget increase from the case manager. Alternative: save work as non-billable notes until budget is approved. |

### Modify Closed Case
| Element | Content |
|---------|---------|
| **Title** | Modifying Archived Record |
| **Consequence** | This case is closed. Modifications are logged and may affect previously generated reports. |
| **Guidance** | Consider reopening the case if significant work is needed. Minor corrections can be made but require justification. |

### Void Invoice
| Element | Content |
|---------|---------|
| **Title** | Void Invoice |
| **Consequence** | Voiding removes this invoice from client balances but preserves it in records. The underlying entries return to 'uninvoiced' status. |
| **Guidance** | Voiding is appropriate for billing errors. For partial adjustments, use credit memos instead. |

---

## Pre-Action Validation Warnings

| Context | Trigger | Warning |
|---------|---------|---------|
| Invoice Creation | $0 total | "This invoice has no billable items. Verify time and expenses are approved and not already invoiced." |
| Case Closure | Unapproved entries | "X time entries are pending approval. These will remain uninvoiced if you close now." |
| Subject Deletion | Multi-case subject | "This subject is linked to X other cases. They will be removed from this case only." |
| Account Deletion | Active cases | "Cannot delete account with active cases. Close or reassign cases first." |
| User Deactivation | Assigned cases | "This user is assigned to X active cases. Reassign before deactivating." |

---

## Inline Field Warnings

| Field | Trigger | Warning |
|-------|---------|---------|
| Budget Amount | $0 entered | "A budget of $0 will immediately block billable entries." |
| Hard Cap Toggle | Enabled | "Hard cap will block all entries when budget is reached. Users cannot override without admin action." |
| Retainer Balance | Negative | "Negative retainer balance may delay case work until replenished." |
| Service End Date | Past date | "Setting an end date in the past will immediately close this service to new entries." |
| Rate Field | $0 rate | "A rate of $0 means this service is non-billable. Time entries will have no monetary value." |

---

## Tone Guidelines

### Do's
- Explain consequences factually
- Always offer an alternative action
- Assume the user has good intentions
- Keep messages under 50 words total

### Don'ts
- Don't use accusatory language
- Don't use exclamation marks excessively
- Don't block actions without explanation
- Don't make users feel they did something wrong

### Examples

| Punitive (Avoid) | Supportive (Use) |
|------------------|------------------|
| "Don't delete this unless you're sure!" | "Deletion is permanent. Consider archiving instead." |
| "You forgot to add a description." | "Descriptions help with billing disputes and client clarity." |
| "Error: You can't do that." | "This action requires manager approval. Request authorization?" |
| "Warning: Missing required field!" | "Client is required for billing and reporting." |

---

## Accessibility Requirements

- Use `role="alert"` for critical warnings
- Use `role="status"` for informational warnings
- Maintain 4.5:1 color contrast minimum
- Include icons + text (don't rely on color alone)
- Support keyboard dismissal where applicable
- Use `aria-live="polite"` for dynamic warnings

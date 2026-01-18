# Expenses, Budgets, and Financial Entries Help

This document provides comprehensive guidance on managing expenses, budgets, and financial entries within the case management system.

---

## Core Concepts

### Why Expenses Must Be Linked

| Concept | Explanation |
|---------|-------------|
| **Audit Trail** | Every expense must connect to a case, and optionally to a subject or activity. This creates an unbroken chain of documentation that proves work was authorized and performed. |
| **Billing Accuracy** | Linked expenses flow directly into invoices. Unlinked expenses cannot be billed and may represent lost revenue or compliance gaps. |
| **Legal Defensibility** | In legal proceedings, opposing counsel may challenge your expenses. Links to specific activities and subjects prove the expense was case-related. |

### How Linking Affects Billing and Audits

| Impact Area | Explanation |
|-------------|-------------|
| **Invoice Generation** | Only approved, linked expenses appear on invoices. Missing links mean missing revenue. |
| **Budget Tracking** | Linked expenses count against case budgets. Unlinked expenses are invisible to budget calculations. |
| **Compliance Reports** | Auditors look for gaps between reported work and supporting expenses. Complete linking demonstrates proper procedure. |

---

## Finance Types

### Expenses
Reimbursable costs incurred during investigation. These include mileage, meals, database fees, equipment rentals, and other out-of-pocket costs.

**Key Fields:**
- **Description**: Detailed narrative of what this expense covers
- **Quantity**: Number of units (e.g., miles, items)
- **Unit Price**: Cost per unit (required)
- **Category**: Expense category for reporting and filtering
- **Date**: When this expense was incurred
- **Status**: Current approval state

### Time Entries
Billable hours logged for work performed on the case.

**Key Fields:**
- **Description**: What work was performed
- **Hours**: Billable hours worked (use 0.25 hour increments)
- **Hourly Rate**: Rate per hour for this work
- **Category**: Work category for reporting

---

## Budget Management

### Budget Types
- **Hours Only**: Track only hours worked
- **Dollars Only**: Track only dollars spent
- **Both Hours & Dollars**: Track both metrics

### Cap Types
- **Soft Cap**: Warnings shown but work can continue past budget
- **Hard Cap**: Work is BLOCKED when budget is exceeded

### Budget Status Thresholds
- **Normal**: 0-79% utilized
- **Warning**: 80-89% utilized
- **Critical**: 90-99% utilized
- **Over**: 100%+ utilized

---

## Best Practices

1. **Enter expenses promptly** - Record costs on the day incurred while details are fresh

2. **Be descriptive** - Write descriptions as if explaining to a judge:
   - ✅ "Mileage from office to subject's residence for scheduled surveillance"
   - ❌ "Mileage"

3. **Always link to activities** - Connected entries prove the expense was part of authorized work

4. **Attach receipts** - Upload receipt images to case updates and link to the expense

5. **Use correct categories** - Consistent categorization improves reporting and tax documentation

6. **Review before approval** - Once approved, entries are locked and flow into invoices

---

## What Happens If Data Is Missing

| Missing Data | Consequence |
|--------------|-------------|
| **No Description** | Entry cannot be saved. Descriptions are required for audit trail. |
| **No Date** | Entry cannot be saved. Date determines budget period and reporting. |
| **No Unit Price (Expense)** | Entry cannot be saved. All expenses must have documented costs. |
| **No Activity Link** | Entry can be saved but: may not appear in activity reports, harder to justify to clients, may flag in compliance audits. |
| **No Subject Link** | Entry can be saved but: cannot calculate per-subject costs, may complicate multi-subject billing. |
| **Wrong Category** | Entry can be saved but: may appear in wrong expense reports, could affect tax categorization. |

---

## Status Workflow

### Expense/Time Status Flow
1. **Pending** - Awaiting review and approval
2. **Approved** - Verified and ready for billing
3. **Rejected** - Not approved for billing

### Invoice Status Flow
1. **Draft** - Being prepared
2. **Sent** - Delivered to client
3. **Pending** - Awaiting payment
4. **Partial** - Partially paid
5. **Paid** - Fully paid
6. **Overdue** - Past due date

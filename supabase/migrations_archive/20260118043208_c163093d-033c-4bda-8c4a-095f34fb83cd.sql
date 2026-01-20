-- Insert Budgets, Expenses, and Financial Tracking documentation
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
  'Budgets, Expenses, and Financial Tracking',
  'budgets-expenses-financial-tracking',
  '# Budgets, Expenses, and Financial Tracking

CaseWyze implements a comprehensive financial management system that links every dollar to specific work, enforces budget controls, and creates court-ready audit trails. This guide explains how the system works and why structured financial entry protects your firm.

---

## Why Structured Financial Entry Matters

Investigation firms face unique financial challenges:

| Challenge | Risk Without Structure |
|-----------|----------------------|
| **Disputed Charges** | "We never authorized that work" |
| **Budget Overruns** | Unprofitable cases, client complaints |
| **Audit Failures** | Unexplained expenses, compliance issues |
| **Billing Fraud** | Unbacked time entries, phantom expenses |
| **Collection Difficulties** | Vague invoices clients won''t pay |

CaseWyze''s structured approach ensures:

✅ Every charge traces to authorized work
✅ Budgets are monitored in real-time
✅ Approvals create accountability
✅ Invoices are defensible and detailed
✅ Audits are straightforward

---

## The Financial System Architecture

### Core Components

```
Case Budget (Authorization)
    ↓
Service Instance (Contract)
    ↓
Time/Expense Entry (Work Performed)
    ↓
Approval (Verification)
    ↓
Invoice (Client Billing)
    ↓
Retainer Application (Payment)
```

### Key Tables and Their Purpose

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **case_budgets** | Overall case financial limits | total_budget_amount, total_budget_hours, hard_cap |
| **case_service_budget_limits** | Per-service spending limits | max_amount, max_hours, warning_threshold |
| **time_entries** | Billable and non-billable time | hours, rate, event_id, update_id, status |
| **expense_entries** | Costs incurred during investigation | quantity, rate, receipt_url, status |
| **invoices** | Client billing documents | total, status, retainer_applied |
| **retainer_funds** | Trust account deposits | amount, status, case_id |

---

## Budget Types and Enforcement

### Case-Level Budgets

Case budgets define the total authorized spending for an entire case.

| Field | Purpose |
|-------|---------|
| **total_budget_amount** | Maximum dollars authorized |
| **total_budget_hours** | Maximum hours authorized |
| **budget_type** | Combined, hours-only, or amount-only |
| **hard_cap** | Whether to block work that exceeds budget |

**Budget Enforcement Behavior**:

| Hard Cap | Over Budget | Behavior |
|----------|-------------|----------|
| ✅ Enabled | Approaching | Warning displayed |
| ✅ Enabled | Exceeded | New entries blocked |
| ❌ Disabled | Approaching | Warning displayed |
| ❌ Disabled | Exceeded | Warning only, entries allowed |

### Service-Level Budgets

Service budgets limit spending within specific service categories (e.g., Surveillance, Records Research).

| Field | Purpose |
|-------|---------|
| **max_hours** | Maximum hours for this service |
| **max_amount** | Maximum dollars for this service |
| **warning_threshold** | Percentage at which warnings appear (default: 80%) |

**Why Service Budgets Matter**:

- Client approved 40 hours total, but only 20 for surveillance
- Prevents over-allocation to expensive services
- Enables accurate quotes and scope management

### Budget Consumption Tracking

The system tracks budget consumption in real-time:

```
Budget Status = (Approved Entries + Invoiced Items) / Budget Limit
```

| Status | Percentage | Display |
|--------|------------|---------|
| **Healthy** | 0-79% | Green indicator |
| **Warning** | 80-99% | Yellow indicator |
| **At Limit** | 100% | Red indicator |
| **Over Budget** | >100% | Red + blocking (if hard cap) |

---

## How Expenses Link to Updates and Events

### The Linking Requirement

CaseWyze requires financial entries to link to source work:

| Entry Type | Links To | Purpose |
|------------|----------|---------|
| **Time Entry** | Event and/or Update | Proves work was performed |
| **Expense Entry** | Update and/or Receipt | Documents cost justification |

### Why Linking Is Required

**Without Linking**:
```
Invoice Line: "Surveillance - 8 hours - $800"
Client Question: "When? Where? What did you find?"
Answer: "Um... we''re not sure."
```

**With Linking**:
```
Invoice Line: "Surveillance - 8 hours - $800"
   → Links to Activity: "01/15/2024 - Subject Residence Surveillance"
   → Links to Update: "Morning surveillance with 23-entry timeline"
   → Links to Attachments: "8 photos, GPS log"
Client Question: "Show me the work."
Answer: "Here''s the complete documented session."
```

### Billing Eligibility Requirements

For time entries to be billable, ALL conditions must be met:

| Requirement | Why |
|-------------|-----|
| ✅ Linked to an **Event** (not Task) | Events are scheduled, authorized work |
| ✅ Event has a **completed Update** | Narrative documentation exists |
| ✅ Event links to **Service Instance** | Pricing and budget tracking enabled |
| ✅ Service Instance is **billable** | Non-billable services are excluded |
| ✅ **Pricing rule exists** | Rate can be determined |
| ✅ **Not already billed** | Prevents duplicate charges |

---

## The Financial Workflow

### Step 1: Budget Setup (Case Creation)

When a case is created or approved from a request:

1. Case-level budget set (hours and/or dollars)
2. Service instances created for requested work
3. Service-level budgets configured (optional)
4. Retainer collected if required

### Step 2: Work Performance (Field Work)

During investigation:

1. Investigator completes Event (surveillance, meeting, etc.)
2. Creates Update with narrative and timeline
3. Time/expense entries auto-generated or manually created
4. Entries linked to Event and Update
5. Entries start in "pending" status

### Step 3: Manager Review (Approval)

Before invoicing:

1. Manager reviews pending entries in Financial tab
2. Verifies hours/amounts are reasonable
3. Confirms linkage to documented work
4. Approves or rejects with reason
5. Approved items become eligible for invoicing
6. Budget consumption updates upon approval

### Step 4: Invoice Generation

Creating client invoices:

1. Manager selects approved items to invoice
2. System calculates totals and applies retainer
3. Invoice generated with line-item detail
4. Links to source work preserved for reference
5. Invoice status: Draft → Sent → Paid

### Step 5: Retainer Application

Applying trust funds:

1. Retainer balance checked against invoice
2. System applies available retainer to invoice
3. Retainer transaction logged with invoice reference
4. Remaining balance updated
5. Client owes any amount beyond retainer

---

## Time Entry Details

### Time Entry Fields

| Field | Purpose | Required |
|-------|---------|----------|
| **hours** | Duration of work | Yes |
| **rate** | Hourly billing rate | Yes (from service pricing) |
| **total** | Calculated: hours × rate | Auto |
| **event_id** | Linked activity | Recommended |
| **update_id** | Linked narrative | Recommended |
| **status** | pending, approved, invoiced, void | Yes |
| **notes** | Description of work | Recommended |
| **item_type** | Category for grouping | Optional |

### Time Entry Status Flow

```
Pending → Approved → Invoiced
    ↓         ↓
  Void      Void
```

| Status | Meaning | Can Edit |
|--------|---------|----------|
| **pending** | Awaiting manager review | ✅ Yes |
| **approved** | Verified, ready for invoice | ⚠️ Limited |
| **invoiced** | Added to client invoice | ❌ No |
| **void** | Cancelled, won''t be billed | ❌ No |

---

## Expense Entry Details

### Expense Entry Fields

| Field | Purpose | Required |
|-------|---------|----------|
| **quantity** | Number of units | Yes |
| **rate** | Cost per unit | Yes |
| **total** | Calculated: quantity × rate | Auto |
| **receipt_url** | Attached receipt image/PDF | Recommended |
| **event_id** | Linked activity | Optional |
| **update_id** | Linked narrative | Recommended |
| **status** | pending, approved, invoiced, void | Yes |
| **notes** | Description/justification | Recommended |
| **item_type** | Expense category | Recommended |

### Common Expense Categories

| Category | Examples |
|----------|----------|
| **Mileage** | Travel to surveillance locations |
| **Vehicle** | Gas, parking, tolls |
| **Database** | Background check fees |
| **Filing Fees** | Court document requests |
| **Subcontractor** | Third-party investigator fees |
| **Equipment** | Camera rental, GPS tracker |
| **Meals** | Field work meals (if billable) |
| **Miscellaneous** | Other case-related costs |

### Receipt Requirements

| Expense Amount | Receipt Required |
|----------------|-----------------|
| Under $25 | Recommended but not required |
| $25-$100 | Strongly recommended |
| Over $100 | Required for approval |
| Mileage | GPS log or route documentation |

---

## Retainers vs Budgets

### Critical Distinction

| Concept | Definition | Purpose |
|---------|------------|---------|
| **Budget** | Authorization to spend | "You may spend up to $5,000" |
| **Retainer** | Actual money received | "Client deposited $2,500" |

### How They Work Together

```
Budget: $5,000 (authorization)
Retainer: $2,500 (money in trust)
Work Performed: $3,000
Amount Due: $3,000 - $2,500 = $500
```

### Retainer Trust Fund Rules

| Rule | Purpose |
|------|---------|
| Retainer ≠ Revenue | Money isn''t earned until work is done |
| Held in trust | Funds belong to client until invoiced |
| Applied to invoices | Reduces client payment obligation |
| Refundable balance | Unused retainer returned at case close |
| Audit trail required | All applications logged |

---

## How Financial Tracking Affects Billing

### Invoice Accuracy

Linked financial entries enable detailed invoices:

```
INVOICE #2024-0156
Case: Johnson v. Smith (#2024-0042)

TIME ENTRIES
01/15/2024 - Surveillance (8.0 hrs @ $100/hr) - $800.00
  → Activity: Subject Residence Surveillance
  → Update: Morning surveillance with timeline

01/16/2024 - Report Writing (2.5 hrs @ $85/hr) - $212.50
  → Update: Case Progress Summary

EXPENSES
01/15/2024 - Mileage (45 miles @ $0.67/mi) - $30.15
  → Receipt: GPS Log attached
  → Update: Morning surveillance

SUBTOTAL: $1,042.65
RETAINER APPLIED: -$500.00
AMOUNT DUE: $542.65
```

### Disputed Charge Defense

When clients question charges, linked entries provide:

| Evidence | Source |
|----------|--------|
| Work authorization | Budget approval, service instance |
| Work performed | Activity with start/end times |
| Documentation | Update with narrative and timeline |
| Physical evidence | Attached photos, GPS logs |
| Approval chain | Manager approval timestamp |

---

## How Financial Tracking Affects Audits

### Internal Audits

The system supports internal reviews with:

| Feature | Benefit |
|---------|---------|
| Pending queue | All entries reviewed before billing |
| Approval attribution | Know who approved each charge |
| Budget monitoring | Catch overruns before they become problems |
| Void tracking | Cancelled entries preserved for audit |

### External Audits (Licensing, Legal)

For regulatory and legal proceedings:

| Requirement | How CaseWyze Delivers |
|-------------|----------------------|
| Complete records | All entries preserved (never deleted) |
| Contemporaneous | Timestamps prove when recorded |
| Verifiable | Links to source work verify accuracy |
| Attributable | User IDs on all actions |
| Immutable | Invoiced items cannot be changed |

### Court Testimony Support

When testifying about billing:

| Question | Evidence Available |
|----------|-------------------|
| "How do you know you worked 8 hours?" | Activity start/end times |
| "What did you observe?" | Linked update with timeline |
| "Do you have evidence?" | Attached photos/files |
| "Who verified this charge?" | Approval record with manager ID |
| "When was this recorded?" | Entry creation timestamp |

---

## How Financial Tracking Affects Reporting

### Financial Reports

The system generates comprehensive financial reports:

| Report | Contents |
|--------|----------|
| **Case Financial Summary** | All time/expenses for a case |
| **Invoice Detail** | Line-item breakdown with links |
| **Budget Status** | Consumption vs authorization |
| **Retainer Statement** | Deposits and applications |
| **Profitability Analysis** | Revenue vs costs by case |

### Report Accuracy

Linked entries ensure reports reflect reality:

- Hours match activity durations
- Expenses match receipts
- Totals match invoices
- Budgets match authorizations

---

## Common Mistakes and How to Avoid Them

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| **Entering time without linking to activity** | Unbacked charges, client disputes | Always link to source event |
| **Skipping expense receipts** | Audit failures, rejected charges | Upload receipts immediately |
| **Ignoring budget warnings** | Overruns, profitability loss | Review warnings, get authorization |
| **Approving without review** | Billing errors reach clients | Verify each entry before approval |
| **Backdating entries** | Audit integrity questions | Record work contemporaneously |
| **Not setting service budgets** | Uncontrolled spending | Configure service limits at case setup |
| **Confusing retainers and budgets** | Trust accounting errors | Budget = authorization, Retainer = money |
| **Voiding instead of correcting** | Lost billing opportunity | Correct errors, void only if truly invalid |
| **Waiting to invoice** | Cash flow problems | Invoice regularly (weekly or bi-weekly) |

---

## Best Practices

### For Investigators

| Practice | Why |
|----------|-----|
| **Record time as you work** | Contemporaneous records are stronger |
| **Link entries to activities** | Proves work was authorized |
| **Upload receipts immediately** | Prevents lost documentation |
| **Include descriptive notes** | Helps manager understand charges |
| **Check budget status** | Avoid surprises from hard caps |

### For Managers

| Practice | Why |
|----------|-----|
| **Review entries daily/weekly** | Catch errors early |
| **Verify linkage before approval** | Ensure defensible billing |
| **Monitor budget consumption** | Prevent overruns |
| **Invoice promptly** | Maintain cash flow |
| **Document rejections** | Create accountability trail |

### For Administrators

| Practice | Why |
|----------|-----|
| **Configure service pricing carefully** | Affects all billing calculations |
| **Set appropriate budget defaults** | Streamlines case setup |
| **Enable hard caps for high-risk cases** | Prevents unauthorized overruns |
| **Review financial reports monthly** | Identify trends and issues |
| **Audit approval patterns** | Ensure proper oversight |

---

## Compliance Considerations

### Trust Account Compliance

| Requirement | How CaseWyze Helps |
|-------------|-------------------|
| Separate trust funds | Retainers tracked separately from revenue |
| Client-specific tracking | Retainers linked to specific cases |
| Application documentation | Every retainer application logged |
| Refund capability | Unused balances tracked for return |

### Billing Record Retention

| Jurisdiction | Typical Requirement | CaseWyze Approach |
|--------------|--------------------|--------------------|
| Most states | 5-7 years minimum | All records preserved permanently |
| Federal contracts | 3 years post-completion | Immutable after case closure |
| Legal matters | Until statute of limitations expires | Never deleted, always auditable |

### Audit Trail Requirements

| Requirement | Implementation |
|-------------|---------------|
| Who created | user_id on every entry |
| When created | created_at timestamp |
| What changed | status changes logged |
| Who approved | approval user_id and timestamp |
| Immutability | Invoiced items locked from changes |

---

## Summary

CaseWyze''s financial tracking system is designed around three principles:

### 1. Every Dollar Is Linked

Time and expense entries connect to:
- Activities (what work was authorized)
- Updates (what was documented)
- Service instances (what pricing applies)
- Attachments (what evidence exists)

### 2. Budgets Are Enforced

- Case-level limits cap total spending
- Service-level limits control allocation
- Hard caps can block unauthorized work
- Warnings appear before limits are reached

### 3. Approvals Create Accountability

- Entries start as pending
- Managers review and approve
- Approval triggers budget consumption
- Invoiced items become immutable

This structure protects everyone:

| Party | Protection |
|-------|------------|
| **Clients** | Clear, defensible invoices |
| **Investigators** | Work is documented and credited |
| **Managers** | Visibility into all spending |
| **Firms** | Compliant, auditable records |

When questioned about any charge, you can trace it from invoice → approval → entry → activity → update → evidence. That''s the power of structured financial tracking.',
  '9465f035-71fe-43e1-b505-1ccab82412ac',
  'Complete guide to CaseWyze financial management including budgets, expenses, time entries, retainers, and invoicing. Learn how financial entries link to work documentation, budget enforcement, and compliance considerations.',
  'billing',
  true,
  4
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
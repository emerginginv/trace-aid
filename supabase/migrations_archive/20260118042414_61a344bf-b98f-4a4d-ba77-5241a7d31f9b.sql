-- Insert comprehensive Case Century (Full Case Lifecycle) documentation
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
  'The Case Century: Complete Case Lifecycle',
  'case-century-complete-lifecycle',
  '# The Case Century: Complete Case Lifecycle

The **Case Century** represents the complete arc of investigative work in CaseWyze—from the moment a case request enters the system until final closure and archival. Understanding this lifecycle is essential for professional case management.

## Why Structure Matters

CaseWyze enforces structured case management not as bureaucracy, but as **professional protection**. Every investigation firm faces three critical challenges:

1. **Accountability**: Who did what, and when?
2. **Defensibility**: Can you prove your work product in court?
3. **Organization**: Can you find what you need years later?

The Case Century addresses all three by creating an immutable, auditable record of every action throughout a case''s life.

---

## Phase 1: Intake

The intake phase transforms raw requests into actionable cases.

### The Request Journey

| Stage | What Happens | Audit Trail |
|-------|--------------|-------------|
| **Request Submission** | Public form or internal creation captures all initial data | Timestamp, IP address, user agent recorded |
| **Pending Review** | Staff examines completeness, matches client/contact records | All review actions logged with user attribution |
| **Approval Decision** | Request approved or declined with documented reason | Decision recorded permanently, cannot be undone |
| **Case Activation** | New case created with transferred data, case number assigned | Case creation linked to originating request |

### Why Requests Exist

The request phase serves critical purposes:

- **Validation**: Prevents unverified work from entering the case system
- **Client Matching**: Ensures proper client/contact associations before work begins
- **Budget Approval**: Establishes agreed-upon scope before commitment
- **Paper Trail**: Creates clear evidence that work was authorized

### What Transfers from Request to Case

When a request is approved:

- Subject information (name, DOB, addresses, contact info)
- Client/contact associations (matched or newly created)
- Case type and requested services
- Budget parameters (hours and dollars)
- Instructions and special requirements
- All attached files

### Irreversible Action Warning

⚠️ **Decline decisions cannot be undone.** Once a request is declined, the decision is permanent. If the work is later needed, a new request must be submitted.

---

## Phase 2: Active Investigation

The active investigation phase is where the actual work happens.

### 2a. Assignment

| Action | Who Performs | What''s Recorded |
|--------|--------------|------------------|
| Case Manager assigned | Admin/Manager | Assignment date, assigning user |
| Investigators assigned | Case Manager | Role type, assignment date, any budget allocations |
| Service instances created | Case Manager | Linked services, applicable pricing rules, estimated quantities |

**Best Practice**: Complete all assignments and budget configuration before field work begins. This prevents billing surprises and ensures proper accountability.

### 2b. Evidence Collection

Evidence collection is the foundation of professional investigation. CaseWyze protects evidence integrity at every step.

| Evidence Type | Collection Method | Integrity Protection |
|---------------|-------------------|----------------------|
| **Attachments** | Direct upload with automatic SHA-256 hashing | Hash verified on access, immutable metadata |
| **Subject Photos** | Upload linked to subject record | Subject association preserved, timestamped |
| **Surveillance Media** | Upload with activity linkage | Timeline preserved, chain of custody maintained |

**Critical Protections**:

- Files cannot be deleted, only archived (maintains chain of custody)
- Every file access is logged for audit purposes
- SHA-256 checksums enable court testimony on evidence integrity
- Original metadata preserved regardless of viewing or downloading

### 2c. Updates and Narratives

Updates provide the narrative context that transforms raw evidence into a cohesive story.

| Update Type | Purpose | Typical Contents |
|-------------|---------|------------------|
| **Surveillance** | Field work documentation | Activity timeline, observations, subject behavior |
| **Case Update** | General progress notes | Status changes, findings, next steps |
| **Client Contact** | Client communications | Meeting summaries, directives, approvals |
| **3rd-Party Contact** | External communications | Witness statements, records requests, agency responses |

**Key Points**:

- Updates create contemporaneous records (documented as work happens)
- AI can generate summaries from multiple updates for reporting
- Each update is attributed to the creating user with timestamp
- Updates link to specific service instances for work categorization

### 2d. Activities and Time Tracking

Activities represent discrete units of work that can be billed and reported.

| Activity Type | Typical Use | Billing Impact |
|---------------|-------------|----------------|
| **Surveillance** | Field observation sessions | Hours × service hourly rate |
| **Site Visit** | Location inspections | Hours × service rate |
| **Meeting** | Client/team meetings | Hours × service rate (often discounted) |
| **Task** | Administrative work | May be non-billable depending on service setup |

**How Activities Work**:

1. Activity created with start/end times or duration
2. Optional linkage to service instance (for budget tracking)
3. Completion marks activity as ready for billing review
4. Approved activities become invoice line items

**Key Points**:

- Activities can trigger automatic time entries based on duration
- Completion timestamps enable precise duration calculation
- Activities link to specific service instances for budget tracking
- Service budget limits can prevent activities that would exceed budgets

---

## Phase 3: Financial Tracking

Financial tracking ensures accurate billing and maintains client trust.

### The Financial Workflow

| Stage | What Happens | Who Acts |
|-------|--------------|----------|
| **Time/Expense Entry** | Staff records hours worked and costs incurred | Investigators, Staff |
| **Approval Queue** | Manager reviews entries for accuracy and billability | Managers |
| **Budget Monitoring** | System tracks spending against service/case limits | Automatic |
| **Invoice Generation** | Approved items compiled into client invoice | Managers |
| **Retainer Application** | Retainer funds offset invoice amounts | Automatic/Manager |
| **Payment Recording** | Client payments matched to invoices | Staff, Managers |

### Financial Audit Trail

Every financial action creates permanent audit entries:

- Approval/rejection with reason and user
- Invoice status transitions (draft → sent → paid)
- Retainer applications with amounts and invoices affected
- Payment recordings with date, amount, method

### Key Financial Protections

- **Rate Freezing**: Billing rates locked at invoice generation (client sees agreed rates, not later changes)
- **Budget Warnings**: Configurable thresholds warn before overspending
- **No Alterations**: Financial history cannot be changed, only corrected with adjusting entries
- **Approval Attribution**: Every approval/rejection tied to specific user

---

## Phase 4: Reporting

Reports transform investigation work into professional deliverables.

### Report Types

| Template | Purpose | Typical Use |
|----------|---------|-------------|
| **Standard Investigation** | Comprehensive findings report | Most investigations |
| **Court-Ready Report** | Formatted for legal proceedings | Litigation support, testimony prep |
| **Surveillance Log** | Activity-by-activity documentation | Field work records |
| **Financial Summary** | Detailed billing breakdown | Client expense reporting |
| **Case Closure Report** | Final summary with conclusions | End-of-case delivery |

### Report Components

Professional reports can include:

- **Case Variables**: Case number, subjects, client information
- **Update Collections**: Narrative content filtered by type, date, or author
- **Attachment Embeds**: Photos, documents, and evidence with preserved metadata
- **Custom Text Sections**: Executive summary, findings, conclusions, recommendations

### Key Points

- Reports reference case state at the moment of generation
- Multiple report instances can exist per case (drafts, versions)
- Report generation creates audit log entry
- Reports can be regenerated if case data changes before closure

---

## Phase 5: Closure and Archival

The closure phase transitions cases from active work to permanent record.

### The Closure Process

1. **Complete Status**: Active investigation work finished, final review begins
2. **Final Report Delivery**: Case Closure Report generated and delivered to client
3. **Final Invoicing**: All billable items invoiced, payments collected
4. **Closure Confirmation**: Manager moves case to Closed status
5. **Read-Only State**: Case becomes immutable (no further changes)

### What "Closed" Means

| Action | Closed Case | Reason |
|--------|-------------|--------|
| Add updates | ❌ Blocked | Preserves final work product |
| Add time entries | ❌ Blocked | Billing is complete |
| Edit case details | ❌ Blocked | Maintains audit integrity |
| Add attachments | ❌ Blocked | Evidence collection complete |
| View case | ✅ Allowed | Reference access always available |
| Generate reports | ✅ Allowed | Historical documentation needs |
| Search case | ✅ Allowed | Institutional knowledge preserved |

### Reopening Cases

While closure is intended to be final, cases can be reopened when necessary:

- Requires **Manager role or higher**
- Documented reason is **required**
- Creates new entry in status history (audit trail)
- All subsequent actions are fully logged

**Consider Alternatives**: Before reopening, consider whether a new "related case" would be more appropriate. Related cases maintain separation while preserving the linkage.

### Why Immutability Matters

Case immutability after closure provides critical protections:

- **Audit Integrity**: Final reports reference a fixed case state
- **Legal Defensibility**: Post-closure changes raise questions about evidence tampering
- **Billing Clarity**: Closed cases should not accumulate unexpected charges
- **Regulatory Compliance**: Many industries require final states to be immutable

---

## How Structure Protects You

### Protection for Investigators

| Protection | How CaseWyze Delivers |
|------------|----------------------|
| Action Attribution | Every action tied to specific user and timestamp |
| Evidence Integrity | SHA-256 hashes verify files haven''t been altered |
| Work Protection | Your work product is protected from unauthorized changes |
| Professional Documentation | Your observations are preserved exactly as recorded |

### Protection for Firms

| Protection | How CaseWyze Delivers |
|------------|----------------------|
| Regulatory Compliance | Clear audit trails satisfy licensing requirements |
| Defensible Billing | Approval workflows prove billing accuracy |
| Legal Documentation | Court-ready reports with evidence chain of custody |
| Institutional Knowledge | Searchable archive of all past work |

### Protection for Clients

| Protection | How CaseWyze Delivers |
|------------|----------------------|
| Transparent Work Product | Clear evidence of effort and findings |
| Accurate Billing | Approval accountability prevents overcharging |
| Court-Ready Documentation | Evidence meets legal standards when needed |
| Secure Storage | Their sensitive information is protected |

---

## Best Practices

| Phase | Best Practice | Why It Matters |
|-------|---------------|----------------|
| **Intake** | Complete client matching during review | Prevents duplicate accounts and billing confusion |
| **Assignment** | Set budget limits before work begins | Prevents billing surprises and scope creep |
| **Active** | Log updates as work progresses, not later | Creates contemporaneous record (legally stronger) |
| **Evidence** | Upload files with descriptive names and context | Improves searchability and chain of custody |
| **Financial** | Approve entries weekly | Maintains cash flow accuracy and catches errors early |
| **Reporting** | Generate draft reports before closure | Catches missing information while still editable |
| **Closure** | Review all pending items before closing | Prevents stranded work and incomplete billing |

---

## Common Mistakes and How to Avoid Them

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| **Closing cases with pending billing** | Lost revenue, accounting discrepancies | Always review Financial tab before closure |
| **Not matching clients during intake** | Duplicate accounts, fragmented history | Complete client matching during request review |
| **Uploading files without context** | Unclear evidence chain, weak documentation | Include descriptions and link to relevant updates |
| **Skipping budget setup** | Overspending without warning | Configure service budgets at case assignment |
| **Backdating entries** | Audit integrity questions, legal risk | Enter work contemporaneously as it happens |
| **Closing cases prematurely** | Work product locked, unable to complete | Confirm all deliverables complete before closure |
| **Not using service instances** | No budget tracking, unclear billing | Always assign activities to service instances |

---

## Summary

The Case Century represents CaseWyze''s commitment to professional case management. By enforcing structure at every phase:

- **Intake** ensures only authorized, validated work enters your system
- **Active Investigation** creates comprehensive, court-ready documentation
- **Financial Tracking** maintains billing accuracy and client trust
- **Reporting** transforms your work into professional deliverables
- **Closure** preserves your work product in an immutable, defensible state

This structure isn''t bureaucracy—it''s professional protection. When your work is challenged, questioned, or audited, the Case Century provides the documentation you need to defend your actions, justify your billing, and demonstrate your professionalism.',
  '9465f035-71fe-43e1-b505-1ccab82412ac',
  'Complete guide to the CaseWyze case lifecycle - from initial request through active investigation, financial tracking, reporting, and final closure. Learn how structured case management protects investigators, firms, and clients.',
  'cases',
  true,
  1
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
-- Add "You Might Be Wondering..." sections to additional articles

-- 1. Update Case Request Workflow article
UPDATE public.help_articles
SET content = content || '

---

## You Might Be Wondering...

### "Why do we need case requests? Can''t we just create cases directly?"

You can create cases directly if you have permission. But case requests serve a crucial purpose: they create a documented authorization trail. When a client submits a request, you have proof they asked for the work. When you approve it, you have proof you agreed to the scope. If there''s ever a dispute about what was authorized, the request record settles it.

### "What happens if I accidentally decline a request?"

Unfortunately, declines are permanent—this is intentional to prevent tampering with intake records. If work is actually needed, the client or requestor must submit a new request. The declined request remains in the system as a historical record. This is why CaseWyze asks for a decline reason: document why so there''s no confusion later.

### "Can the client see the status of their request?"

Not automatically. Requestors submit through public forms but don''t have system logins. If you want to keep clients informed, you''ll need to communicate status updates via email or phone. Some firms create Vendor accounts for regular clients who want portal access, but that''s a separate decision from the basic request workflow.

### "What if the client information doesn''t match any existing account?"

During review, you can create a new account or choose to create one during case approval. The system tries to match based on company name and contact email, but it''s not always perfect. When approving a request with unmatched client info, CaseWyze will guide you through creating the new account record so everything is properly linked.

### "How long do pending requests sit before they expire?"

They don''t expire. Pending requests remain pending until someone takes action. However, requests sitting too long suggest a workflow problem. Most firms aim to review new requests within 24-48 hours. The Case Requests dashboard shows you how long each request has been waiting, helping you prioritize the queue.

### "Can I edit a request after it''s submitted?"

Staff with proper permissions can update request details during the review phase—correcting typos, adding missing information, or clarifying instructions. These edits are logged. However, once a request is approved and becomes a case, the original request is locked. The case can be modified, but the intake record is preserved as submitted.',
updated_at = now()
WHERE slug = 'case-request-workflow';

-- 2. Update Understanding Case Status System article
UPDATE public.help_articles
SET content = content || '

---

## You Might Be Wondering...

### "Why are there so many statuses? Can''t we just use Open and Closed?"

You could, but you''d lose valuable visibility. Investigation work has distinct phases: intake, active work, pending something, awaiting approval, complete but not delivered, closed. Each phase might require different actions or attention. Statuses let you filter your case list to "show me everything waiting on client response" or "show me cases ready for final report." That granularity saves time.

### "What''s the difference between the status and the status category?"

Status is the specific label: "Pending Client Approval," "Under Investigation," "Report Drafting." Status category is the phase grouping: Active, Pending, Complete, Closed. Categories help with reporting and filtering when you don''t care about the specific status—you just want all active cases or all cases waiting on something external.

### "Who can change a case status?"

Managers and Admins can change any status. Investigators typically cannot—this is intentional. Status changes represent case lifecycle decisions, not field work. If an investigator completes their surveillance, they document it through updates and activities; the manager decides when the case status should advance. This separation ensures proper oversight.

### "What happens when I close a case?"

The case becomes read-only. No new updates, activities, time entries, expenses, or attachments can be added. Existing data remains fully viewable and searchable. Reports can still be generated. This immutability protects the integrity of your work product. If additional work is needed, consider reopening (requires justification) or creating a new related case.

### "Can I create my own custom statuses?"

Admins can create organization-specific statuses in Settings. You can define the label, assign a color, place it in a category, and set its order in the workflow. Most firms customize statuses to match their terminology: "Field Work Active" vs. "Under Investigation" might mean the same thing, but using your firm''s language helps adoption.

### "Why does the status history matter?"

Status history creates an audit trail of case progression. Licensing boards, courts, and clients may ask: "How long was this case under investigation?" "When did it move to pending status?" "Who authorized the closure?" Status history answers these questions definitively. It also helps you analyze your workflow: if cases sit in "Pending Client Response" for weeks, maybe your client communication process needs attention.',
updated_at = now()
WHERE slug = 'understanding-case-status-system';
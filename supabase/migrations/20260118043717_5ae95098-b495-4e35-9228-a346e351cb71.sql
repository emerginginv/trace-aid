-- Add "You Might Be Wondering..." sections to major help articles

-- 1. Update Case Century article
UPDATE public.help_articles
SET content = content || '

---

## You Might Be Wondering...

### "What happens if I make a mistake in an update?"

Don''t panic. Updates can be edited after creation—but only by users with the right permissions, and every edit is logged. If you''re an investigator, ask your case manager to make corrections. The original content isn''t deleted; the system preserves the edit history. For truly significant errors, your manager can help you create a correcting update that references the original.

### "Can I reopen a closed case?"

Yes, but it''s intentionally not easy. Reopening requires Manager or Admin role, a documented reason, and creates an audit entry. Before reopening, consider: would a new related case be better? Reopening is meant for "we forgot something important," not "the client wants more work." New work usually deserves a new case with its own clean audit trail.

### "Why can''t I delete files I uploaded?"

This is a feature, not a limitation. Investigation evidence must maintain chain of custody. Deleted files create gaps that opposing counsel will exploit: "What was in that deleted file?" Instead, files can be archived or marked as superseded. The original remains in the system, but won''t appear in reports. Your evidence integrity is protected.

### "What if the client disputes our billing?"

This is exactly why CaseWyze links everything together. When a client questions a charge, you can trace it from invoice → approved entry → activity → update → evidence. "You billed 8 hours on January 15th—here''s the surveillance activity with start/end times, here''s the update with the 23-entry timeline, and here are the 8 photos taken during that period." Disputes become conversations, not arguments.

### "How far back can I access old cases?"

Forever. CaseWyze never deletes case data. Closed cases remain fully searchable and viewable. You can generate reports from cases years old. This matters for legal proceedings, licensing audits, and institutional knowledge. The only restriction is that closed cases can''t be modified—that''s what protects their integrity.

### "What if our internet goes down during field work?"

Plan ahead. Many investigators draft updates offline and enter them when connectivity returns. The key is recording timestamps accurately—document when events actually occurred, not when you entered them. CaseWyze timestamps when entries are created, but your narrative should reflect actual event times. Be contemporaneous in your documentation even if you''re delayed in your data entry.',
updated_at = now()
WHERE slug = 'case-century-complete-lifecycle';

-- 2. Update Updates, Events, and Activity Logs article
UPDATE public.help_articles
SET content = content || '

---

## You Might Be Wondering...

### "Do I really need to create an activity before writing an update?"

Not always, but it''s strongly recommended for billable work. Here''s why: activities create the scheduled, trackable unit of work. Updates document what happened. When you link them, billing becomes automatic and defensible. For quick notes or client communications, a standalone update is fine. But for surveillance, meetings, or any work you''ll bill? Create the activity first.

### "What''s the difference between completing an activity and creating an update?"

Completing an activity marks the work as done and captures the duration. Creating an update documents what happened during that work. They''re complementary: the activity answers "what work was performed and for how long?" while the update answers "what did we observe and find?" Best practice: complete your activity, then create a linked update with your narrative.

### "Why do my timeline entries need such specific times?"

Because vague timelines destroy credibility. "Subject left residence in the morning" vs. "07:23 - Subject emerged from residence, entered silver Honda Accord." The second version can be cross-referenced with other evidence, supports testimony, and demonstrates professional observation. Specific times show you were actually there, paying attention, documenting in real-time.

### "Can I edit a timeline entry after saving the update?"

Yes, but edits are logged. If you notice a typo or need to add detail, you can edit. But if you''re changing times or key observations significantly, consider whether you should add a clarifying note instead. Courts and opposing counsel can subpoena edit histories. Minor corrections are fine; substantial changes after the fact raise questions.

### "What happens to activities I create but never complete?"

They sit in your task list, making you look disorganized. More importantly, incomplete activities can''t be billed. If you scheduled something that didn''t happen, update the activity status to "Cancelled" with a note explaining why. This keeps your records clean and provides documentation if anyone asks why planned work wasn''t performed.

### "How do I handle surveillance where nothing happened?"

Document it thoroughly. "Nothing observed" is still an observation. Create your timeline entries showing your arrival, position, and regular status checks. "08:00 - Arrived at surveillance position. Subject vehicle present. 09:00 - No activity observed. Subject vehicle remains in driveway." This proves you were there, paying attention, and provides negative evidence that can be just as valuable as positive observations.',
updated_at = now()
WHERE slug = 'updates-events-activity-logs';

-- 3. Update Permissions and Access Control article
UPDATE public.help_articles
SET content = content || '

---

## You Might Be Wondering...

### "Why can''t I see a case I know exists?"

You can only see cases you''re assigned to. This isn''t a bug—it''s protecting client confidentiality. Ask your case manager to add you to the case. If you were previously assigned and now can''t see it, you may have been removed (which also gets logged). Managers and admins can see all cases; investigators see only their assignments.

### "I''m a new investigator. Why is everything grayed out?"

Your permissions are set to the Investigator role, which is intentionally limited. You can view assigned cases, create updates, upload files, and record time—the core field work functions. You can''t delete, edit others'' work, or access financials. This protects you as much as the firm: you can''t accidentally delete evidence or modify someone else''s documentation.

### "Can I see what other investigators are working on?"

Only if you''re assigned to the same cases. CaseWyze maintains strict case-level access control. You might work alongside another investigator and never see their other assignments. This isn''t about distrust—it''s about need-to-know and client confidentiality. Managers have the cross-case visibility needed for workload management.

### "What happens if someone leaves the company?"

Their account should be deactivated immediately by an admin. Once deactivated, they can no longer access the system, but all their historical work remains attributed to them. Updates they wrote, time they recorded, files they uploaded—everything stays in place for audit purposes. The firm''s data is protected, and the record remains complete.

### "Can I share my login with a colleague?"

Absolutely not. Every action in CaseWyze is attributed to the logged-in user. If you share credentials and something goes wrong—accidental deletion, improper access, anything—the audit trail points to you. More importantly, in legal proceedings, you may need to testify that you personally performed actions logged under your account. Shared logins destroy that ability.

### "Why do vendors have such limited access?"

Vendors are external to your organization. They''re valuable partners, but they shouldn''t see your internal notes, billing rates, other clients'' cases, or staff information. Limited access protects your business relationships, pricing strategies, and client confidentiality. Vendors can do their job—contribute to shared cases—without accessing information that doesn''t concern them.',
updated_at = now()
WHERE slug = 'permissions-access-control-guide';

-- 4. Update Budgets, Expenses, and Financial Tracking article
UPDATE public.help_articles
SET content = content || '

---

## You Might Be Wondering...

### "What''s the difference between a budget and a retainer?"

This confuses everyone at first. **Budget** = authorization ("you may spend up to $5,000"). **Retainer** = actual money ("client deposited $2,500 in trust"). You can have a $10,000 budget with a $2,500 retainer, meaning you''re authorized to do $10,000 of work, but only $2,500 is prepaid. The remaining $7,500 will be invoiced as work is performed.

### "Why was my time entry rejected?"

Common reasons: hours don''t match activity duration, description is too vague, entry isn''t linked to a service instance, or the case is over budget. Your manager should provide a reason with the rejection. Fix the issue and resubmit. Rejections aren''t personal—they protect both you and the client by ensuring billing accuracy.

### "What happens if I go over budget?"

Depends on whether the case has a "hard cap" enabled. With hard cap: the system blocks new billable entries until budget is increased. Without hard cap: you''ll see warnings but can continue working. Either way, talk to your manager before exceeding budget. Unauthorized overruns create difficult client conversations and may not be billable.

### "Can I bill for time spent writing updates?"

That depends on your firm''s policy and how services are configured. Many firms consider documentation part of the service (surveillance includes writing the report). Others have separate "Report Writing" services. Check with your manager. If report writing is billable, create a separate activity linked to the appropriate service.

### "Why do I need to attach receipts to expenses?"

Because "trust me" doesn''t work in audits or client disputes. Receipts prove the expense was real, the amount is accurate, and it was case-related. For mileage, GPS logs or route documentation serve the same purpose. Missing receipts often mean rejected expenses. Get in the habit of photographing receipts immediately.

### "What if I realize I made a billing error after the invoice was sent?"

Contact your manager immediately. Invoiced items can''t be directly edited (that would break the audit trail), but correcting entries can be created. For overcharges, a credit memo can be issued. For undercharges, a supplemental invoice can be created. The original invoice remains in the system for audit purposes, with the correction clearly documented.

### "How do I know if my time entry was approved?"

Check the status column in your time entries. "Pending" means awaiting review, "Approved" means it''s been verified and will appear on the next invoice, "Rejected" means it needs correction, and "Invoiced" means it''s been billed to the client. You should see your entries move through these stages, usually within a week of submission.',
updated_at = now()
WHERE slug = 'budgets-expenses-financial-tracking';

-- 5. Update Reports and Exports article
UPDATE public.help_articles
SET content = content || '

---

## You Might Be Wondering...

### "Why can''t I generate reports as an investigator?"

Report generation is restricted to Manager and Admin roles because reports are client-facing deliverables. Investigators do the fieldwork and documentation; managers verify quality and handle client communication. If you need a report for your own reference, ask your manager. They can generate it and share it with you or give you view access to the saved version.

### "What if I need to change something after generating a report?"

You can''t edit a generated report—that would break the audit trail. Instead, fix the underlying case data (update the narrative, correct subject information, etc.) and generate a new report. The old report remains in the system as a historical record. This is intentional: anyone reviewing your reports can see what was produced and when.

### "How do I know which template to use?"

Your organization should have templates named descriptively: "Standard Surveillance Report," "Insurance SIU Summary," "Court-Ready Investigation Report." If you''re unsure, ask your manager. Different clients and use cases often require different templates. Using the wrong template isn''t catastrophic—you can always regenerate—but it wastes time.

### "What happens to reports when a case is closed?"

Nothing changes. Closed cases retain all their reports, and you can still generate new reports from closed cases. The data is frozen (you can''t add new updates or activities), but the reporting capability remains. This is important for legal proceedings that may occur years after an investigation concludes.

### "Can I download the Word file and edit it?"

Yes, but understand the implications. The downloaded file is fully editable—you can fix formatting, add sections, whatever you need. But those edits exist only in your local copy. The saved report in CaseWyze reflects the original generation. If the edited version is ever questioned, the system version is the authoritative record. Edit thoughtfully.

### "Why are some of my merge variables showing blank?"

The variable has no data to pull. For example, `{{Subject.ssn_last4}}` will be blank if no SSN is recorded for the subject, or if your role doesn''t have permission to see that data. Check your template for variables that might not apply to every case, and consider using conditional sections or placeholder text for optional fields.

### "How long are generated reports kept?"

Indefinitely. Every report generated through CaseWyze is saved to the case record with full audit metadata: who generated it, when, which template, and what variable values were used. This supports compliance requirements and provides defensibility. You can access reports from years-old cases without any degradation or loss.',
updated_at = now()
WHERE slug = 'reports-exports-professional-documentation';
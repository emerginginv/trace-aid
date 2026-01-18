# CaseWyze Inline Help & Tooltip Standards

A concise, actionable ruleset for designers and developers to implement consistent contextual guidance across CaseWyze.

---

## 1. GUIDANCE HIERARCHY

Use the right tool for the right situation:

| Type | Component | When to Use | Dismissible? |
|------|-----------|-------------|--------------|
| **Tooltip** | `DelayedTooltip` | Label clarification, abbreviation expansion, quick hints | Auto-dismiss on mouse leave |
| **Help Icon** | `HelpTooltip` | Field-level explanations, "Why is this here?" | Auto-dismiss |
| **Contextual Help** | `ContextualHelp` | Deep explanations, workflow guidance, "Learn more" | User-controlled |
| **Inline Help** | Static text below field | Always-visible guidance for complex inputs | Persistent |
| **Warning** | `Alert` variant="default" | Non-blocking caution about consequences | Persistent |
| **Error** | `Alert` variant="destructive" / `InlineError` | Validation failures, system errors | Until resolved |

---

## 2. LENGTH STANDARDS

### Tooltip (hover-triggered)
- **Max**: 12 words / 80 characters
- **Goal**: Immediate comprehension in <2 seconds
- **Format**: Single sentence fragment, no period
- **Example**: `Case manager who receives all notifications`

### Help Icon Tooltip
- **Max**: 25 words / 150 characters
- **Goal**: Answer one specific question
- **Format**: Complete sentence, may include brief "why"
- **Example**: `The primary contact is notified of all status changes and receives case reports by default.`

### Inline Help Text
- **Max**: 40 words / 250 characters
- **Goal**: Prevent common errors, explain constraints
- **Format**: 1-2 sentences below the input
- **Example**: `Enter the claim reference exactly as it appears on the insurance document. This cannot be changed after case creation.`

### Contextual Help (sheet/modal)
- **Max**: No strict limit, but prefer concise paragraphs
- **Goal**: Comprehensive understanding, workflow context
- **Format**: Headers, bullet points, examples

### Warning Alerts
- **Max**: 50 words
- **Goal**: State consequence, provide path forward
- **Format**: Title (2-4 words) + Description (1-2 sentences)

---

## 3. TONE RULES

All guidance must be:

| ✅ Do | ❌ Don't |
|-------|---------|
| Professional and direct | Marketing language ("Amazing feature!") |
| Calm and reassuring | Alarming or urgent (unless truly critical) |
| Authoritative but not condescending | Obvious statements ("Click to click") |
| Action-oriented | Passive descriptions |
| Specific to context | Generic help text |

### Voice Examples
```
✅ "Assigned managers can reassign cases to other users in their organization"
✅ "Budget limits are enforced at the service level. Entries exceeding the limit require manager approval."
✅ "This field is required for insurance cases to ensure proper claim routing."
```

### Never Write
```
❌ "It's super easy to..." / "Simply click..."
❌ "Don't forget to..." (implies they would)
❌ "Please note that..." (wordy filler)
❌ "As you may know..." (condescending)
❌ "Oops!" / "Uh oh!" (unprofessional)
```

---

## 4. WHEN TO SHOW GUIDANCE

### Show Tooltips When
- Labels use abbreviations (SIU, LOB, DOB)
- Icons are used without visible text
- A field has non-obvious constraints
- Terminology is domain-specific

### Show Help Icons When
- The "why" behind a field isn't obvious
- Users frequently ask about this feature
- There's a related workflow users should know
- The field affects downstream behavior

### Show Inline Help When
- Input format is specific (phone, SSN, date)
- Field is irreversible after save
- Common errors occur at this field
- Legal/compliance requirements apply

### Show Warnings When
- Action affects billing or reporting
- Data cannot be recovered
- Action impacts other users
- Compliance implications exist

---

## 5. WHEN NOT TO SHOW GUIDANCE

### Avoid Clutter By NOT Showing Help When
- The label is self-explanatory ("First Name", "Email")
- Standard form patterns apply (required indicators)
- The same guidance appears elsewhere on page
- Users have already completed this action successfully
- The field is read-only or disabled

### Anti-Patterns to Avoid
- ❌ Tooltip on every single field
- ❌ Help icons on obvious buttons ("Save", "Cancel")
- ❌ Repeating what the label already says
- ❌ Stacking multiple guidance types on one element
- ❌ Tooltips longer than 80 characters

---

## 6. FIRST-TIME VS REPEAT USERS

### First-Time User Guidance
- Show tooltips on initial page load via `delayDuration={0}` for critical fields (use sparingly)
- Use `HelpfulEmptyState` components to explain what should appear
- Link to relevant Help Center articles via `ContextualHelp`
- Consider one-time onboarding overlays for complex workflows

### Repeat User Experience
- All tooltips use standard 300ms delay (avoids accidental triggers)
- Help icons remain available but unobtrusive
- No automatic help display
- Power users can access Help Center via header button

### Implementation Pattern
```tsx
// Standard (repeat users)
<DelayedTooltip content="Budget cap for this service" />

// First-time emphasis (use rarely)
<DelayedTooltip 
  content="Set this before adding time entries" 
  delayDuration={0} 
/>
```

---

## 7. ACCESSIBILITY REQUIREMENTS

All guidance must:

- ✅ Be keyboard accessible (Tab → Enter/Space)
- ✅ Include `aria-label` on icon-only triggers
- ✅ Use `role="tooltip"` for hover content
- ✅ Never convey information only via color
- ✅ Work with screen readers via semantic HTML
- ✅ Have sufficient color contrast (4.5:1 minimum)

---

## 8. COMPONENT DECISION TREE

```
Is the user's cursor over an element?
├── Yes: Is it a label/icon needing clarification?
│   ├── Yes → Use DelayedTooltip (max 80 chars)
│   └── No → Use HelpTooltip (max 150 chars)
└── No: Is guidance always needed?
    ├── Yes: Is it about constraints/format?
    │   ├── Yes → Use inline help text (max 250 chars)
    │   └── No: Is it a warning about consequences?
    │       ├── Yes → Use Alert component
    │       └── No → Use ContextualHelp link
    └── No → Don't add guidance
```

---

## 9. QUICK REFERENCE

| Element Type | Guidance Pattern |
|--------------|------------------|
| Icon-only button | Tooltip (required) |
| Form field label | Help icon if non-obvious |
| Complex input (SSN, phone) | Inline help text |
| Destructive button | Confirmation dialog |
| Section header | ContextualHelp icon |
| Empty state | HelpfulEmptyState with Help Center link |
| Status badge | Tooltip with status definition |
| Financial field | Inline help + warning if limits apply |
| Date field with constraints | Inline help explaining range |
| Abbreviation | Tooltip with expansion |

---

## 10. COMPONENT IMPORTS

```tsx
// Tooltips
import { DelayedTooltip, HelpTooltip } from "@/components/ui/tooltip";

// Contextual help (deep explanations)
import { ContextualHelp } from "@/components/help/ContextualHelp";

// Alerts and warnings
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Error states
import { ErrorMessage } from "@/components/ui/error-message";
import { InlineError } from "@/components/ui/inline-error";

// Empty states with guidance
import { HelpfulEmptyState } from "@/components/help/HelpfulEmptyState";
```

---

## 11. REVIEW CHECKLIST

Before shipping any form or feature, verify:

- [ ] Every icon-only button has a tooltip
- [ ] Abbreviations are expanded on hover
- [ ] Complex fields have inline help
- [ ] Destructive actions have confirmation dialogs
- [ ] No tooltip exceeds 80 characters
- [ ] No inline help exceeds 250 characters
- [ ] Guidance matches current system behavior
- [ ] All help is keyboard accessible

---

*Last Updated: 2026-01-18*

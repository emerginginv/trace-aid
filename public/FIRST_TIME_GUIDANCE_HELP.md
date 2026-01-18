# First-Time Guidance Content Reference

This document contains all first-time guidance content for each screen. Guidance appears once per screen, is dismissible, and never shown again after dismissal.

## Implementation

- **Hook**: `useFirstTimeGuidance(guidanceKey)` - Manages localStorage persistence
- **Component**: `FirstTimeGuidance` - Renders the dismissible callout
- **Storage**: `localStorage` with key format `cw-guidance-dismissed-{guidanceKey}`

---

## Screen-by-Screen Guidance

### Dashboard (`/dashboard`)
**Key:** `dashboard-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | Welcome to your command center. This dashboard shows your most important items at a glance. |
| **What to do first** | Check the Activities panel for upcoming tasks. Click any item to jump directly to that case. |
| **What not to worry about** | Financial summaries will populate as you add data. They're empty until you start working. |

---

### Cases List (`/cases`)
**Key:** `cases-list-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | This is your case directory. Every investigation starts and lives here. |
| **What to do first** | Click "New Case" to create your first case, or use search to find existing work. |
| **What not to worry about** | Column customization and bulk actions become useful as your case volume grows. |

---

### Case Detail (`/cases/:id`)
**Key:** `case-detail-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | You're inside a case. The tabs above organize everything - subjects, updates, finances, and more. |
| **What to do first** | Add a subject or create your first update to start documenting. |
| **What not to worry about** | Budget warnings and invoicing matter later. Focus on the investigation first. |

---

### Subjects List (`/subjects`)
**Key:** `subjects-list-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | This is your cross-case subject directory. See everyone you're tracking across all investigations. |
| **What to do first** | Use the category cards to filter by type. Click any row to view the full profile. |
| **What not to worry about** | Subjects are created from within cases, not here. This page is for finding existing subjects. |

---

### Activities List (`/activities`)
**Key:** `activities-list-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | All your tasks and scheduled events, across every case, in one place. |
| **What to do first** | Check the Due Soon card to prioritize urgent work. Click any activity to jump to its case. |
| **What not to worry about** | Calendar sync and bulk status changes are power features for later. |

---

### Case Wizard (`/cases/new`)
**Key:** `case-wizard-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | Let's create a case step by step. You can add or change details later. |
| **What to do first** | Start with a descriptive title and select your client. Everything else is optional. |
| **What not to worry about** | Subjects, activities, and attachments can be added after the case is created. |

---

### Updates Page (`/updates`)
**Key:** `updates-list-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | Case updates are the narrative of your investigations. This shows every update across all cases. |
| **What to do first** | Filter by case or update type to find what you need. Each update links to its source case. |
| **What not to worry about** | Activity timelines and media attachments are advanced features. Plain text updates work great. |

---

### Time Entries (`/time-entries`)
**Key:** `time-entries-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | Track billable hours here. Every entry links to a case for accurate invoicing. |
| **What to do first** | Log time as you work, not at the end of the week. Fresh entries are more accurate. |
| **What not to worry about** | Approval workflows are for teams. Individual users can log and track immediately. |

---

### Expenses (`/expenses`)
**Key:** `expenses-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | All reimbursable expenses across your cases. Track mileage, meals, equipment, and more. |
| **What to do first** | Add expenses as you incur them. Include descriptions that make sense to a client or auditor. |
| **What not to worry about** | Categories and receipt attachments help organization but aren't required to start. |

---

### Accounts (`/accounts`)
**Key:** `accounts-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | Client accounts represent the organizations you work for. Each case links to an account. |
| **What to do first** | Create an account for your primary client. Add contacts and billing details as you go. |
| **What not to worry about** | Retainers and billing preferences are configured later. Start with basic company info. |

---

### Invoices (`/invoices`)
**Key:** `invoices-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | All invoices across your organization. Track what's been billed and what's outstanding. |
| **What to do first** | Invoices are generated from case finances. Log time and expenses first, then create invoices. |
| **What not to worry about** | Payment tracking and aging reports become relevant once you have invoices to manage. |

---

### Analytics (`/analytics`)
**Key:** `analytics-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | Insights into your operations. Charts and metrics that help you understand performance. |
| **What to do first** | Explore the dashboard tabs. Data populates automatically as you work. |
| **What not to worry about** | Empty charts are normal for new accounts. They fill in as you log cases and time. |

---

### Settings (`/settings`)
**Key:** `settings-welcome`

| Element | Content |
|---------|---------|
| **Welcome** | Configure your organization settings, users, and preferences. |
| **What to do first** | Start with your organization profile and branding. User management is straightforward. |
| **What not to worry about** | Integrations and advanced permissions can wait. Focus on the essentials first. |

---

## Tone Guidelines

| Principle | Implementation |
|-----------|----------------|
| **Calm** | Use "you can" not "you must". Avoid exclamation marks. |
| **Confidence-building** | Reassure that empty states are normal, features can be learned gradually. |
| **Action-oriented** | Give one clear first step, not a list of options. |
| **Not overwhelming** | Maximum 2 sentences per section. |
| **Professional** | No emoji in text. Icons only for visual structure. |

---

## Accessibility

- Dismissible via keyboard (Tab to X button, Enter to dismiss)
- ARIA role="region" with aria-label
- Focus management returns to page content after dismiss
- Color contrast meets WCAG AA standards

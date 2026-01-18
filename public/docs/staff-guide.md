# Staff Guide: Understanding Visibility & Posting Content

This guide helps you understand why you can or can't see certain content, and how to post updates and files so the right people can see them.

---

## Table of Contents

1. [Why Can't I See This?](#why-cant-i-see-this)
2. [Posting Updates and Files](#posting-updates-and-files)
3. [Quick Reference](#quick-reference)

---

## Why Can't I See This?

Content visibility in the system depends on three factors. If any one is missing, you won't see the content.

### The Three Visibility Factors

```
┌─────────────────────────────────────────────────────────────┐
│                    CAN YOU SEE IT?                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CASE ACCESS          2. ACCESS GROUP      3. PERMISSION │
│  Am I assigned to        Is the content       Does my role  │
│  this case?              tagged for my        include this  │
│                          visibility level?    feature?      │
│                                                             │
│       ✓                        ✓                   ✓        │
│       │                        │                   │        │
│       └────────────────────────┼───────────────────┘        │
│                                │                            │
│                           YOU SEE IT                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

If ANY of these is missing, you won't see the content.

---

### Common "I Can't See This" Scenarios

#### Scenario 1: "The update exists but I can't see it"

**What's happening:** The update was posted to an Access Group that doesn't include your role.

| If the update is... | You need to be... |
|---------------------|-------------------|
| Admin Only | Super Admin or Admin |
| Internal | Any employee |
| Client Only | Employee or Client |
| Vendor Only | Employee or Vendor |
| Validation Required | Admin (or wait for approval) |

**What to do:**
- If you need to see it for your work, ask your Case Manager or Admin
- They can either share the information with you or re-tag the update

---

#### Scenario 2: "I can see the case but not the financials"

**What's happening:** Your role doesn't include permission to view financial data.

**What you'll experience:**
- Case details tab: Visible ✓
- Updates tab: Visible ✓
- Financials tab: Not visible or shows "Access Restricted"

**What to do:**
- Financial data is often restricted for confidentiality
- If you need access for your work, discuss with your manager
- They may request a role change or provide the specific data you need

---

#### Scenario 3: "I can't edit this update"

**What's happening:** One of two things:

| Cause | Explanation |
|-------|-------------|
| **Not your update** | You can only edit updates you created |
| **Author outranks you** | The person who created it has a higher role rank than you |

**How rank works:**

```
Super Admin (100) ─┐
Admin (90) ────────┼── Can edit anything below them
Case Manager (70) ─┘
                    
Senior Investigator (50) ── Can edit Investigator content
Investigator (40) ───────── Can only edit own content
```

**What to do:**
- Add a new update with your corrections/additions
- Ask the original author to make the edit
- Ask a Case Manager or Admin to edit it

---

#### Scenario 4: "The file I uploaded disappeared"

**What's happening:** You uploaded a file with an Access Group that's more restrictive than your role can see.

**Example:**
- You're an Investigator (can see Internal, Client Only, Vendor Only, Public)
- You accidentally selected "Admin Only" when uploading
- The file is saved, but now you can't see it

**What to do:**
- The file exists—it's not lost
- Ask an Admin to either:
  - Change the file's Access Group, or
  - Re-share the file with you

---

#### Scenario 5: "I see fewer updates than my colleague"

**What's happening:** Your colleague has a different role that includes additional Access Groups.

**Common examples:**
- Case Manager sees Admin Only content; Investigators don't
- Senior Investigators see content from higher-rank users

**What to do:**
- This is by design—not everyone needs to see everything
- Focus on content relevant to your responsibilities
- If you believe you're missing critical information, discuss with your manager

---

#### Scenario 6: "I'm assigned to the case but can't see it at all"

**What's happening:** Usually one of these:

| Check This | How to Verify |
|------------|---------------|
| Assignment is confirmed | Look for the case in your "My Cases" list |
| Your account is active | Can you log in and see other cases? |
| Case status | The case might be closed or archived |

**What to do:**
1. Refresh your browser
2. Log out and log back in
3. Check "My Cases" vs "All Cases" views
4. Contact your Admin if the issue persists

---

### Understanding Access Groups (Plain Language)

Think of Access Groups as **labels** that control who can see content:

| Access Group | Plain Meaning | Who's In |
|--------------|---------------|----------|
| **Admin Only** | "Leadership eyes only" | Only top administrators |
| **Internal** | "Our team" | All employees at your company |
| **Client Only** | "OK for the client to see" | Your team + the client on this case |
| **Vendor Only** | "OK for assigned vendors" | Your team + vendors working this case |
| **Public** | "Anyone on the case" | Everyone assigned: employees, clients, vendors |
| **Validation Required** | "Needs approval first" | Pending review by an admin |

**The default is "Internal"** — if you don't change it, only employees see your content.

---

## Posting Updates and Files

### Choosing the Right Access Group

When you create an update or upload a file, you'll see an Access Group selector. Here's how to choose:

#### Decision Guide

Ask yourself these questions in order:

```
1. Is this sensitive leadership-only information?
   (HR issues, legal strategy, internal conflicts)
   └── Yes → Admin Only

2. Should the CLIENT see this?
   └── Yes → Continue to question 3
   └── No  → Continue to question 4

3. Is it final/approved for client viewing?
   └── Yes → Public (if vendors should also see) or Client Only
   └── No  → Validation Required (gets reviewed first)

4. Should VENDORS assigned to this case see this?
   └── Yes → Vendor Only
   └── No  → Internal
```

---

### What Each Access Group Means for Visibility

| You Select... | Who Sees It |
|---------------|-------------|
| **Admin Only** | Super Admins and Admins only. Not even you (unless you're an Admin). |
| **Internal** | All employees. Clients and vendors cannot see it. |
| **Client Only** | Employees + the client contacts on this case. Vendors cannot see it. |
| **Vendor Only** | Employees + vendor contacts on this case. Clients cannot see it. |
| **Public** | Everyone assigned to the case: employees, clients, and vendors. |
| **Validation Required** | Held for Admin review. Once approved, moves to the target visibility. |

---

### Visual Guide to Access Groups

```
┌─────────────────────────────────────────────────────────────┐
│                    WHO CAN SEE WHAT                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ADMIN ONLY      ████                     (Admins only)     │
│                                                             │
│  INTERNAL        ████████████             (All employees)   │
│                                                             │
│  CLIENT ONLY     ████████████████         (Employees +      │
│                                            Clients)         │
│                                                             │
│  VENDOR ONLY     ████████████████         (Employees +      │
│                                            Vendors)         │
│                                                             │
│  PUBLIC          ████████████████████████ (Everyone on      │
│                                            the case)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Default Behavior

**If you don't change the Access Group, it defaults to "Internal."**

This means:
- ✅ All employees can see it
- ❌ Clients cannot see it
- ❌ Vendors cannot see it

**For most day-to-day work, "Internal" is the right choice.**

---

### Common Content Types and Recommended Access Groups

| What You're Posting | Recommended Access Group |
|---------------------|-------------------------|
| Investigation notes | Internal |
| Surveillance observations | Internal |
| Field report | Internal |
| Status update for client | Client Only |
| Final report | Public (or Client Only for draft) |
| Vendor assignment details | Vendor Only |
| Expense receipt | Internal |
| Internal discussion | Internal |
| Something you're not sure about | Internal (safest default) |

---

### Common Mistakes and How to Fix Them

#### Mistake: "I posted to Admin Only and now I can't see my own update"

**Why it happened:** You selected a more restrictive group than your role can access.

**How to fix:**
- Ask an Admin to change the Access Group
- The content is saved—it's not lost

**How to prevent:** Before posting, check that you're a member of the Access Group you're selecting.

---

#### Mistake: "I meant to send this to the client but selected Internal"

**Why it happened:** Internal is the default, and you forgot to change it.

**How to fix:**
- Edit the update (if you have permission)
- Or ask someone with edit rights to change the Access Group to "Client Only" or "Public"

**How to prevent:** Before clicking Submit, double-check the Access Group setting.

---

#### Mistake: "Vendor saw something they shouldn't have"

**Why it happened:** Content was posted as "Public" or "Vendor Only" when it should have been "Internal" or "Client Only."

**How to fix:**
- Contact an Admin immediately
- They can change the Access Group
- Note: The vendor may have already seen it

**How to prevent:** When in doubt, start with "Internal" and widen access later if needed.

---

### Best Practices

#### When to Use Each Access Group

| Use This... | When... |
|-------------|---------|
| **Admin Only** | Discussing sensitive personnel, legal, or strategic matters |
| **Internal** | Normal case work, internal notes, team communication |
| **Client Only** | Updates you want the client to see but not vendors |
| **Vendor Only** | Instructions or information specifically for vendors |
| **Public** | Content everyone on the case should see (reports, summaries) |
| **Validation Required** | You're not sure if it's ready for outside viewing |

#### Golden Rules

1. **When in doubt, choose Internal** — you can always widen access later
2. **Check before you click** — verify the Access Group before submitting
3. **You can't "unsee"** — once someone has seen content, changing the group doesn't erase their memory
4. **Ask if unsure** — your Case Manager can advise on the right visibility

---

## Quick Reference

### Access Group Cheat Sheet

| Icon | Group | Who Sees It |
|------|-------|-------------|
| 🔒 | Admin Only | Admins only |
| 🏢 | Internal | All employees |
| 👤 | Client Only | Employees + Clients |
| 🚚 | Vendor Only | Employees + Vendors |
| 🌐 | Public | Everyone on case |
| ⏳ | Validation Required | Pending approval |

### Troubleshooting Checklist

If you can't see something:

- [ ] Am I assigned to this case?
- [ ] Is my Access Group included for this content?
- [ ] Does my role have permission for this feature?
- [ ] Have I tried refreshing my browser?
- [ ] Have I tried logging out and back in?

If you still have issues after checking these, contact your manager or Admin.

---

## Need Help?

- **For visibility questions:** Ask your Case Manager
- **For permission issues:** Contact your Admin
- **For technical problems:** Reach out to support

Remember: The system is designed to protect sensitive information. If you can't see something, there's usually a good reason. When in doubt, ask!

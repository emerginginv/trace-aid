# Mobile Testing Checklist

This document provides a comprehensive checklist for testing the mobile experience across different device sizes.

## Breakpoint Reference

| Breakpoint | Width | Devices |
|------------|-------|---------|
| `xs` | 375px | iPhone SE, small phones |
| `sm` | 640px | iPhone 14, mobile landscape |
| `md` | 768px | iPad Mini, small tablets |
| `lg` | 1024px | iPad Pro, tablet landscape |
| `xl` | 1280px | Small desktop |
| `2xl` | 1400px | Large desktop |

---

## Case Detail Page - Info Tab

### At 320px (Minimum Viable)
- [ ] All cards stack vertically (single column)
- [ ] No horizontal scroll visible
- [ ] Touch targets are at least 44x44px
- [ ] Phone numbers display without wrapping mid-number
- [ ] Action buttons visible at bottom of cards

### At 375px (iPhone SE)
- [ ] Case details grid shows 2 columns (`xs:grid-cols-2`)
- [ ] Client/Team/Budget cards stack vertically
- [ ] Card action buttons have adequate spacing
- [ ] Budget donut charts stack vertically

### At 640px (Mobile Landscape)
- [ ] Card action buttons move to right side (`sm:` breakpoint)
- [ ] Desktop button sizing takes effect (`h-9`)
- [ ] Budget action buttons display side by side

### At 768px (iPad Mini)
- [ ] Three-column grid still single column (changed from 2-col at md)
- [ ] Case details grid shows 3 columns (`md:grid-cols-3`)
- [ ] Adequate spacing between elements

### At 1024px (iPad Pro)
- [ ] Three-column grid shows 2 columns (`lg:grid-cols-2`)
- [ ] Case details grid shows 4 columns (`lg:grid-cols-4`)
- [ ] Cards have room for content + actions

### At 1280px+ (Desktop)
- [ ] Three-column grid shows 3 columns (`xl:grid-cols-3`)
- [ ] Case details grid shows 6 columns (`xl:grid-cols-6`)
- [ ] Full desktop experience

---

## Card Components

### ClientAccountCard
- [ ] Avatar displays correctly at all sizes
- [ ] Name truncates with ellipsis when too long
- [ ] Email truncates with ellipsis when too long
- [ ] Phone number never wraps mid-number (`whitespace-nowrap`)
- [ ] Mobile: Actions appear at bottom with border separator
- [ ] Desktop: Actions appear on right side

### CaseManagerCard
- [ ] Same checks as ClientAccountCard
- [ ] Primary vs Secondary styling visible
- [ ] Remove button only shows for secondary

### ClientContactCard
- [ ] Same checks as ClientAccountCard

---

## BudgetStatusCard

### At < 375px
- [ ] Donut charts stack vertically
- [ ] Charts reduce to 80px size (from 96px)
- [ ] Action buttons stack vertically

### At 375px+
- [ ] Donut charts display side by side
- [ ] Charts display at 96px size
- [ ] Action buttons display side by side

---

## Touch Target Standards

All interactive elements must meet minimum touch targets:

- [ ] Buttons: minimum 44px height on mobile
- [ ] Links in cards: adequate tap area
- [ ] Dropdown triggers: minimum 44px
- [ ] Close/dismiss buttons: minimum 44px

---

## Common Issues to Watch For

1. **Horizontal Scroll** - Check for any unwanted horizontal scrollbar
2. **Text Overflow** - Long text should truncate, not push layout
3. **Button Collision** - Interactive elements should not overlap
4. **Card Overlap** - Cards in grid should have adequate spacing
5. **Z-Index Issues** - Dropdowns and tooltips should appear above content

---

## Testing Tools

### Browser DevTools
1. Open DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Select device or enter custom width
4. Test touch interactions

### Responsive Testing Widths
- 320px - Minimum viable
- 375px - iPhone SE / xs breakpoint
- 390px - iPhone 14
- 428px - iPhone 14 Pro Max
- 640px - sm breakpoint
- 768px - md breakpoint / iPad Mini
- 1024px - lg breakpoint / iPad Pro
- 1280px - xl breakpoint

---

## Sign-off

| Tester | Date | Device/Width | Pass/Fail | Notes |
|--------|------|--------------|-----------|-------|
|        |      |              |           |       |

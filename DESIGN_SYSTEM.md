# Design System Style Guide - PI Case Manager

## Overview

This is a comprehensive, production-ready design system built for enterprise-grade applications. It combines modern aesthetics with WCAG AA accessibility, performance, and scalability.

**Key Enhancements:**
- 1.25 ratio typographic scale (12px → 46px)
- WCAG AA compliant color system with full 50-950 scales
- 4px base unit spacing system
- Standardized component heights (32px, 40px, 48px)
- Consistent border radius scale (2px → 24px)

---

## 1. Typography System

### Type Scale (1.25 Major Third Ratio)

The type scale follows a 1.25 ratio for harmonious visual relationships:

| Token | Size | Pixel | Usage |
|-------|------|-------|-------|
| `2xs` | 0.75rem | 12px | Micro labels, legal text |
| `xs` | 0.8125rem | 13px | Captions, helper text |
| `sm` | 0.9375rem | 15px | Secondary text, UI labels |
| `base` | 1rem | 16px | Body text (browser default) |
| `lg` | 1.125rem | 18px | H5, emphasized text |
| `xl` | 1.5rem | 24px | H4, section headers |
| `2xl` | 1.875rem | 30px | H3, card titles |
| `3xl` | 2.3125rem | 37px | H2, page sections |
| `4xl` | 2.875rem | 46px | H1, page titles |

### Font Weights

| Weight | Value | Purpose |
|--------|-------|---------|
| Light | 300 | Decorative, large display text |
| Regular | 400 | Body text, default reading |
| Medium | 500 | UI elements, subtle emphasis |
| Semibold | 600 | Subheadings, buttons, labels |
| Bold | 700 | Headings, strong emphasis |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `tight` | 1.2 | Large headings (H1-H2) |
| `snug` | 1.3 | Smaller headings (H3-H5) |
| `ui` | 1.4 | UI elements, buttons, inputs |
| `normal` | 1.5 | Body text, paragraphs |
| `relaxed` | 1.6 | Long-form content, articles |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tighter` | -0.025em | Display/H1 text |
| `tight` | -0.015em | H2-H3 headings |
| `normal` | 0 | Body text |
| `wide` | 0.025em | UI labels, buttons |
| `wider` | 0.05em | Small caps, overlines |
| `widest` | 0.1em | All caps headings |

### Typography Utilities

```tsx
// Display text
<h1 className="text-display">Page Title</h1>

// Heading hierarchy
<h2 className="text-heading-1">Section Title</h2>
<h3 className="text-heading-2">Subsection</h3>
<h4 className="text-heading-3">Card Title</h4>
<h5 className="text-heading-4">Small Section</h5>

// Body text
<p className="text-body-lg">Emphasized paragraph</p>
<p className="text-body">Standard paragraph</p>
<p className="text-body-sm">Small text</p>

// Special text
<span className="text-caption">Helper text</span>
<span className="text-overline">Category Label</span>
<label className="text-label">Form Label</label>
```

---

## 2. Color System (WCAG AA Compliant)

All primary colors achieve 4.5:1+ contrast ratio on their intended backgrounds.

### Neutral Scale (Cool Gray)
```
neutral-50:  hsl(210 25% 98%)   // Near white - backgrounds
neutral-100: hsl(210 22% 96%)   // Light gray - alt backgrounds
neutral-200: hsl(210 18% 90%)   // Borders, dividers
neutral-300: hsl(210 16% 82%)   // Disabled states
neutral-400: hsl(210 14% 66%)   // Placeholder text
neutral-500: hsl(210 12% 50%)   // Secondary text
neutral-600: hsl(210 14% 40%)   // Body text (dark mode)
neutral-700: hsl(210 18% 28%)   // Primary text
neutral-800: hsl(210 22% 18%)   // Headings
neutral-900: hsl(210 28% 10%)   // High contrast text
neutral-950: hsl(210 35% 6%)    // Near black
```

### Primary Blue Scale
```
primary-50:  hsl(210 100% 97%)  // Tinted backgrounds
primary-100: hsl(210 96% 93%)   // Hover backgrounds
primary-200: hsl(210 92% 85%)   // Light accents
primary-300: hsl(210 88% 72%)   // Decorative elements
primary-400: hsl(210 85% 58%)   // Icons, illustrations
primary-500: hsl(210 90% 48%)   // Primary actions (4.6:1 on white)
primary-600: hsl(210 92% 40%)   // Primary hover (6.5:1 on white)
primary-700: hsl(210 95% 32%)   // Active states
primary-800: hsl(210 97% 24%)   // Dark accents
primary-900: hsl(210 100% 16%)  // Deep backgrounds
primary-950: hsl(210 100% 10%)  // Near black blue
```

### Secondary Teal Scale
```
secondary-50 through secondary-950
```

### Semantic Colors

| Color | Default | Contrast | Usage |
|-------|---------|----------|-------|
| Success | `success-500` | 4.5:1+ | Positive actions, confirmations |
| Warning | `warning-500` | Uses dark foreground | Caution states, pending actions |
| Destructive | `destructive-500` | 4.5:1+ | Errors, delete actions |
| Info | `info-500` | 4.5:1+ | Informational, neutral alerts |

### Color Usage Guidelines

```tsx
// Primary actions
<Button>Save Changes</Button>
<Button variant="outline">Cancel</Button>

// Semantic feedback
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="muted">Draft</Badge>

// Status text
<p className="text-success-600">✓ Saved successfully</p>
<p className="text-destructive-600">✗ Error occurred</p>
```

---

## 3. Spacing System (4px Base Unit)

| Token | Value | Pixel | Usage |
|-------|-------|-------|-------|
| `0.5` | 0.125rem | 2px | Micro adjustments |
| `1` | 0.25rem | 4px | Tight spacing |
| `1.5` | 0.375rem | 6px | Small gaps |
| `2` | 0.5rem | 8px | Component internal |
| `3` | 0.75rem | 12px | Default gap |
| `4` | 1rem | 16px | Standard spacing |
| `5` | 1.25rem | 20px | Medium spacing |
| `6` | 1.5rem | 24px | Section spacing |
| `8` | 2rem | 32px | Component gaps |
| `10` | 2.5rem | 40px | Large spacing |
| `12` | 3rem | 48px | Large sections |
| `16` | 4rem | 64px | Page sections |
| `24` | 6rem | 96px | Major sections |

### Spacing Patterns

```tsx
// Component internal spacing
<div className="p-4 space-y-3">
  <h3 className="mb-2">Title</h3>
  <p>Content</p>
</div>

// Card padding (consistent 24px)
<Card>
  <CardHeader className="pb-4">...</CardHeader>
  <CardContent className="space-y-4">...</CardContent>
</Card>

// Page sections
<section className="py-12 space-y-8">
  ...
</section>
```

### Border Radius Scale

| Token | Value | Pixel | Usage |
|-------|-------|-------|-------|
| `xs` | 0.125rem | 2px | Subtle rounding |
| `sm` | 0.25rem | 4px | Inputs, small buttons |
| `md` | 0.375rem | 6px | Default components |
| `DEFAULT` | 0.5rem | 8px | Cards, modals |
| `lg` | 0.75rem | 12px | Large cards |
| `xl` | 1rem | 16px | Prominent elements |
| `2xl` | 1.5rem | 24px | Feature cards |
| `full` | 9999px | - | Pills, avatars |

---

## 🎭 Advanced Visual Effects

### Glassmorphism
```css
.glass {
  background: hsl(var(--background) / 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border) / 0.2);
}

.glass-heavy {
  backdrop-filter: blur(24px) saturate(180%);
}
```

**Usage**: Modal overlays, navigation bars, floating panels

### Shadow System (8 Levels)
```css
--shadow-xs: Minimal depth
--shadow-sm: Subtle elevation
--shadow: Default cards
--shadow-md: Modals, dialogs
--shadow-lg: Popovers
--shadow-xl: Dropdowns
--shadow-2xl: Premium features
--shadow-inner: Inset effects
```

### Colored Shadows
Brand-specific glow effects:
```css
--shadow-primary: Primary CTA emphasis
--shadow-success: Success confirmations
--shadow-warning: Warning states
--shadow-destructive: Error states
```

### Gradient Overlays
```css
.gradient-overlay-primary {
  /* 10-15% brand color overlay */
  background: linear-gradient(135deg, 
    hsl(var(--primary) / 0.1), 
    hsl(var(--secondary) / 0.15)
  );
}
```

---

## 🧩 Component Standards

### Buttons
**Heights**: 32px (sm), 40px (default), 48px (lg)
**Touch Targets**: 44px minimum (mobile)
**States**:
- Default: Solid brand color
- Hover: 90% opacity + shadow lift
- Active: 95% scale
- Focus: 2px ring, 2px offset
- Disabled: 50% opacity, no pointer events

**Variants**:
- `default`: Primary actions
- `destructive`: Delete, remove actions
- `outline`: Secondary actions
- `ghost`: Tertiary actions
- `link`: Inline text actions
- `success`: Positive confirmations
- `warning`: Caution actions

### Form Inputs
**Heights**: 32px (sm), 40px (default), 48px (lg)
**Touch Targets**: 44px minimum
**States**:
- Default: Subtle border
- Hover: Primary/50% border
- Focus: Ring + primary border
- Error: Destructive border + ring
- Success: Success border + ring
- Disabled: Muted background

**Accessibility**:
```tsx
<Input
  id="email"
  aria-invalid={hasError}
  aria-describedby="email-error email-help"
/>
```

### Cards
**Variants**:
- `card-elevated`: Default with shadow
- `card-flat`: No shadow, border only
- `card-ghost`: Transparent, hover state
- `card-interactive`: Clickable with hover lift
- `card-premium`: Gradient border accent

### Icons
**Sizes**: 16px, 20px, 24px, 32px
**Optical Alignment**: Centered in touch targets
**Semantic Usage**: 
- Decorative: `aria-hidden="true"`
- Functional: Include accessible label

---

## ♿ Accessibility Features

### Keyboard Navigation
- **Tab Order**: Logical document flow
- **Focus Indicators**: 2px ring, visible at all times
- **Skip Links**: Jump to main content
- **Keyboard Shortcuts**: `?` for help overlay

### Screen Readers
```tsx
// Hidden but accessible
<span className="sr-only">Loading...</span>

// ARIA labels
<Button aria-label="Delete user account">
  <Trash2 aria-hidden="true" />
</Button>

// Live regions
<div role="status" aria-live="polite">
  Changes saved
</div>
```

### Touch Targets
Minimum 44x44px for all interactive elements:
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 🎬 Micro-Interactions

### Transition Speeds
```css
--transition-fast: 150ms   /* Instant feedback */
--transition-base: 200ms   /* Default */
--transition-slow: 300ms   /* Complex changes */
```

### Animations
**Hover States**: 0.2s ease transitions
**Button Press**: Active scale 95%
**Card Lift**: Translate Y -4px + shadow
**Loading**: Skeleton pulse, spinner rotation
**Success**: Bounce scale (1.1x overshoot)
**Page Transitions**: Slide + fade combinations

---

## 📊 Data Visualization

### Number Formatting
```css
.currency {
  font-variant-numeric: tabular-nums;
  /* Always: $1,234.56 */
}

.percentage {
  font-variant-numeric: tabular-nums;
  /* Always: 87.5% */
}

.monospace {
  font-family: monospace;
  /* Technical data, IDs */
}
```

### Chart Colors
Use semantic colors consistently:
- Revenue: Success green
- Expenses: Destructive red
- Pending: Warning yellow
- Completed: Primary blue

---

## 🏢 Enterprise Features

### Print Stylesheets
```css
@media print {
  .print-hidden { display: none; }
  .print-page-break { page-break-after: always; }
  * { box-shadow: none !important; }
}
```

### Notifications
Priority-based system:
- **High**: Red indicator, top of list
- **Medium**: Orange indicator, sorted by time
- **Low**: No indicator, bottom of list

### Keyboard Shortcuts
Global shortcuts overlay (`?` key):
- ⌘K: Search
- ⌘N: New item
- ⌘S: Save
- ⌘P: Print
- Esc: Close dialog

---

## 🚀 Performance Optimization

### Loading States
1. **Skeleton Screens**: Show structure before data
2. **Progressive Loading**: Render visible content first
3. **Lazy Loading**: Images and off-screen content

### Critical Rendering Path
1. Inline critical CSS
2. Defer non-critical scripts
3. Preload fonts and key assets
4. Optimize images (WebP, srcset)

---

## 📱 Responsive Design

### Breakpoints
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1400px /* Extra large */
```

### Mobile Optimizations
- Stack columns at <768px
- Increase touch targets to 44px
- Simplify navigation (hamburger)
- Optimize images for device
- Test one-handed usage patterns
- **Use `ResponsiveButton` for icon-only mobile buttons** (see below)

### Mobile-Responsive Buttons (Global Standard)

**Standard**: All buttons with text labels MUST use icon-only display on mobile.

**Component**: Use `ResponsiveButton` for automatic responsive behavior:

```tsx
import { ResponsiveButton } from "@/components/ui/responsive-button";
import { Download } from "lucide-react";

// Basic usage - shows icon-only on mobile, full text on sm+
<ResponsiveButton
  icon={<Download className="h-4 w-4" />}
  label="Export"
  variant="outline"
/>

// Custom breakpoint - show text starting at md (768px+)
<ResponsiveButton
  icon={<Download className="h-4 w-4" />}
  label="Export"
  showLabelBreakpoint="md"
  variant="outline"
/>
```

**Guidelines**:
- Mobile (< 640px): Icon only + tooltip on hover/focus
- Desktop (≥ 640px): Icon + text label
- Maintain minimum 44px touch target on mobile
- Always include descriptive tooltip for accessibility

---

## 💡 Inline Help & Tooltip Standards

See **[TOOLTIP_INLINE_HELP_STANDARDS.md](./TOOLTIP_INLINE_HELP_STANDARDS.md)** for the complete ruleset on contextual guidance.

### Quick Reference

| Type | Max Length | When to Use |
|------|------------|-------------|
| Tooltip | 80 chars | Label clarification, abbreviations |
| Help Icon | 150 chars | Field-level "why" explanations |
| Inline Help | 250 chars | Format constraints, irreversible fields |
| Warning | 50 words | Consequences, compliance implications |

### Key Principles
- **Professional tone**: No marketing copy, no condescension
- **Context-aware**: Specific to the field, not generic
- **Action-oriented**: Tell users what to do, not just what exists
- **Clutter-free**: Only show help when truly needed

---

## 🎯 Implementation Guidelines

### Component Creation
1. **Plan**: Define purpose, variants, states
2. **Design**: Apply design system tokens
3. **Build**: Semantic HTML, accessibility
4. **Test**: Keyboard, screen reader, mobile
5. **Document**: Props, examples, edge cases

### Code Quality
```tsx
// ✅ Good: Semantic, accessible, typed
export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ variant = 'default', ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant }))} {...props} />
);

// ❌ Bad: Inline styles, no types
export const Button = ({ color, ...props }) => (
  <button style={{ background: color }} {...props} />
);
```

---

## 📚 Resources

### Component Library
- `/style-guide` - Complete component showcase
- `/premium-showcase` - Advanced features demo

### Tools
- Tailwind CSS - Utility-first styling
- Radix UI - Accessible primitives
- CVA - Class variance authority
- Lucide React - Icon system

### References
- WCAG 2.1 Guidelines
- Material Design 3 (inspiration)
- Apple HIG (inspiration)

---

## 🔄 Version History

### v1.0.0 (Current)
- Complete design system implementation
- 8-level shadow system
- Glassmorphism effects
- Premium micro-interactions
- Enterprise-grade features
- Comprehensive documentation

---

## 🤝 Contributing

When adding new components:
1. Follow existing patterns
2. Use design tokens (no hardcoded values)
3. Include accessibility features
4. Add to Style Guide
5. Document props and usage
6. Test across browsers and devices

---

## 📞 Support

For questions or feedback:
- Review `/style-guide` for examples
- Check `/premium-showcase` for advanced patterns
- Refer to component source code
- Follow accessibility guidelines

---

**Built with ❤️ for exceptional user experiences**

# Provider Architecture

## Overview

This document describes the provider architecture for the application. All UI providers are centralized in `src/components/providers/Providers.tsx` to ensure consistent context availability and prevent runtime crashes.

## Core Principles

1. **Single Provider Tree**: All providers are mounted ONCE at the application root
2. **Never Conditional**: Providers are NEVER conditionally rendered
3. **No Local Wrapping**: Components should NOT wrap in providers locally
4. **Order Matters**: Outer providers can be consumed by inner ones

## Provider Hierarchy

```
TenantProvider
└── QueryClientProvider
    └── GlobalLoadingProvider
        └── ThemeProvider
            └── TooltipProvider (Radix)
                └── OrganizationProvider
                    └── BrowserRouter
                        └── NavigationProvider
                            └── ImpersonationProvider
                                └── BreadcrumbProvider
                                    └── FaviconProvider
                                        └── ProviderVerification
                                            └── {children}
```

## Provider Responsibilities

| Provider | Purpose | Required By |
|----------|---------|-------------|
| TenantProvider | Multi-tenant configuration | All authenticated components |
| QueryClientProvider | React Query state | All data-fetching components |
| GlobalLoadingProvider | Global loading state | Loading indicators |
| ThemeProvider | Dark/light mode | All themed components |
| TooltipProvider | Radix tooltip context | All Tooltip components |
| OrganizationProvider | Organization context | Organization-scoped components |
| BrowserRouter | React Router | All routed components |
| NavigationProvider | Navigation state | Sidebar, breadcrumbs |
| ImpersonationProvider | Admin impersonation | Support features |
| BreadcrumbProvider | Breadcrumb state | Page headers |
| FaviconProvider | Dynamic favicon | Browser tab icon |

## Radix UI Specifics

### TooltipProvider

**CRITICAL**: TooltipProvider is required for ALL Tooltip components to function.

```tsx
// ✅ CORRECT - Use Tooltip directly, provider is at root
<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>Content</TooltipContent>
</Tooltip>

// ❌ WRONG - Do NOT wrap in local TooltipProvider
<TooltipProvider>
  <Tooltip>...</Tooltip>
</TooltipProvider>
```

### Dialog, AlertDialog, Popover

These components use per-instance Root components, not global providers:

```tsx
// ✅ CORRECT - Each Dialog manages its own context
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>
```

### Toaster/Sonner

These components contain their own providers internally. Mount them inside the provider tree but they don't need external providers.

## Adding a New Provider

1. Add the provider to `src/components/providers/Providers.tsx`
2. Determine correct position in hierarchy (does it depend on other providers?)
3. Add to `REQUIRED_ROOT_PROVIDERS` array
4. Update this documentation

## Defensive Components

### SafeTooltip

Use for critical UI elements that must not crash even if providers fail:

```tsx
import { SafeTooltip } from "@/components/ui/safe-tooltip";

// For navigation elements
<SafeTooltip content="Settings" side="right">
  <SettingsIcon />
</SafeTooltip>
```

### RadixErrorBoundary

Use to wrap sections that use multiple Radix components:

```tsx
import { RadixErrorBoundary } from "@/components/providers";

<RadixErrorBoundary componentName="Sidebar">
  <SidebarContent />
</RadixErrorBoundary>
```

## Debugging Provider Issues

### Symptoms of Missing Providers

- Blank screen on navigation
- Console error: "must be used within Provider"
- Console error: "useContext returned undefined"

### Verification

1. Check `src/components/providers/Providers.tsx` for provider presence
2. Ensure component is rendered INSIDE the provider tree
3. Check for conditional rendering that might unmount providers
4. Verify no duplicate providers are mounted

### Development Tools

```tsx
import { useProviderGuard } from "@/hooks/useProviderGuard";
import { verifyProviderContext } from "@/components/providers";

// In your component
const context = useSomeContext();
useProviderGuard('SomeProvider', context, 'MyComponent');
```

## Common Mistakes

### ❌ Wrapping in local providers

```tsx
// WRONG
const MyComponent = () => (
  <TooltipProvider>
    <Tooltip>...</Tooltip>
  </TooltipProvider>
);
```

### ❌ Conditional provider rendering

```tsx
// WRONG
{isReady && (
  <ThemeProvider>
    <App />
  </ThemeProvider>
)}
```

### ❌ Multiple provider instances

```tsx
// WRONG - in main.tsx
<TooltipProvider>
  <App /> {/* App also has TooltipProvider */}
</TooltipProvider>
```

## Files Reference

- `src/components/providers/Providers.tsx` - Main provider tree
- `src/components/providers/ProviderVerification.tsx` - Dev verification
- `src/components/providers/RadixErrorBoundary.tsx` - Error boundary
- `src/components/ui/safe-tooltip.tsx` - Defensive tooltip
- `src/hooks/useProviderGuard.ts` - Provider guard hook

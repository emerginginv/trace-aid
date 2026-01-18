# Deployment Guide

This project is configured for deterministic builds using **pnpm** and **Node 20**.

## Vercel Project Settings

Navigate to your Vercel project → **Settings** → **General** → **Build & Development Settings**:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Build Command** | `pnpm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `pnpm install --frozen-lockfile` |

### Node.js Version

Navigate to **Settings** → **General** → **Node.js Version**:

| Setting | Value |
|---------|-------|
| **Node.js Version** | `20.x` (NOT Automatic) |

> **Note:** The `.nvmrc` file pins Node to `20.11.1` which Vercel will respect automatically.

---

## Configuration Files

This repo includes the following build configuration:

| File | Purpose |
|------|---------|
| `vercel.json` | Explicit install/build commands using pnpm (no corepack) |
| `.nvmrc` | Pins Node version to 20.11.1 |
| `.npmrc` | Network retry settings for stable installs |
| `package.json` | Contains `"packageManager": "pnpm@9.0.0"` |

### vercel.json

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm run build"
}
```

---

## Redeploy Instructions

After making configuration changes, perform a clean redeploy:

1. Go to your Vercel project dashboard
2. Click **Deployments** tab
3. Find the latest deployment (or any deployment)
4. Click the **three-dot menu** (⋮) → **Redeploy**
5. **Important:** Check the box for **"Clear build cache and redeploy"**
6. Click **Redeploy**

This ensures:
- Fresh `node_modules` installation
- New lockfile resolution
- No stale bun/npm artifacts

---

## Troubleshooting

### Build fails with "frozen lockfile" error

This means `pnpm-lock.yaml` doesn't exist or is out of sync:

1. Run locally: `pnpm install` to generate/update lockfile
2. Commit `pnpm-lock.yaml`
3. Redeploy with cache cleared

### Build still uses bun

Ensure these files are deleted from the repo:
- `bun.lock`
- `bun.lockb`
- `bunfig.toml`

### pnpm install errors

Verify Vercel Install Command is exactly:
```
pnpm install --frozen-lockfile
```

---

## Why pnpm?

- **Deterministic:** `--frozen-lockfile` ensures exact versions
- **Fast:** Content-addressable storage with excellent caching
- **Reliable:** No timeout issues like bun in CI environments

---

## CI Guardrails

> **⚠️ IMPORTANT: CI builds must use pnpm only. Do not use bun or corepack in Vercel installs.**

### Prohibited in CI

This project has experienced repeated CI failures. To prevent regression:

- **bun** - Causes timeout errors in Vercel
- **corepack** - Unreliable initialization in CI environments

### Required Install Command

```
pnpm install --frozen-lockfile
```

### If Build Errors Appear

1. Check Vercel Install Command matches above exactly
2. Confirm no bun lockfile exists in repo
3. Clear build cache and redeploy

### PR Checklist

Before merging any PR, verify:
- [ ] No `bun.lock` or `bun.lockb` in the repo
- [ ] `pnpm-lock.yaml` is committed and up-to-date
- [ ] `vercel.json` uses explicit pnpm install (no corepack)

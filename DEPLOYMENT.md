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
| **Node.js Version** | `20.x` |

> **Note:** The `.nvmrc` file pins Node to `20.11.1` which Vercel will respect automatically.

---

## Configuration Files

This repo includes the following build configuration:

| File | Purpose |
|------|---------|
| `vercel.json` | Explicit install/build commands using pnpm + corepack |
| `.nvmrc` | Pins Node version to 20.11.1 |
| `.npmrc` | Network retry settings for stable installs |
| `package.json` | Should include `"packageManager": "pnpm@9.0.0"` |

### vercel.json

```json
{
  "installCommand": "corepack enable && pnpm install --frozen-lockfile",
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

### Corepack not found

Verify Node version is 20.x (corepack is built-in for Node 18+).

---

## Why pnpm?

- **Deterministic:** `--frozen-lockfile` ensures exact versions
- **Fast:** Content-addressable storage with excellent caching
- **Reliable:** No timeout issues like bun in CI environments
- **Native support:** Corepack ships with Node 18+

---

## CI Guardrails

> **⚠️ IMPORTANT: CI builds must use pnpm only. Do not use bun in Vercel installs.**

### Bun is Prohibited

This project has experienced repeated CI failures due to `bun install timeout` errors. To prevent regression:

1. **Never commit bun lockfiles** - Remove immediately if found:
   - `bun.lock`
   - `bun.lockb`
   - `bunfig.toml`

2. **Verify Vercel install command** - Must be:
   ```
   corepack enable && pnpm install --frozen-lockfile
   ```

3. **If "bun install timeout" appears:**
   - Check Vercel project settings → Install Command
   - Confirm no bun lockfile exists in repo
   - Clear build cache and redeploy

### PR Checklist

Before merging any PR, verify:
- [ ] No `bun.lock` or `bun.lockb` in the repo
- [ ] `pnpm-lock.yaml` is committed and up-to-date
- [ ] `vercel.json` uses pnpm install command

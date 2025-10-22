# Dependency Management Strategies for Sacred-AppKit

This document outlines the different dependency management strategies available in this monorepo, when to use each, and how to switch between them.

## Overview

Sacred-AppKit (forked from Reown AppKit) supports three dependency management modes:

| Strategy           | Format        | Use Case                 | Speed      | Stability        |
| ------------------ | ------------- | ------------------------ | ---------- | ---------------- |
| **Workspace**      | `workspace:*` | Local development        | ⚡ Instant | 🔄 Live          |
| **GitHub Tarball** | GitHub URLs   | Rapid deployment/testing | ⚡ Fast    | 📍 Branch/commit |
| **npm Versions**   | `^1.8.21`     | npm publishing           | 🐌 Slow    | 📦 Versioned     |

## Strategy Details

### 1. Workspace Protocol (`workspace:*`)

**What it is**: pnpm's workspace protocol that symlinks local packages

**Format**:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "workspace:*"
  }
}
```

**When to use**:

- ✅ Active local development
- ✅ When testing changes across multiple packages
- ✅ When you want instant updates without rebuilding

**When NOT to use**:

- ❌ Deploying apps (workspace doesn't exist in deployment)
- ❌ External projects consuming your fork
- ❌ CI/CD environments

**Commands**:

```bash
# Restore to workspace mode
pnpm deps:workspace
pnpm install
```

### 2. GitHub Tarball URLs

**What it is**: npm can install directly from GitHub repository tarballs

**Format**:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit"
  }
}
```

**When to use**:

- ✅ Deploying apps that use your fork
- ✅ Testing feature branches in staging
- ✅ External projects consuming your fork
- ✅ Rapid iteration without npm publishing

**When NOT to use**:

- ❌ Local development (workspace is better)
- ❌ When you need npm registry features (like semver ranges)
- ❌ When network access to GitHub is restricted

**Commands**:

```bash
# Convert to GitHub tarballs (main branch)
pnpm deps:github main

# Use a specific tag
pnpm deps:github v1.8.21

# Use a feature branch
pnpm deps:github feature/polkadot-support

# Use a specific commit
pnpm deps:github abc123def456

# Install
pnpm install
```

**Reference Formats**:

- Branch: `main`, `develop`, `feature/my-feature`
- Tag: `v1.8.21`, `v1.9.0-beta.1`
- Commit: `abc123def456` (full or short SHA)

### 3. npm Version Numbers

**What it is**: Traditional npm package versioning

**Format**:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "^1.8.21"
  }
}
```

**When to use**:

- ✅ Publishing packages to npm registry
- ✅ When you need semver compatibility
- ✅ For stable, versioned releases
- ✅ When consuming from npm-only environments

**When NOT to use**:

- ❌ During rapid development (too slow to publish constantly)
- ❌ For testing unreleased features

**Commands**:

```bash
# Convert workspace to versions (for publishing)
node convert-workspace-deps.js

# Publish
pnpm publish:latest

# Restore workspace
node restore-workspace-deps.js
```

## Workflow Examples

### Development Workflow

```bash
# 1. Local development (current state)
# package.json has workspace:* everywhere
pnpm install
pnpm watch  # or pnpm build

# 2. Make changes
# ... edit code in packages/ ...

# 3. Test in apps
cd apps/demo
pnpm dev  # instantly sees your changes

# 4. Commit
git add .
git commit -m "Add feature"
```

### Deployment Workflow (GitHub Tarballs)

```bash
# 1. Push changes
git push origin main

# 2. Convert demo app to GitHub tarballs
pnpm deps:github main

# 3. Deploy
cd apps/demo
pnpm install  # installs from GitHub
pnpm build
# ... deploy to hosting ...

# 4. Back to development
cd ../..
pnpm deps:workspace
pnpm install
```

### Feature Branch Testing

```bash
# 1. Create and push feature branch
git checkout -b feature/new-adapter
# ... make changes ...
git push origin feature/new-adapter

# 2. Point staging to feature branch
pnpm deps:github feature/new-adapter

# 3. Deploy to staging
pnpm install
pnpm build
# ... deploy to staging ...

# 4. Test
# ... test the feature ...

# 5. When done, restore
pnpm deps:workspace
pnpm install
```

### Release Workflow (npm)

```bash
# 1. Version bump
pnpm changeset
pnpm changeset:version

# 2. Convert to version numbers
node convert-workspace-deps.js

# 3. Build and publish
pnpm build:all
pnpm publish:latest

# 4. Restore workspace
node restore-workspace-deps.js
pnpm install

# 5. Commit version changes
git add .
git commit -m "Release v1.9.0"
git push
```

## External Project Usage

If you have external projects that want to use your fork:

### Option 1: GitHub Tarballs (Recommended for forks)

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/v1.8.21#subdirectory=packages/appkit",
    "@laughingwhales/appkit-adapter-wagmi": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/v1.8.21#subdirectory=packages/adapters/wagmi"
  }
}
```

### Option 2: npm install command

```bash
npm install https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit
```

### Option 3: Git URLs (alternative)

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "git+https://github.com/laughingwhales/sacred-appkit.git#main:packages/appkit"
  }
}
```

## Script Reference

| Script                           | Description                 | Usage                   |
| -------------------------------- | --------------------------- | ----------------------- |
| `pnpm deps:github <ref>`         | Convert to GitHub tarballs  | `pnpm deps:github main` |
| `pnpm deps:workspace`            | Restore workspace:\*        | `pnpm deps:workspace`   |
| `node convert-workspace-deps.js` | Convert to versions for npm | For publishing          |
| `node restore-workspace-deps.js` | Restore workspace:\*        | After publishing        |

## Files

- `scripts/convert-to-github-tarball.js` - GitHub tarball converter
- `scripts/restore-to-workspace.js` - Workspace restorer
- `convert-workspace-deps.js` - npm version converter (root)
- `restore-workspace-deps.js` - npm version restorer (root)
- `GITHUB_TARBALL_WORKFLOW.md` - Detailed GitHub tarball docs
- `QUICK_START_GITHUB_TARBALL.md` - Quick reference
- `.github-tarball-example.json` - Example configuration

## Best Practices

1. **Always use workspace for local dev** - It's instant and keeps everything in sync
2. **Use GitHub tarballs for deployment** - No need to publish to npm constantly
3. **Pin to tags for production** - Use specific tags (v1.8.21) for stability
4. **Use branches for testing** - Feature branches for staging environments
5. **Document what's deployed where** - Keep track of which ref is deployed
6. **Automate in CI/CD** - Integrate conversion scripts into your pipeline

## Troubleshooting

### GitHub tarball installs are slow

First install downloads from GitHub. Subsequent installs are cached. Consider:

- Pinning to commit SHAs for better caching
- Using a GitHub API proxy/CDN
- Publishing to npm for production

### Changes not showing up

After pushing to GitHub, you may need to:

1. Wait a few seconds for GitHub to process
2. Clear npm/pnpm cache: `pnpm store prune`
3. Delete node_modules and reinstall

### Private repository access

For private repos, authenticate with GitHub:

1. Create a personal access token
2. Add to `.npmrc`:
   ```
   //api.github.com/:_authToken=YOUR_TOKEN
   ```

Or use SSH format:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "git+ssh://git@github.com/laughingwhales/sacred-appkit.git#main:packages/appkit"
  }
}
```

## Summary

Choose the right strategy for your needs:

- **Local dev?** → Use `workspace:*` ✅
- **Deploy quickly?** → Use GitHub tarballs ✅
- **Publish to npm?** → Use version numbers ✅

The scripts make it easy to switch between modes, giving you flexibility throughout the development lifecycle.


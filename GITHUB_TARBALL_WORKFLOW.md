# GitHub Tarball Workflow for Sacred-AppKit

This guide explains how to use GitHub tarball URLs to install your forked packages without publishing to npm. This is ideal for rapid development and deployment cycles.

## Overview

Instead of publishing to npm every time you make a change, you can install packages directly from GitHub using tarball URLs. This gives you:

- ✅ **Instant updates** - Push to GitHub and deploy immediately
- ✅ **Flexible versioning** - Use branches, tags, or specific commits
- ✅ **Local development** - Keep using `workspace:*` for local work
- ✅ **No npm hassle** - Skip the publish process during development

## GitHub Tarball URL Format

npm can install from GitHub tarballs using these formats:

```bash
# From a branch
https://api.github.com/repos/USER/REPO/tarball/BRANCH#subdirectory=PATH

# From a tag
https://api.github.com/repos/USER/REPO/tarball/v1.8.21#subdirectory=PATH

# From a commit
https://api.github.com/repos/USER/REPO/tarball/abc1234#subdirectory=PATH
```

For this monorepo, the `subdirectory` parameter is essential because each package lives in a different folder.

## Quick Start

### 1. Local Development (Current State)

For local development, keep using `workspace:*`:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "workspace:*",
    "@laughingwhales/appkit-controllers": "workspace:*"
  }
}
```

### 2. Converting for Deployment

When you're ready to deploy an app that uses your forked packages:

```bash
# Convert workspace:* to GitHub tarball URLs for a specific branch
node scripts/convert-to-github-tarball.js main

# Or for a specific tag
node scripts/convert-to-github-tarball.js v1.8.21

# Or for a feature branch
node scripts/convert-to-github-tarball.js feature/new-adapter

# Or for a specific commit
node scripts/convert-to-github-tarball.js abc1234567
```

This will update your apps/examples `package.json` files:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit",
    "@laughingwhales/appkit-controllers": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/controllers"
  }
}
```

### 3. Install from GitHub

```bash
pnpm install
```

npm/pnpm will now download the packages directly from your GitHub repository!

### 4. Restoring for Local Development

When you're done deploying and want to go back to local development:

```bash
node scripts/restore-to-workspace.js
pnpm install
```

## Workflow Examples

### Example 1: Deploy Demo App

```bash
# 1. Make your changes locally
# ... edit code ...

# 2. Commit and push to GitHub
git add .
git commit -m "Add new feature"
git push origin main

# 3. Convert demo app to use GitHub tarballs
node scripts/convert-to-github-tarball.js main

# 4. Deploy the demo app (package.json now points to GitHub)
cd apps/demo
pnpm install
pnpm build
# ... deploy ...

# 5. Restore workspace for continued local dev
cd ../..
node scripts/restore-to-workspace.js
pnpm install
```

### Example 2: Test Feature Branch in Deployed Environment

```bash
# 1. Create and push a feature branch
git checkout -b feature/polkadot-improvements
# ... make changes ...
git push origin feature/polkadot-improvements

# 2. Convert to use the feature branch
node scripts/convert-to-github-tarball.js feature/polkadot-improvements

# 3. Test in your deployed environment
cd apps/demo
pnpm install
pnpm build
# ... deploy to staging ...

# 4. When done, restore workspace
cd ../..
node scripts/restore-to-workspace.js
pnpm install
```

### Example 3: Pin to Specific Version for Production

```bash
# 1. Tag a release
git tag v1.8.22
git push origin v1.8.22

# 2. Convert to use the tagged version
node scripts/convert-to-github-tarball.js v1.8.22

# 3. Deploy production (now pinned to specific version)
cd apps/demo
pnpm install
pnpm build
# ... deploy to production ...
```

## Using in External Projects

If you have external projects that want to use your fork, they can add the GitHub tarball URLs directly:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit",
    "@laughingwhales/appkit-adapter-wagmi": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/adapters/wagmi"
  }
}
```

Or using npm install:

```bash
npm install https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit
```

## Configuration

The scripts are configured in `scripts/convert-to-github-tarball.js`. Update these if needed:

```javascript
// Your GitHub repo details
const GITHUB_USER = 'laughingwhales'
const GITHUB_REPO = 'sacred-appkit'

// Add more consumer packages as needed
const CONSUMER_PACKAGES = [
  'apps/demo',
  'apps/laboratory',
  'apps/gallery',
  'examples/react-wagmi'
  // ... add yours
]
```

## Troubleshooting

### Issue: "Package not found"

Make sure:

1. The GitHub repository is accessible (public or you have access)
2. The branch/tag/commit exists
3. The subdirectory path is correct

### Issue: Install is slow

GitHub tarballs are cached by npm/pnpm. First install might be slow, but subsequent ones are faster. Consider:

- Using a CDN proxy for GitHub API
- Pinning to commits for cacheable URLs

### Issue: Private repository

For private repos, set up GitHub authentication:

```bash
# Create a personal access token on GitHub
# Add to .npmrc:
//api.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Or use the git+ssh format:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "git+ssh://git@github.com/laughingwhales/sacred-appkit.git#main:packages/appkit"
  }
}
```

## Best Practices

1. **Local dev**: Always use `workspace:*` for local development
2. **Feature testing**: Use feature branch URLs for testing
3. **Production**: Use tagged versions for production deployments
4. **CI/CD**: Integrate the conversion script into your deployment pipeline
5. **Documentation**: Keep a record of which branch/tag is deployed where

## Comparison with Other Methods

| Method         | Speed      | Flexibility   | Caching | Use Case          |
| -------------- | ---------- | ------------- | ------- | ----------------- |
| `workspace:*`  | ⚡ Instant | 🎯 Local only | ✅ Best | Local development |
| GitHub tarball | ⚡ Fast    | 🎯 Any ref    | ✅ Good | Deploy/testing    |
| npm publish    | 🐌 Slow    | 📦 Versioned  | ✅ Best | Public releases   |
| npm link       | ⚡ Instant | 🎯 Local only | ❌ None | Quick testing     |

## Automation Ideas

### Git Hook for Auto-conversion

Add to `.husky/pre-push`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Optionally convert before pushing
# node scripts/convert-to-github-tarball.js $(git branch --show-current)
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Convert to GitHub tarballs
  run: node scripts/convert-to-github-tarball.js ${{ github.ref_name }}

- name: Build
  run: |
    pnpm install
    pnpm build

- name: Restore workspace
  run: node scripts/restore-to-workspace.js
```

## Summary

The GitHub tarball workflow gives you the best of both worlds:

- Fast local development with `workspace:*`
- Quick deployments without npm publishing

Use the provided scripts to switch between modes seamlessly!

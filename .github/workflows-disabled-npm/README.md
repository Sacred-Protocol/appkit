# Disabled npm Publishing Workflows

These workflows have been **disabled** because Sacred-AppKit now uses **GitHub tarball URLs** for distribution instead of npm publishing.

## Why Disabled?

1. **Faster iteration** - Push to GitHub and deploy immediately
2. **No npm authentication** - No need for npm tokens or login
3. **Branch/tag flexibility** - Install from any branch, tag, or commit
4. **Simpler workflow** - One less moving part to manage

## What Was Disabled

- `release-canary.yml` - Canary releases to npm
- `release-publish.yml` - Production releases to npm
- `release-start.yml` - Release preparation workflow
- `publish-prerelease.yml` - Prerelease publishing to npm

## Alternative: GitHub Tarball Distribution

Apps can now install packages directly from GitHub:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/Sacred-Protocol/appkit/tarball/main#subdirectory=packages/appkit"
  }
}
```

Or use the convenience scripts:

```bash
# Convert apps to use GitHub tarballs
pnpm deps:github main

# Back to local development
pnpm deps:workspace
```

## If You Need to Re-enable

If you need to publish to npm again:

1. Move these files back to `.github/workflows/`
2. Set up `NPM_TOKEN` in GitHub Secrets
3. Run the workflows

## Documentation

See these files for the GitHub tarball workflow:
- `QUICK_START_GITHUB_TARBALL.md`
- `GITHUB_TARBALL_WORKFLOW.md`
- `DEPENDENCY_STRATEGIES.md`
- `README_LAUGHINGWHALES.md`

---

**Disabled on:** $(date)  
**Reason:** Migrated to GitHub tarball distribution  
**Decision:** No longer publishing to npm registry


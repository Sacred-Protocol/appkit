# Sacred-AppKit: No npm Publishing Policy

**Date:** October 22, 2025  
**Decision:** Sacred-AppKit (LaughingWhales fork) no longer publishes to npm

## Why We Disabled npm Publishing

After setting up the GitHub tarball workflow, we realized that npm publishing was:

1. ❌ **Slow** - Requires building, publishing, and waiting for registry propagation
2. ❌ **Complex** - Needs authentication, tokens, and CI/CD configuration
3. ❌ **Unnecessary** - GitHub tarballs provide everything we need
4. ❌ **Overhead** - One more system to maintain and debug
5. ❌ **Version conflicts** - Having to manage versions across all packages

## What We Use Instead

### ✅ GitHub Tarball URLs

Packages are installed directly from GitHub repository:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/Sacred-Protocol/appkit/tarball/main#subdirectory=packages/appkit"
  }
}
```

### Benefits

1. ✅ **Instant updates** - Push to GitHub, install immediately
2. ✅ **Branch flexibility** - Test feature branches before merging
3. ✅ **Commit pinning** - Pin to exact commits for stability
4. ✅ **No authentication** - Public GitHub repos work out of the box
5. ✅ **Simpler CI/CD** - No npm tokens or publish steps

## How to Use Sacred-AppKit

### For Internal Projects (Apps/Examples)

```bash
# Local development (default)
pnpm install  # Uses workspace:*

# Deploy to production
pnpm deps:github main  # or a specific tag/commit
pnpm install
pnpm build
```

### For External Projects

Install from GitHub tarball URLs:

```bash
npm install https://api.github.com/repos/Sacred-Protocol/appkit/tarball/main#subdirectory=packages/appkit
```

Or add to `package.json`:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/Sacred-Protocol/appkit/tarball/v1.8.21#subdirectory=packages/appkit",
    "@laughingwhales/appkit-adapter-wagmi": "https://api.github.com/repos/Sacred-Protocol/appkit/tarball/v1.8.21#subdirectory=packages/adapters/wagmi"
  }
}
```

See `.github-tarball-example.json` for all available packages.

## Disabled npm Publishing Scripts

If you try to run these, you'll get a helpful error:

```bash
pnpm publish:latest    # ❌ Disabled
pnpm publish:canary    # ❌ Disabled
pnpm publish:alpha     # ❌ Disabled
pnpm publish:beta      # ❌ Disabled
pnpm changeset:publish # ❌ Disabled
```

**Error message:**
```
⚠️  npm publishing disabled - use GitHub tarballs instead
Run: pnpm deps:github main
```

## Disabled CI/CD Workflows

Moved to `.github/workflows-disabled-npm/`:

- `release-canary.yml` - Canary releases
- `release-publish.yml` - Production releases
- `release-start.yml` - Release preparation
- `publish-prerelease.yml` - Prerelease publishing

## Version Management

We still use changesets for tracking changes and generating changelogs:

```bash
# Track a change
pnpm changeset

# Version packages (updates package.json versions)
pnpm changeset:version
```

But we **skip the publish step** and use Git tags instead:

```bash
# After versioning
git tag v1.9.0
git push --tags

# Users install from tag
pnpm deps:github v1.9.0
```

## Comparison: npm vs GitHub Tarballs

| Aspect | npm Publishing | GitHub Tarballs |
|--------|---------------|-----------------|
| **Setup** | Complex (tokens, auth) | Simple (just push) |
| **Speed** | Slow (minutes) | Fast (seconds) |
| **Flexibility** | Tags only | Branches/tags/commits |
| **Testing** | Requires pre-release | Test any branch |
| **Overhead** | High | Low |
| **Best for** | Public libraries | Forks & internal use |

## If You Need npm Publishing

If you need to re-enable npm publishing (e.g., for public distribution):

1. **Move workflows back:**
   ```bash
   mv .github/workflows-disabled-npm/*.yml .github/workflows/
   ```

2. **Restore scripts in package.json:**
   - Change publish scripts back to actual publish commands
   - Remove the error messages

3. **Set up authentication:**
   - Create npm token
   - Add `NPM_TOKEN` to GitHub Secrets

4. **Run publish:**
   ```bash
   pnpm publish:latest
   ```

But ask yourself: **Do you really need npm?** GitHub tarballs work great for most use cases.

## FAQ

### Q: How do external users know which version to use?

**A:** Use Git tags for versions:
```bash
git tag v1.9.0
git push --tags
```

Users install: `https://api.github.com/repos/Sacred-Protocol/appkit/tarball/v1.9.0#subdirectory=packages/appkit`

### Q: What about semver ranges (^1.8.0)?

**A:** GitHub tarballs don't support semver ranges. Pin to specific tags:
- Production: Use tagged versions (`v1.9.0`)
- Development: Use branch names (`main`)
- Testing: Use commit SHAs (`abc123`)

### Q: Is this slower than npm?

**A:** First install downloads from GitHub; subsequent installs are cached by npm/pnpm. Performance is comparable.

### Q: What about private packages?

**A:** For private repos, set up authentication:
```bash
# In .npmrc
//api.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Or use SSH format:
```json
"dependencies": {
  "package": "git+ssh://git@github.com/Sacred-Protocol/appkit.git#main:packages/appkit"
}
```

### Q: Can I still use npm for other packages?

**A:** Yes! This only affects Sacred-AppKit packages. All other packages use npm/pnpm normally.

## Documentation

See these guides for more information:

- `QUICK_START_GITHUB_TARBALL.md` - Quick reference
- `GITHUB_TARBALL_WORKFLOW.md` - Detailed workflow
- `DEPENDENCY_STRATEGIES.md` - Strategy comparison
- `README_LAUGHINGWHALES.md` - Fork overview

## Summary

Sacred-AppKit no longer uses npm publishing because:

1. GitHub tarballs are faster and simpler
2. We don't need public registry distribution
3. Branch/tag/commit flexibility is more valuable
4. Less infrastructure to maintain

**For Sacred-AppKit packages, use GitHub tarballs. For everything else, use npm as normal.** 🚀

---

**Questions?** See `GITHUB_TARBALL_WORKFLOW.md` or check `.github/workflows-disabled-npm/README.md`


# ✅ GitHub Tarball Setup Complete!

Your Sacred-AppKit fork is now configured to use GitHub tarballs for flexible, rapid deployment without constant npm publishing.

## What Was Set Up

### 📜 Scripts Created

1. **`scripts/convert-to-github-tarball.js`**

   - Converts `workspace:*` to GitHub tarball URLs
   - Usage: `pnpm deps:github <branch|tag|commit>`

2. **`scripts/restore-to-workspace.js`**

   - Restores GitHub URLs back to `workspace:*`
   - Usage: `pnpm deps:workspace`

3. **`scripts/check-dependency-mode.js`**
   - Shows current dependency mode
   - Usage: `pnpm deps:check`

### 📚 Documentation Created

1. **`QUICK_START_GITHUB_TARBALL.md`**

   - Quick reference guide
   - Common commands and scenarios

2. **`GITHUB_TARBALL_WORKFLOW.md`**

   - Comprehensive workflow documentation
   - Troubleshooting guide
   - Best practices

3. **`DEPENDENCY_STRATEGIES.md`**

   - Comparison of all dependency strategies
   - When to use each approach
   - Workflow examples

4. **`README_LAUGHINGWHALES.md`**
   - Fork-specific documentation
   - Installation instructions for external users

### 🔧 Configuration Files

1. **`.github-tarball-example.json`**

   - Example package.json for external projects
   - Shows all available packages

2. **`.github/workflows/deploy-with-tarballs.example.yml`**
   - Example GitHub Actions workflow
   - Deploy to staging/production

### 📦 Package.json Updates

Added convenience npm scripts:

- `pnpm deps:github` - Convert to GitHub tarballs
- `pnpm deps:workspace` - Restore workspace protocol
- `pnpm deps:check` - Check current mode

## Quick Start

### Check Current Status

```bash
pnpm deps:check
```

Output:

```
✅ All dependencies are in WORKSPACE mode
   👍 Perfect for local development
   💡 To deploy, run: pnpm deps:github <branch>
```

### Local Development (Default)

No changes needed! Your current setup with `workspace:*` is perfect:

```bash
pnpm install
pnpm build
pnpm watch
```

### Deploy an App

```bash
# 1. Commit and push
git add .
git commit -m "Add feature"
git push origin main

# 2. Convert to GitHub tarballs
pnpm deps:github main

# 3. Install and build
pnpm install
cd apps/demo
pnpm build
# ... deploy ...

# 4. Back to development
cd ../..
pnpm deps:workspace
pnpm install
```

## Available Commands

| Command                  | Description            | Example                 |
| ------------------------ | ---------------------- | ----------------------- |
| `pnpm deps:check`        | Check current mode     | `pnpm deps:check`       |
| `pnpm deps:github <ref>` | Use GitHub tarballs    | `pnpm deps:github main` |
| `pnpm deps:workspace`    | Use workspace protocol | `pnpm deps:workspace`   |

## Examples

### Deploy with Main Branch

```bash
pnpm deps:github main
pnpm install
pnpm build
```

### Test Feature Branch

```bash
git push origin feature/my-feature
pnpm deps:github feature/my-feature
pnpm install
```

### Pin to Tagged Version

```bash
git tag v1.9.0
git push --tags
pnpm deps:github v1.9.0
pnpm install
```

### Use Specific Commit

```bash
pnpm deps:github abc1234567
pnpm install
```

## For External Projects

Share this with users who want to use your fork:

### Install from GitHub

```bash
npm install https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit
```

### Add to package.json

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit",
    "@laughingwhales/appkit-adapter-wagmi": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/adapters/wagmi"
  }
}
```

## CI/CD Integration

Example GitHub Actions:

```yaml
- name: Convert to GitHub tarballs
  run: pnpm deps:github ${{ github.ref_name }}

- name: Install and build
  run: |
    pnpm install
    pnpm build

- name: Restore workspace
  run: pnpm deps:workspace
```

See `.github/workflows/deploy-with-tarballs.example.yml` for complete example.

## Benefits

✅ **No npm publishing** - Push to GitHub and deploy immediately
✅ **Test any branch** - Point to feature branches for testing  
✅ **Version pinning** - Use tags or commits for stability
✅ **Fast iteration** - No waiting for npm registry
✅ **Monorepo support** - Subdirectory targeting works perfectly

## Documentation

- 📖 [Quick Start](QUICK_START_GITHUB_TARBALL.md) - Get started in 5 minutes
- 📚 [Full Workflow](GITHUB_TARBALL_WORKFLOW.md) - Detailed guide
- 🔄 [Dependency Strategies](DEPENDENCY_STRATEGIES.md) - Choose wisely
- 🏠 [Fork README](README_LAUGHINGWHALES.md) - About this fork

## Next Steps

1. ✅ Setup complete - you're ready to go!
2. 📖 Read [QUICK_START_GITHUB_TARBALL.md](QUICK_START_GITHUB_TARBALL.md)
3. 🧪 Test it: `pnpm deps:github main` → `pnpm deps:workspace`
4. 🚀 Deploy your first app with GitHub tarballs
5. 🤝 Share fork with external projects

## Troubleshooting

### "Nothing to convert"

You're already in workspace mode (good for local dev).

### "Slow installs"

First install from GitHub is slower, but subsequent installs are cached.

### "Changes not reflected"

Make sure you've pushed to GitHub before converting:

```bash
git push origin main
pnpm deps:github main
```

### "Mixed mode warning"

Run `pnpm deps:check` to see the issue, then:

```bash
pnpm deps:workspace  # or
pnpm deps:github main
```

## Support

- 📖 Read the full docs in `GITHUB_TARBALL_WORKFLOW.md`
- 🔍 Check mode: `pnpm deps:check`
- 🐛 Issues: Check troubleshooting sections in docs

---

**Setup completed successfully! 🎉**

You now have a flexible, fast workflow for developing and deploying your forked AppKit packages.

Start with: `pnpm deps:check` to see your current status.


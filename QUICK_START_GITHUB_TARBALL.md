# Quick Start: GitHub Tarball Dependencies

## TL;DR

```bash
# 1. Commit and push your changes
git push origin main

# 2. Convert apps/examples to use GitHub tarballs (pointing to main branch)
pnpm deps:github main

# 3. Install and deploy
pnpm install
pnpm build

# 4. Back to local development
pnpm deps:workspace
pnpm install
```

## Commands

| Command                  | Description                    |
| ------------------------ | ------------------------------ |
| `pnpm deps:github [ref]` | Convert to GitHub tarball URLs |
| `pnpm deps:workspace`    | Restore workspace:\* protocol  |

## Common Scenarios

### Deploy Demo App with Latest Changes

```bash
# Make changes, commit, push
git add .
git commit -m "Update feature"
git push

# Convert demo to use GitHub (main branch)
pnpm deps:github main
cd apps/demo
pnpm install
pnpm build
# Deploy...

# Go back to development mode
cd ../..
pnpm deps:workspace
```

### Test Feature Branch in Staging

```bash
# Push feature branch
git push origin feature/new-thing

# Point to feature branch
pnpm deps:github feature/new-thing
pnpm install
# Test in staging...

# Restore
pnpm deps:workspace
```

### Pin Production to Specific Version

```bash
# Tag release
git tag v1.9.0
git push --tags

# Use tagged version
pnpm deps:github v1.9.0
# Deploy to production...
```

## For External Projects

Add to your `package.json`:

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit"
  }
}
```

Or install directly:

```bash
npm install https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit
```

## Available Packages

All packages under `packages/` and `packages/adapters/` are available:

- `@laughingwhales/appkit` → `packages/appkit`
- `@laughingwhales/appkit-adapter-wagmi` → `packages/adapters/wagmi`
- `@laughingwhales/appkit-adapter-solana` → `packages/adapters/solana`
- `@laughingwhales/appkit-adapter-bitcoin` → `packages/adapters/bitcoin`
- `@laughingwhales/appkit-adapter-ethers` → `packages/adapters/ethers`
- `@laughingwhales/appkit-adapter-ethers5` → `packages/adapters/ethers5`
- `@laughingwhales/appkit-adapter-polkadot` → `packages/adapters/polkadot`
- `@laughingwhales/appkit-controllers` → `packages/controllers`
- `@laughingwhales/appkit-ui` → `packages/ui`
- `@laughingwhales/appkit-scaffold-ui` → `packages/scaffold-ui`
- And more...

See `.github-tarball-example.json` for a complete list.

## Full Documentation

See `GITHUB_TARBALL_WORKFLOW.md` for detailed documentation.


# Sacred-AppKit by LaughingWhales

This is a fork of [Reown AppKit](https://github.com/reown-com/appkit) maintained by LaughingWhales. We've added custom features and improvements while maintaining compatibility with the upstream project.

## Quick Links

- 🚀 [Quick Start: GitHub Tarball Usage](QUICK_START_GITHUB_TARBALL.md)
- 📖 [Dependency Management Strategies](DEPENDENCY_STRATEGIES.md)
- 📚 [Full GitHub Tarball Workflow Guide](GITHUB_TARBALL_WORKFLOW.md)
- 🔧 [Example Configuration](.github-tarball-example.json)

## What's Different?

This fork includes:

- Packages renamed to `@laughingwhales/*` scope
- Custom adapters and features
- Polkadot support enhancements
- Flexible dependency management for rapid development

## Installation

### For Internal Development (Monorepo)

```bash
# Clone the repo
git clone https://github.com/laughingwhales/sacred-appkit.git
cd sacred-appkit

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run demo app
pnpm demo:dev
```

### For External Projects

You have multiple options to use our fork in your projects:

#### Option 1: GitHub Tarballs (Recommended)

Install directly from GitHub without waiting for npm releases:

```bash
# Install from main branch
npm install https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit

# Or add to package.json
```

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/appkit",
    "@laughingwhales/appkit-adapter-wagmi": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/main#subdirectory=packages/adapters/wagmi"
  }
}
```

#### Option 2: Specific Version (Tag)

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/v1.8.21#subdirectory=packages/appkit"
  }
}
```

#### Option 3: Feature Branch

```json
{
  "dependencies": {
    "@laughingwhales/appkit": "https://api.github.com/repos/laughingwhales/sacred-appkit/tarball/feature/my-feature#subdirectory=packages/appkit"
  }
}
```

## Development Workflow

### Local Development

```bash
# Work with local packages (default)
pnpm install
pnpm watch  # or pnpm build

# Changes are instantly reflected in apps/examples via workspace:*
```

### Deploying with GitHub Tarballs

```bash
# 1. Push your changes
git add .
git commit -m "Add feature"
git push origin main

# 2. Convert dependencies to GitHub URLs
pnpm deps:github main

# 3. Install and deploy
pnpm install
pnpm build
cd apps/demo && pnpm build
# ... deploy ...

# 4. Restore for local development
pnpm deps:workspace
pnpm install
```

## Available Commands

| Command                  | Description                    |
| ------------------------ | ------------------------------ |
| `pnpm build`             | Build all packages             |
| `pnpm watch`             | Watch mode for development     |
| `pnpm demo:dev`          | Run demo app                   |
| `pnpm laboratory`        | Run laboratory app             |
| `pnpm test`              | Run tests                      |
| `pnpm deps:github <ref>` | Convert to GitHub tarball URLs |
| `pnpm deps:workspace`    | Restore workspace protocol     |

## Available Packages

All packages are scoped to `@laughingwhales`:

### Core Packages

- `@laughingwhales/appkit` - Main SDK
- `@laughingwhales/appkit-common` - Shared utilities
- `@laughingwhales/appkit-controllers` - State management
- `@laughingwhales/appkit-ui` - UI components
- `@laughingwhales/appkit-scaffold-ui` - High-level UI flows

### Adapters

- `@laughingwhales/appkit-adapter-wagmi` - Wagmi integration
- `@laughingwhales/appkit-adapter-ethers` - Ethers v6 integration
- `@laughingwhales/appkit-adapter-ethers5` - Ethers v5 integration
- `@laughingwhales/appkit-adapter-solana` - Solana integration
- `@laughingwhales/appkit-adapter-bitcoin` - Bitcoin integration
- `@laughingwhales/appkit-adapter-polkadot` - Polkadot integration

### Utilities

- `@laughingwhales/appkit-utils` - Chain utilities
- `@laughingwhales/appkit-wallet` - Wallet utilities
- `@laughingwhales/appkit-pay` - Payment features
- `@laughingwhales/appkit-siwe` - Sign-In With Ethereum
- `@laughingwhales/appkit-siwx` - Cross-chain signing

See [.github-tarball-example.json](.github-tarball-example.json) for complete list with URLs.

## Why GitHub Tarballs?

We chose to support GitHub tarball URLs because:

✅ **No npm publishing needed** - Push to GitHub and deploy immediately
✅ **Test any branch** - Point to feature branches for testing
✅ **Version pinning** - Use tags or commits for stability
✅ **Fast iteration** - No waiting for npm registry propagation
✅ **Monorepo friendly** - Subdirectory support for our packages

See [DEPENDENCY_STRATEGIES.md](DEPENDENCY_STRATEGIES.md) for a complete comparison.

## CI/CD Integration

Example GitHub Actions workflow:

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

See [.github/workflows/deploy-with-tarballs.example.yml](.github/workflows/deploy-with-tarballs.example.yml) for complete example.

## Documentation

- [Quick Start Guide](QUICK_START_GITHUB_TARBALL.md) - Get started in 5 minutes
- [Dependency Strategies](DEPENDENCY_STRATEGIES.md) - Choose the right approach
- [Full Workflow Guide](GITHUB_TARBALL_WORKFLOW.md) - Detailed documentation
- [Original Reown Docs](https://docs.reown.com/appkit/overview) - API reference

## Contributing

### Setting Up for Development

1. Fork and clone
2. Install: `pnpm install`
3. Build: `pnpm build`
4. Make changes
5. Test: `pnpm test`
6. Submit PR

### Publishing Changes

We use GitHub tarballs for most deployments, but for npm releases:

```bash
# 1. Version bump
pnpm changeset
pnpm changeset:version

# 2. Publish to npm
pnpm publish:latest

# 3. Tag release
git tag v1.9.0
git push --tags
```

## Troubleshooting

### GitHub Tarball Issues

**Slow installs?**

- First install downloads from GitHub; subsequent installs are cached
- Consider pinning to commit SHAs for better caching

**Changes not showing?**

- Make sure you've pushed to GitHub
- Clear cache: `pnpm store prune`
- Delete node_modules and reinstall

**Private repo access?**

- Create GitHub personal access token
- Add to `.npmrc`: `//api.github.com/:_authToken=YOUR_TOKEN`

See [GITHUB_TARBALL_WORKFLOW.md#troubleshooting](GITHUB_TARBALL_WORKFLOW.md#troubleshooting) for more.

## License

This project maintains the same license as the upstream Reown AppKit project. See [LICENSE.md](LICENSE.md).

## Support

- 🐛 [Report Issues](https://github.com/laughingwhales/sacred-appkit/issues)
- 💬 [Discussions](https://github.com/laughingwhales/sacred-appkit/discussions)
- 📧 Contact: [your-contact-info]

## Upstream

This fork is based on [Reown AppKit](https://github.com/reown-com/appkit). We periodically sync with upstream to get latest features and fixes.

```bash
# Sync with upstream
git remote add upstream https://github.com/reown-com/appkit.git
git fetch upstream
git merge upstream/main
```

---

**Made with ❤️ by LaughingWhales**


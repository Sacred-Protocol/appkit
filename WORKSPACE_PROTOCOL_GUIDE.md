# Workspace Protocol Publishing Guide

## Root Cause Analysis: v1.8.11 Issue

### The Problem

In v1.8.11, `pnpm publish` failed to convert `workspace:*` dependencies to actual version numbers, resulting in published packages with broken dependencies.

### Why It Happened

1. **Missing Build Step**: Packages were published without running `pnpm build:all` first
2. **Inconsistent Dependencies**: Some packages (like `polkadot adapter`) had hardcoded version numbers instead of `workspace:*`
3. **Version Mismatches**: The polkadot adapter had `@laughingwhales/appkit-controllers: ^1.8.11` while others were at 1.8.12

## How Workspace Protocol Works

### In Development (Local Monorepo)

```json
{
  "dependencies": {
    "@laughingwhales/appkit-common": "workspace:*"
  }
}
```

- `workspace:*` tells pnpm to use the local version from the monorepo
- Changes in dependencies are immediately reflected
- No need to republish dependencies for local testing

### When Publishing

When you run `pnpm publish`, it automatically:

1. Reads the local package version
2. Replaces `workspace:*` with the actual version
3. Publishes the package with concrete version numbers

```json
// Before publish (in repo)
{
  "dependencies": {
    "@laughingwhales/appkit-common": "workspace:*"
  }
}

// After publish (on npm)
{
  "dependencies": {
    "@laughingwhales/appkit-common": "^1.8.12"
  }
}
```

## Correct Publishing Process

### 1. Pre-Publish Verification

```bash
./verify-publish-ready.sh
```

This checks:

- ✅ All packages are at the correct version
- ✅ `workspace:*` dependencies exist
- ✅ pnpm version supports workspace protocol (>= 7.0)
- ✅ All packages are built

### 2. Build All Packages

```bash
pnpm build:all
```

**Why this is critical:**

- Ensures all TypeScript is compiled
- Generates proper `dist/` folders
- Updates internal cross-references
- Without this, published packages may have broken imports

### 3. Publish with OTP

```bash
./publish-1.8.12.sh <otp-code>
```

This script:

- ✅ Publishes packages in dependency order
- ✅ Checks if packages are already published (resumable)
- ✅ Uses `pnpm publish` (auto-converts workspace:\*)
- ✅ Handles OTP properly with rate limiting

## Best Practices

### ✅ DO:

1. **Use `workspace:*` for all internal dependencies**

   ```json
   "@laughingwhales/appkit-common": "workspace:*"
   ```

2. **Always build before publishing**

   ```bash
   pnpm build:all
   ```

3. **Use `pnpm publish`, never `npm publish`**

   - pnpm understands workspace protocol
   - npm does not handle `workspace:*`

4. **Publish in dependency order**

   - Common/base packages first
   - Adapters and app packages last

5. **Verify with the verification script**
   ```bash
   ./verify-publish-ready.sh
   ```

### ❌ DON'T:

1. **Don't hardcode version numbers in monorepo**

   ```json
   // ❌ BAD (in monorepo)
   "@laughingwhales/appkit-common": "^1.8.12"

   // ✅ GOOD (in monorepo)
   "@laughingwhales/appkit-common": "workspace:*"
   ```

2. **Don't publish without building**

   - This is the #1 cause of broken publishes

3. **Don't use `npm publish` in a pnpm workspace**

   - npm doesn't understand workspace protocol

4. **Don't mix workspace:\* and hardcoded versions**
   - Leads to version mismatches

## Package Dependency Order

When publishing, follow this order:

```
1. Foundation packages (no dependencies):
   - appkit-common
   - appkit-polyfills
   - appkit-wallet

2. Core packages:
   - appkit-controllers
   - appkit-utils

3. UI packages:
   - appkit-ui
   - appkit-scaffold-ui
   - appkit-pay

4. Feature packages:
   - appkit-siwe
   - appkit-siwx
   - appkit-wallet-button
   - appkit-experimental

5. Main package:
   - appkit

6. Adapters (depend on appkit):
   - appkit-adapter-bitcoin
   - appkit-adapter-ethers5
   - appkit-adapter-ethers
   - appkit-adapter-wagmi
   - appkit-adapter-solana
   - appkit-adapter-polkadot

7. Meta packages:
   - appkit-cdn
   - appkit-cli
   - appkit-codemod
   - appkit-testing
```

## Troubleshooting

### Issue: Package published with `workspace:*` in dependencies

**Cause**: Used `npm publish` instead of `pnpm publish`  
**Solution**:

```bash
npm unpublish @laughingwhales/package@version
pnpm publish  # Use pnpm, not npm
```

### Issue: Published package has wrong version numbers

**Cause**: Didn't build packages before publishing  
**Solution**:

```bash
npm unpublish @laughingwhales/package@version
pnpm build:all
pnpm publish
```

### Issue: Version mismatch between packages

**Cause**: Some packages have hardcoded versions instead of `workspace:*`  
**Solution**: Update package.json to use `workspace:*`:

```bash
# Find packages with hardcoded versions
grep -r "@laughingwhales.*[0-9]" packages/*/package.json

# Replace with workspace:*
# Then republish
```

## Verification After Publishing

After publishing, verify the packages on npm:

```bash
# Check that workspace:* was converted
npm view @laughingwhales/appkit@1.8.12 dependencies

# Should show version numbers, not workspace:*
# Example output:
# {
#   '@laughingwhales/appkit-common': '^1.8.12',
#   '@laughingwhales/appkit-controllers': '^1.8.12',
#   ...
# }
```

## Current Status (v1.8.12)

### Fixed Issues:

✅ All packages use `workspace:*` (except polkadot adapter - now fixed)  
✅ Build step is included in publish script  
✅ Verification script added to catch issues before publishing  
✅ Version mismatch in polkadot adapter fixed (controllers 1.8.11 → 1.8.12)

### Packages Ready for v1.8.12:

- @laughingwhales/appkit
- @laughingwhales/appkit-adapter-polkadot
- @laughingwhales/appkit-adapter-solana
- @laughingwhales/appkit-common
- @laughingwhales/appkit-controllers
- @laughingwhales/appkit-scaffold-ui
- @laughingwhales/appkit-siwx
- @laughingwhales/appkit-ui
- @laughingwhales/appkit-wallet-button

All packages:

- ✅ Version 1.8.12 in package.json
- ✅ Built and ready (dist/ folders exist)
- ✅ Using workspace:\* for internal dependencies (22 total)
- ✅ pnpm 9.5.0 ready for publish

## References

- [pnpm workspace protocol](https://pnpm.io/workspaces#workspace-protocol-workspace)
- [pnpm publish](https://pnpm.io/cli/publish)
- [Monorepo best practices](https://pnpm.io/workspaces)

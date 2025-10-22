#!/usr/bin/env node
/**
 * Convert workspace:* dependencies to GitHub tarball URLs
 *
 * This allows consuming apps to install directly from your GitHub repo
 * without needing to publish to npm for every change.
 *
 * Usage:
 *   node scripts/convert-to-github-tarball.js [branch|tag|commit]
 *
 * Examples:
 *   node scripts/convert-to-github-tarball.js main
 *   node scripts/convert-to-github-tarball.js feature/new-adapter
 *   node scripts/convert-to-github-tarball.js v1.8.21
 *   node scripts/convert-to-github-tarball.js abc1234
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Get the ref (branch/tag/commit) from command line or default to 'main'
const gitRef = process.argv[2] || 'main'

// Your GitHub repo details
const GITHUB_USER = 'laughingwhales'
const GITHUB_REPO = 'sacred-appkit'

// Map of package names to their subdirectories in the monorepo
const PACKAGE_PATHS = {
  '@laughingwhales/appkit': 'packages/appkit',
  '@laughingwhales/appkit-common': 'packages/common',
  '@laughingwhales/appkit-controllers': 'packages/controllers',
  '@laughingwhales/appkit-ui': 'packages/ui',
  '@laughingwhales/appkit-scaffold-ui': 'packages/scaffold-ui',
  '@laughingwhales/appkit-siwx': 'packages/siwx',
  '@laughingwhales/appkit-siwe': 'packages/siwe',
  '@laughingwhales/appkit-wallet-button': 'packages/wallet-button',
  '@laughingwhales/appkit-adapter-solana': 'packages/adapters/solana',
  '@laughingwhales/appkit-adapter-polkadot': 'packages/adapters/polkadot',
  '@laughingwhales/appkit-adapter-bitcoin': 'packages/adapters/bitcoin',
  '@laughingwhales/appkit-adapter-ethers': 'packages/adapters/ethers',
  '@laughingwhales/appkit-adapter-ethers5': 'packages/adapters/ethers5',
  '@laughingwhales/appkit-adapter-wagmi': 'packages/adapters/wagmi',
  '@laughingwhales/appkit-utils': 'packages/appkit-utils',
  '@laughingwhales/appkit-wallet': 'packages/wallet',
  '@laughingwhales/appkit-polyfills': 'packages/polyfills',
  '@laughingwhales/appkit-pay': 'packages/pay',
  '@laughingwhales/appkit-testing': 'packages/testing',
  '@laughingwhales/appkit-experimental': 'packages/experimental',
  '@laughingwhales/appkit-universal-connector': 'packages/universal-connector',
  '@laughingwhales/appkit-cdn': 'packages/cdn',
  '@laughingwhales/appkit-core': 'packages/core-legacy'
}

/**
 * Generate a GitHub tarball URL for a package
 * Format: https://api.github.com/repos/USER/REPO/tarball/REF#subdirectory=PATH
 */
function generateTarballUrl(packageName, gitRef) {
  const subdirectory = PACKAGE_PATHS[packageName]
  if (!subdirectory) {
    throw new Error(`Unknown package: ${packageName}`)
  }

  return `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/tarball/${gitRef}#subdirectory=${subdirectory}`
}

// Files to process (examples and apps that consume the packages)
const CONSUMER_PACKAGES = [
  'apps/demo',
  'apps/laboratory',
  'apps/gallery',
  'apps/browser-extension',
  'examples/react-wagmi',
  'examples/vue-wagmi',
  'examples/next-wagmi-app-router',
  'examples/html-wagmi',
  'examples/react-solana',
  'examples/vue-solana'
  // Add more as needed
]

console.log(`\n🔄 Converting workspace:* to GitHub tarball URLs`)
console.log(`   Repository: ${GITHUB_USER}/${GITHUB_REPO}`)
console.log(`   Reference: ${gitRef}\n`)

let totalConversions = 0
let processedFiles = 0

for (const consumerPath of CONSUMER_PACKAGES) {
  const pkgJsonPath = resolve(__dirname, '..', consumerPath, 'package.json')

  try {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
    let conversions = 0

    // Convert in dependencies
    if (pkgJson.dependencies) {
      for (const [depName, depVersion] of Object.entries(pkgJson.dependencies)) {
        if (
          PACKAGE_PATHS[depName] &&
          (depVersion === 'workspace:*' || depVersion.startsWith('workspace:'))
        ) {
          const tarballUrl = generateTarballUrl(depName, gitRef)
          pkgJson.dependencies[depName] = tarballUrl
          conversions++
          console.log(`   ✓ ${consumerPath}: ${depName}`)
          console.log(`     → ${tarballUrl}`)
        }
      }
    }

    // Convert in devDependencies
    if (pkgJson.devDependencies) {
      for (const [depName, depVersion] of Object.entries(pkgJson.devDependencies)) {
        if (
          PACKAGE_PATHS[depName] &&
          (depVersion === 'workspace:*' || depVersion.startsWith('workspace:'))
        ) {
          const tarballUrl = generateTarballUrl(depName, gitRef)
          pkgJson.devDependencies[depName] = tarballUrl
          conversions++
          console.log(`   ✓ ${consumerPath}: ${depName} (dev)`)
          console.log(`     → ${tarballUrl}`)
        }
      }
    }

    if (conversions > 0) {
      writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf-8')
      totalConversions += conversions
      processedFiles++
    }
  } catch (err) {
    // File might not exist, skip it
    if (err.code !== 'ENOENT') {
      console.warn(`   ⚠️  Error processing ${consumerPath}: ${err.message}`)
    }
  }
}

console.log(`\n✅ Converted ${totalConversions} dependencies in ${processedFiles} files\n`)

if (totalConversions === 0) {
  console.log('ℹ️  No workspace:* dependencies found to convert\n')
}

console.log('💡 Next steps:')
console.log('   1. Commit and push your changes to the branch/tag')
console.log(`   2. Run: pnpm install`)
console.log(
  '   3. To restore workspace:* for local dev, run: node scripts/restore-to-workspace.js\n'
)

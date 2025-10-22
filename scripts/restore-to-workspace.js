#!/usr/bin/env node
/**
 * Restore GitHub tarball URLs back to workspace:* for local development
 *
 * This is the reverse of convert-to-github-tarball.js
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// All @laughingwhales packages that should use workspace:*
const WORKSPACE_PACKAGES = new Set([
  '@laughingwhales/appkit',
  '@laughingwhales/appkit-common',
  '@laughingwhales/appkit-controllers',
  '@laughingwhales/appkit-ui',
  '@laughingwhales/appkit-scaffold-ui',
  '@laughingwhales/appkit-siwx',
  '@laughingwhales/appkit-siwe',
  '@laughingwhales/appkit-wallet-button',
  '@laughingwhales/appkit-adapter-solana',
  '@laughingwhales/appkit-adapter-polkadot',
  '@laughingwhales/appkit-adapter-bitcoin',
  '@laughingwhales/appkit-adapter-ethers',
  '@laughingwhales/appkit-adapter-ethers5',
  '@laughingwhales/appkit-adapter-wagmi',
  '@laughingwhales/appkit-utils',
  '@laughingwhales/appkit-wallet',
  '@laughingwhales/appkit-polyfills',
  '@laughingwhales/appkit-pay',
  '@laughingwhales/appkit-testing',
  '@laughingwhales/appkit-experimental',
  '@laughingwhales/appkit-universal-connector',
  '@laughingwhales/appkit-cdn',
  '@laughingwhales/appkit-core'
])

// Files to process
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

console.log('🔄 Restoring workspace:* dependencies for local development...\n')

let totalRestorations = 0
let processedFiles = 0

for (const consumerPath of CONSUMER_PACKAGES) {
  const pkgJsonPath = resolve(__dirname, '..', consumerPath, 'package.json')

  try {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
    let restorations = 0

    // Restore in dependencies
    if (pkgJson.dependencies) {
      for (const [depName, depVersion] of Object.entries(pkgJson.dependencies)) {
        // Check if it's a GitHub tarball URL or a version number for our packages
        if (
          WORKSPACE_PACKAGES.has(depName) &&
          typeof depVersion === 'string' &&
          (depVersion.includes('github.com') ||
            depVersion.includes('api.github.com') ||
            depVersion.match(/^\^?\d+\.\d+\.\d+/))
        ) {
          pkgJson.dependencies[depName] = 'workspace:*'
          restorations++
          console.log(`   ✓ ${consumerPath}: ${depName} → workspace:*`)
        }
      }
    }

    // Restore in devDependencies
    if (pkgJson.devDependencies) {
      for (const [depName, depVersion] of Object.entries(pkgJson.devDependencies)) {
        if (
          WORKSPACE_PACKAGES.has(depName) &&
          typeof depVersion === 'string' &&
          (depVersion.includes('github.com') ||
            depVersion.includes('api.github.com') ||
            depVersion.match(/^\^?\d+\.\d+\.\d+/))
        ) {
          pkgJson.devDependencies[depName] = 'workspace:*'
          restorations++
          console.log(`   ✓ ${consumerPath}: ${depName} (dev) → workspace:*`)
        }
      }
    }

    if (restorations > 0) {
      writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf-8')
      totalRestorations += restorations
      processedFiles++
    }
  } catch (err) {
    // File might not exist, skip it
    if (err.code !== 'ENOENT') {
      console.warn(`   ⚠️  Error processing ${consumerPath}: ${err.message}`)
    }
  }
}

console.log(
  `\n✅ Restored ${totalRestorations} dependencies to workspace:* in ${processedFiles} files\n`
)

if (totalRestorations > 0) {
  console.log('💡 Next step: Run pnpm install to reinstall from workspace\n')
}


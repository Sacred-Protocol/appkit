#!/usr/bin/env node
/**
 * Restore workspace:* dependencies after publishing
 *
 * This converts hardcoded versions back to workspace:* for local development
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Packages to process (all packages that might have been converted)
const PACKAGES = [
  'packages/polyfills',
  'packages/common',
  'packages/wallet',
  'packages/controllers',
  'packages/appkit-utils',
  'packages/ui',
  'packages/scaffold-ui',
  'packages/pay',
  'packages/siwe',
  'packages/siwx',
  'packages/wallet-button',
  'packages/appkit',
  'packages/adapters/solana',
  'packages/adapters/polkadot'
]

// All @laughingwhales packages that should use workspace:*
const WORKSPACE_PACKAGES = new Set([
  '@laughingwhales/appkit',
  '@laughingwhales/appkit-common',
  '@laughingwhales/appkit-controllers',
  '@laughingwhales/appkit-ui',
  '@laughingwhales/appkit-scaffold-ui',
  '@laughingwhales/appkit-siwx',
  '@laughingwhales/appkit-wallet-button',
  '@laughingwhales/appkit-adapter-solana',
  '@laughingwhales/appkit-adapter-polkadot',
  '@laughingwhales/appkit-utils',
  '@laughingwhales/appkit-wallet',
  '@laughingwhales/appkit-polyfills',
  '@laughingwhales/appkit-pay',
  '@laughingwhales/appkit-siwe'
])

console.log('🔄 Restoring workspace:* dependencies...\n')

let totalRestorations = 0

for (const pkgPath of PACKAGES) {
  const pkgJsonPath = resolve(__dirname, pkgPath, 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))

  let restorations = 0

  // Restore in dependencies
  if (pkgJson.dependencies) {
    for (const [depName, depVersion] of Object.entries(pkgJson.dependencies)) {
      if (WORKSPACE_PACKAGES.has(depName) && depVersion.match(/^\^?\d+\.\d+\.\d+/)) {
        pkgJson.dependencies[depName] = 'workspace:*'
        restorations++
        console.log(`   ✓ ${pkgJson.name}: ${depName} → workspace:*`)
      }
    }
  }

  // Restore in devDependencies
  if (pkgJson.devDependencies) {
    for (const [depName, depVersion] of Object.entries(pkgJson.devDependencies)) {
      if (WORKSPACE_PACKAGES.has(depName) && depVersion.match(/^\^?\d+\.\d+\.\d+/)) {
        pkgJson.devDependencies[depName] = 'workspace:*'
        restorations++
        console.log(`   ✓ ${pkgJson.name}: ${depName} (dev) → workspace:*`)
      }
    }
  }

  if (restorations > 0) {
    // Write back the modified package.json
    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf-8')
    totalRestorations += restorations
  }
}

console.log(`\n✅ Restored ${totalRestorations} dependencies to workspace:*\n`)

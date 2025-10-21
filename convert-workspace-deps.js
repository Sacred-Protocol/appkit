#!/usr/bin/env node
/**
 * Convert workspace:* dependencies to actual versions before publishing
 *
 * This is necessary because pnpm publish doesn't always auto-convert workspace:*
 * As seen in v1.8.11, packages were published with literal "workspace:*" in dependencies
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ALL packages in workspace (for version lookup)
const ALL_PACKAGES = [
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

// Packages to convert (the ones we're publishing)
// Update this list when publishing different packages
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

// Map of package names to their versions
const PACKAGE_VERSIONS = {}

console.log('🔍 Step 1: Reading all package versions...\n')

// First pass: collect all versions from ALL packages
for (const pkgPath of ALL_PACKAGES) {
  const pkgJsonPath = resolve(__dirname, pkgPath, 'package.json')
  try {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
    PACKAGE_VERSIONS[pkgJson.name] = pkgJson.version
    console.log(`   ${pkgJson.name}: v${pkgJson.version}`)
  } catch (err) {
    console.error(`   ❌ Error reading ${pkgJsonPath}: ${err.message}`)
    process.exit(1)
  }
}

console.log(`\n✅ Found ${Object.keys(PACKAGE_VERSIONS).length} package versions\n`)
console.log('🔄 Step 2: Converting workspace:* in packages being published...\n')

let totalConversions = 0

// Second pass: convert workspace:* to actual versions
for (const pkgPath of PACKAGES) {
  const pkgJsonPath = resolve(__dirname, pkgPath, 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))

  let conversions = 0

  // Convert in dependencies
  if (pkgJson.dependencies) {
    for (const [depName, depVersion] of Object.entries(pkgJson.dependencies)) {
      if (depVersion === 'workspace:*') {
        if (PACKAGE_VERSIONS[depName]) {
          pkgJson.dependencies[depName] = `^${PACKAGE_VERSIONS[depName]}`
          conversions++
          console.log(`   ✓ ${pkgJson.name}: ${depName} → ^${PACKAGE_VERSIONS[depName]}`)
        } else {
          console.warn(`   ⚠️  ${pkgJson.name}: ${depName} workspace:* but version not found`)
        }
      }
    }
  }

  // Convert in devDependencies
  if (pkgJson.devDependencies) {
    for (const [depName, depVersion] of Object.entries(pkgJson.devDependencies)) {
      if (depVersion === 'workspace:*') {
        if (PACKAGE_VERSIONS[depName]) {
          pkgJson.devDependencies[depName] = `^${PACKAGE_VERSIONS[depName]}`
          conversions++
          console.log(`   ✓ ${pkgJson.name}: ${depName} (dev) → ^${PACKAGE_VERSIONS[depName]}`)
        } else {
          console.warn(`   ⚠️  ${pkgJson.name}: ${depName} workspace:* but version not found`)
        }
      }
    }
  }

  if (conversions > 0) {
    // Write back the modified package.json
    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf-8')
    totalConversions += conversions
  }
}

console.log(`\n✅ Converted ${totalConversions} workspace:* dependencies to actual versions\n`)

if (totalConversions === 0) {
  console.log('ℹ️  No workspace:* dependencies found (they may already be converted)\n')
}

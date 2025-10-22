#!/usr/bin/env node
/**
 * Check which dependency mode is currently active
 *
 * This helps you understand what mode your monorepo is in
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const WORKSPACE_PACKAGES = new Set([
  '@laughingwhales/appkit',
  '@laughingwhales/appkit-common',
  '@laughingwhales/appkit-controllers',
  '@laughingwhales/appkit-ui',
  '@laughingwhales/appkit-scaffold-ui',
  '@laughingwhales/appkit-adapter-wagmi',
  '@laughingwhales/appkit-adapter-solana',
  '@laughingwhales/appkit-adapter-bitcoin',
  '@laughingwhales/appkit-adapter-ethers',
  '@laughingwhales/appkit-adapter-polkadot'
])

const CHECK_FILES = [
  'apps/demo/package.json',
  'apps/laboratory/package.json',
  'apps/gallery/package.json'
]

function analyzeDependency(depVersion) {
  if (depVersion === 'workspace:*' || depVersion.startsWith('workspace:')) {
    return { mode: 'workspace', ref: null }
  } else if (depVersion.includes('github.com') || depVersion.includes('api.github.com')) {
    // Extract ref from URL
    const match = depVersion.match(/tarball\/([^#]+)/)
    const ref = match ? match[1] : 'unknown'
    return { mode: 'github', ref }
  } else if (depVersion.match(/^\^?\d+\.\d+\.\d+/)) {
    return { mode: 'version', ref: depVersion }
  }
  return { mode: 'unknown', ref: depVersion }
}

console.log('\n🔍 Checking dependency mode...\n')

const results = {}
let totalChecked = 0

for (const filePath of CHECK_FILES) {
  const fullPath = resolve(__dirname, '..', filePath)

  try {
    const pkgJson = JSON.parse(readFileSync(fullPath, 'utf-8'))
    const modes = {
      workspace: 0,
      github: 0,
      version: 0,
      unknown: 0
    }
    let gitRef = null

    // Check dependencies
    if (pkgJson.dependencies) {
      for (const [depName, depVersion] of Object.entries(pkgJson.dependencies)) {
        if (WORKSPACE_PACKAGES.has(depName)) {
          const analysis = analyzeDependency(depVersion)
          modes[analysis.mode]++
          if (analysis.mode === 'github' && !gitRef) {
            gitRef = analysis.ref
          }
          totalChecked++
        }
      }
    }

    // Check devDependencies
    if (pkgJson.devDependencies) {
      for (const [depName, depVersion] of Object.entries(pkgJson.devDependencies)) {
        if (WORKSPACE_PACKAGES.has(depName)) {
          const analysis = analyzeDependency(depVersion)
          modes[analysis.mode]++
          if (analysis.mode === 'github' && !gitRef) {
            gitRef = analysis.ref
          }
          totalChecked++
        }
      }
    }

    results[filePath] = { modes, gitRef }
  } catch (err) {
    // Skip if file doesn't exist
  }
}

// Determine overall mode
let overallMode = 'unknown'
let isConsistent = true
let overallRef = null

for (const [filePath, result] of Object.entries(results)) {
  const { modes, gitRef } = result

  let fileMode
  if (modes.workspace > 0 && modes.github === 0 && modes.version === 0) {
    fileMode = 'workspace'
  } else if (modes.github > 0 && modes.workspace === 0 && modes.version === 0) {
    fileMode = 'github'
    overallRef = gitRef
  } else if (modes.version > 0 && modes.workspace === 0 && modes.github === 0) {
    fileMode = 'version'
  } else {
    fileMode = 'mixed'
    isConsistent = false
  }

  if (overallMode === 'unknown') {
    overallMode = fileMode
  } else if (overallMode !== fileMode) {
    isConsistent = false
  }

  // Print file status
  const emoji =
    fileMode === 'workspace'
      ? '🏠'
      : fileMode === 'github'
        ? '🐙'
        : fileMode === 'version'
          ? '📦'
          : '⚠️'
  console.log(`${emoji} ${filePath}`)

  if (fileMode === 'mixed') {
    console.log(
      `   ⚠️  MIXED: workspace=${modes.workspace}, github=${modes.github}, version=${modes.version}`
    )
  } else {
    console.log(`   Mode: ${fileMode.toUpperCase()}${gitRef ? ` (ref: ${gitRef})` : ''}`)
  }
  console.log()
}

// Overall summary
console.log('═'.repeat(60))
console.log()

if (!isConsistent) {
  console.log('⚠️  WARNING: Inconsistent dependency modes detected!')
  console.log('   Some files use workspace:*, others use GitHub URLs or versions.')
  console.log('   This may cause issues. Consider running:')
  console.log('   - pnpm deps:workspace (for local development)')
  console.log('   - pnpm deps:github <ref> (for deployment)')
  console.log()
} else {
  console.log(`✅ All dependencies are in ${overallMode.toUpperCase()} mode`)

  if (overallMode === 'workspace') {
    console.log('   👍 Perfect for local development')
    console.log('   💡 To deploy, run: pnpm deps:github <branch>')
  } else if (overallMode === 'github') {
    console.log(`   👍 Pointing to GitHub ref: ${overallRef}`)
    console.log('   💡 To go back to local dev, run: pnpm deps:workspace')
  } else if (overallMode === 'version') {
    console.log('   👍 Using npm version numbers')
    console.log('   💡 To go back to local dev, run: pnpm deps:workspace')
  }
  console.log()
}

console.log(
  `📊 Total checked: ${totalChecked} dependencies across ${Object.keys(results).length} files\n`
)

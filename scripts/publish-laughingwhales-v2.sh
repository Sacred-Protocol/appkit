#!/bin/bash
# Battle-tested publishing script for @laughingwhales packages
# Handles workspace:* conversion and publishes in dependency order
#
# RESUMABLE: If OTP expires or fails, just re-run with new OTP.
# Already-published packages are automatically skipped.

set -e

OTP=$1

# Check if using NPM_TOKEN or OTP
if [ -z "$NPM_TOKEN" ] && [ -z "$OTP" ]; then
  cat << 'EOF'
====================================
@laughingwhales Package Publisher
====================================

Usage (with OTP):
  ./scripts/publish-laughingwhales-v2.sh <otp-code>

Usage (with automation token - RECOMMENDED):
  export NPM_TOKEN="npm_YOUR_TOKEN_HERE"
  ./scripts/publish-laughingwhales-v2.sh

Examples:
  ./scripts/publish-laughingwhales-v2.sh 123456
  
  # OR (no OTP expiry!)
  export NPM_TOKEN="npm_xxxxxxxxxxxx"
  ./scripts/publish-laughingwhales-v2.sh

What this script does:
  1. Auto-detects version from packages/appkit/package.json
  2. Builds all packages
  3. Converts workspace:* to ^VERSION (manual, because pnpm doesn't!)
  4. Publishes in dependency order
  5. Restores workspace:* for local development

Packages published (14 total):
  - appkit-polyfills, wallet, common, controllers, utils
  - ui, scaffold-ui, pay, siwe, siwx, wallet-button
  - appkit (main), adapter-solana, adapter-polkadot

Critical: All packages published at SAME version to avoid semver issues!

To change version: Edit packages/appkit/package.json first, then run this script.
EOF
  exit 1
fi

cd /home/laughingwhales/development/sacred-appkit

# Auto-detect version from appkit package
VERSION=$(grep '"version":' packages/appkit/package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "❌ Error: Could not detect version from packages/appkit/package.json"
  exit 1
fi

echo "======================================"
echo "Publishing @laughingwhales packages"
echo "======================================"
echo "Auto-detected version: v$VERSION"
if [ -n "$NPM_TOKEN" ]; then
  echo "Auth method: NPM_TOKEN (automation token)"
else
  echo "Auth method: OTP ${OTP:0:3}***"
fi
echo ""

# Step 1: Sync all versions to match appkit
echo "🔢 Step 1: Syncing all packages to v$VERSION..."
PACKAGES_TO_BUMP=(
  "polyfills" "common" "wallet" "controllers" "appkit-utils"
  "ui" "scaffold-ui" "pay" "siwe" "siwx" "wallet-button"
  "adapters/solana" "adapters/polkadot"
)

for pkg in "${PACKAGES_TO_BUMP[@]}"; do
  if [ -f "packages/$pkg/package.json" ]; then
    CURRENT=$(grep '"version":' "packages/$pkg/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    if [ "$CURRENT" != "$VERSION" ]; then
      sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "packages/$pkg/package.json"
      echo "  ✓ $pkg: $CURRENT → $VERSION"
    else
      echo "  ✓ $pkg: already $VERSION"
    fi
  fi
done
echo ""

# Step 2: Build
echo "🔨 Step 2: Building all packages..."
pnpm build:all
echo "   ✅ Build complete!"
echo ""

echo "Press Enter to start publishing or Ctrl+C to cancel..."
read

# Step 3: Convert workspace:*
echo ""
echo "🔄 Step 3: Converting workspace:* to ^$VERSION..."
node convert-workspace-deps.js
echo ""

# Step 4: Publish in dependency order
echo "======================================"
echo "📦 Step 4: Publishing packages"
echo "======================================"

PACKAGES=(
  "packages/polyfills:@laughingwhales/appkit-polyfills"
  "packages/wallet:@laughingwhales/appkit-wallet"
  "packages/common:@laughingwhales/appkit-common"
  "packages/controllers:@laughingwhales/appkit-controllers"
  "packages/appkit-utils:@laughingwhales/appkit-utils"
  "packages/ui:@laughingwhales/appkit-ui"
  "packages/scaffold-ui:@laughingwhales/appkit-scaffold-ui"
  "packages/pay:@laughingwhales/appkit-pay"
  "packages/siwe:@laughingwhales/appkit-siwe"
  "packages/siwx:@laughingwhales/appkit-siwx"
  "packages/wallet-button:@laughingwhales/appkit-wallet-button"
  "packages/appkit:@laughingwhales/appkit"
  "packages/adapters/solana:@laughingwhales/appkit-adapter-solana"
  "packages/adapters/polkadot:@laughingwhales/appkit-adapter-polkadot"
)

SUCCESS=0
TOTAL=${#PACKAGES[@]}
SKIPPED=0

for pkg_info in "${PACKAGES[@]}"; do
  IFS=':' read -r pkg_dir PKG_NAME <<< "$pkg_info"
  
  echo ""
  echo "[$((SUCCESS + SKIPPED + 1))/$TOTAL] $PKG_NAME@$VERSION"
  
  # Check if already published
  if npm view "$PKG_NAME@$VERSION" version &>/dev/null; then
    echo "   ⏭️  Already published, skipping..."
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  cd "$pkg_dir"
  
  # Publish and capture output
  unset CI GITHUB_ACTIONS
  if [ -n "$NPM_TOKEN" ]; then
    # Use automation token (no OTP needed)
    PUBLISH_OUTPUT=$(pnpm publish --access public --no-git-checks --no-provenance 2>&1)
  else
    # Use OTP
    PUBLISH_OUTPUT=$(pnpm publish --access public --no-git-checks --no-provenance --otp="$OTP" 2>&1)
  fi
  PUBLISH_EXIT=$?
  
  # Check for success (either exit 0 or successful publish message)
  if [ $PUBLISH_EXIT -eq 0 ] || echo "$PUBLISH_OUTPUT" | grep -q "^+ @laughingwhales"; then
    echo "   ✅ Published!"
    SUCCESS=$((SUCCESS + 1))
    sleep 2  # Avoid rate limiting
  else
    echo "   ❌ FAILED!"
    echo ""
    echo "$PUBLISH_OUTPUT" | tail -10
    echo ""
    echo "======================================"
    echo "🛑 HALTED at $PKG_NAME"
    echo "======================================"
    echo "Progress: $SUCCESS / $TOTAL published successfully"
    echo ""
    echo "🔄 To resume with new OTP:"
    echo "   ./scripts/publish-laughingwhales-v2.sh <new-otp>"
    echo ""
    echo "✅ Already published (will skip on resume):"
    for i in $(seq 0 $((SUCCESS - 1))); do
      prev_info="${PACKAGES[$i]}"
      IFS=':' read -r _ prev_name <<< "$prev_info"
      echo "   - $prev_name"
    done
    echo ""
    cd /home/laughingwhales/development/sacred-appkit
    exit 1
  fi
  
  cd /home/laughingwhales/development/sacred-appkit
done

# Step 5: Restore workspace:*
echo ""
echo "======================================"
echo "🔄 Step 5: Restoring workspace:*"
echo "======================================"
node restore-workspace-deps.js

echo ""
echo "======================================"
echo "✅ COMPLETE!"
echo "======================================"
echo "Published: $SUCCESS packages"
echo "Skipped: $SKIPPED packages (already published)"
echo "Total: $((SUCCESS + SKIPPED)) / $TOTAL"
echo ""
echo "📝 Verify on npm:"
echo "   npm view @laughingwhales/appkit@$VERSION dependencies"
echo ""


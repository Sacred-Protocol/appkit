#!/bin/bash
# Publish only @laughingwhales packages
# This script is designed to only publish packages under your control

set -e

OTP=$1
NEW_VERSION=$2

if [ -z "$OTP" ] || [ -z "$NEW_VERSION" ]; then
  cat << 'EOF'
📦 @laughingwhales Package Publishing Script

Usage: ./scripts/publish-laughingwhales.sh <otp-code> <new-version>

Examples:
  ./scripts/publish-laughingwhales.sh 123456 1.8.13
  ./scripts/publish-laughingwhales.sh 123456 1.8.13-alpha.1

Your @laughingwhales packages:
  - @laughingwhales/appkit
  - @laughingwhales/appkit-adapter-polkadot
  - @laughingwhales/appkit-adapter-solana
  - @laughingwhales/appkit-common
  - @laughingwhales/appkit-scaffold-ui
  - @laughingwhales/appkit-siwx
  - @laughingwhales/appkit-ui
  - @laughingwhales/appkit-wallet-button

Features:
  ✅ Only publishes @laughingwhales packages
  ✅ Auto-checks which packages need publishing
  ✅ Bumps version before publishing
  ✅ Sequential publishing (avoids OTP rate limits)
  ✅ Fully resumable

EOF
  exit 1
fi

cd /home/laughingwhales/development/sacred-appkit

echo "📦 Publishing @laughingwhales packages"
echo "   Version: $NEW_VERSION"
echo ""

# List of @laughingwhales packages (in dependency order)
LAUGHINGWHALES_PACKAGES=(
  "packages/polyfills"
  "packages/common"
  "packages/wallet"
  "packages/controllers"
  "packages/appkit-utils"
  "packages/ui"
  "packages/universal-connector"
  "packages/scaffold-ui"
  "packages/pay"
  "packages/siwe"
  "packages/siwx"
  "packages/wallet-button"
  "packages/experimental"
  "packages/core-legacy"
  "packages/testing"
  "packages/appkit"
  "packages/adapters/ethers5"
  "packages/adapters/ethers"
  "packages/adapters/wagmi"
  "packages/adapters/bitcoin"
  "packages/adapters/solana"
  "packages/adapters/polkadot"
  "packages/cdn"
  "packages/cli"
  "packages/codemod"
)

echo "🔍 Checking which packages need publishing..."
echo ""

PENDING=()
ALREADY_PUBLISHED=()

for pkg_dir in "${LAUGHINGWHALES_PACKAGES[@]}"; do
  if [ ! -f "$pkg_dir/package.json" ]; then
    echo "⚠️  Skipping $pkg_dir - package.json not found"
    continue
  fi
  
  PKG_NAME=$(cat "$pkg_dir/package.json" | grep '"name"' | head -1 | cut -d'"' -f4)
  
  # Check if this version already exists on npm
  if npm view "$PKG_NAME@$NEW_VERSION" version &>/dev/null; then
    ALREADY_PUBLISHED+=("$PKG_NAME")
    echo "✅ $PKG_NAME@$NEW_VERSION - already published"
  else
    PENDING+=("$pkg_dir:$PKG_NAME")
    echo "📦 $PKG_NAME@$NEW_VERSION - needs publishing"
  fi
done

echo ""
echo "📊 Status:"
echo "   ✅ Already published: ${#ALREADY_PUBLISHED[@]}"
echo "   📦 To publish: ${#PENDING[@]}"
echo ""

if [ ${#PENDING[@]} -eq 0 ]; then
  echo "🎉 All packages already published at version $NEW_VERSION!"
  exit 0
fi

read -p "📝 Bump version to $NEW_VERSION and publish ${#PENDING[@]} packages? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted"
  exit 1
fi

echo ""
echo "🔨 Building packages..."
pnpm build:all

echo ""
echo "🚀 Publishing ${#PENDING[@]} packages sequentially..."
echo ""

SUCCESS=0
for pkg_info in "${PENDING[@]}"; do
  IFS=':' read -r pkg_dir PKG_NAME <<< "$pkg_info"
  
  echo "📦 Publishing $PKG_NAME@$NEW_VERSION..."
  cd "$pkg_dir"
  
  # Bump version in package.json
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
  else
    # Linux
    sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
  fi
  
  # Publish using pnpm
  unset CI GITHUB_ACTIONS
  if pnpm publish --access public --no-git-checks --otp="$OTP" 2>&1 | grep -E "^\+|Published|error" | head -3; then
    echo "   ✅ Success!"
    SUCCESS=$((SUCCESS + 1))
    sleep 2  # Avoid rate limiting
  else
    echo ""
    echo "❌ Failed at $PKG_NAME"
    echo ""
    echo "Progress: $SUCCESS / ${#PENDING[@]} published"
    echo ""
    echo "To resume: bash scripts/publish-laughingwhales.sh <new-otp> $NEW_VERSION"
    exit 1
  fi
  
  cd /home/laughingwhales/development/sacred-appkit
done

echo ""
echo "🎉 SUCCESS! Published $SUCCESS @laughingwhales packages at version $NEW_VERSION!"
echo ""
echo "Next steps:"
echo "  1. Commit the version changes: git add -A && git commit -m 'chore: bump version to $NEW_VERSION'"
echo "  2. Tag the release: git tag v$NEW_VERSION"
echo "  3. Push: git push && git push --tags"


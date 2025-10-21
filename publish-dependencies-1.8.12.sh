#!/bin/bash
set -e

VERSION="1.8.2"
OTP=$1

if [ -z "$OTP" ]; then
  echo "❌ Error: OTP code required"
  echo "Usage: ./publish-dependencies-1.8.2.sh <otp-code>"
  exit 1
fi

cd /home/laughingwhales/development/sacred-appkit

echo "======================================"
echo "Publishing dependency packages at v1.8.2"
echo "======================================"
echo ""
echo "These are needed for v1.8.2 packages to work:"
echo "  - @laughingwhales/appkit-polyfills@1.8.2"
echo "  - @laughingwhales/appkit-wallet@1.8.2"
echo "  - @laughingwhales/appkit-utils@1.8.2"
echo "  - @laughingwhales/appkit-pay@1.8.2"
echo "  - @laughingwhales/appkit-siwe@1.8.2"
echo ""
echo "Press Enter to continue..."
read

echo ""
echo "🔄 Converting workspace:* (if any)..."
node convert-workspace-deps.js

PACKAGES=(
  "packages/polyfills:@laughingwhales/appkit-polyfills"
  "packages/wallet:@laughingwhales/appkit-wallet"
  "packages/appkit-utils:@laughingwhales/appkit-utils"
  "packages/pay:@laughingwhales/appkit-pay"
  "packages/siwe:@laughingwhales/appkit-siwe"
)

SUCCESS=0
TOTAL=${#PACKAGES[@]}

for pkg_info in "${PACKAGES[@]}"; do
  IFS=':' read -r pkg_dir PKG_NAME <<< "$pkg_info"
  
  echo ""
  echo "[$((SUCCESS + 1))/$TOTAL] Publishing: $PKG_NAME@$VERSION"
  
  # Check if already published
  if npm view "$PKG_NAME@$VERSION" version &>/dev/null; then
    echo "⚠️  Already published, skipping..."
    SUCCESS=$((SUCCESS + 1))
    continue
  fi
  
  cd "$pkg_dir"
  
  unset CI GITHUB_ACTIONS
  if pnpm publish --access public --no-git-checks --no-provenance --otp="$OTP" 2>&1; then
    echo "   ✅ Success!"
    SUCCESS=$((SUCCESS + 1))
    sleep 2
  else
    echo "   ❌ Failed!"
  fi
  
  cd /home/laughingwhales/development/sacred-appkit
done

echo ""
echo "🔄 Restoring workspace:*..."
node restore-workspace-deps.js

echo ""
echo "======================================"
echo "✅ Published $SUCCESS / $TOTAL packages"
echo "======================================"


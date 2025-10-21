#!/bin/bash
set -e

VERSION="1.8.12"

echo "Bumping all @laughingwhales packages to $VERSION..."

# List of packages in dependency order
PACKAGES=(
  "packages/polyfills"
  "packages/common"
  "packages/wallet"
  "packages/controllers"
  "packages/appkit-utils"
  "packages/ui"
  "packages/scaffold-ui"
  "packages/pay"
  "packages/siwe"
  "packages/siwx"
  "packages/wallet-button"
  "packages/adapters/bitcoin"
  "packages/adapters/ethers5"
  "packages/adapters/ethers"
  "packages/adapters/polkadot"
  "packages/adapters/solana"
  "packages/adapters/wagmi"
  "packages/appkit"
  "packages/cdn"
)

for pkg in "${PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ]; then
    NAME=$(grep '"name":' "$pkg/package.json" | head -1 | cut -d'"' -f4)
    if [[ "$NAME" == @laughingwhales/* ]]; then
      echo "Updating $NAME to $VERSION"
      sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$pkg/package.json"
    fi
  fi
done

echo "✅ All versions bumped to $VERSION"


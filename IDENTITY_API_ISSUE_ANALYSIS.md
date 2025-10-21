# WalletConnect Identity API Call Analysis

## Issue Summary

When connecting to Polkadot using SubWallet, AppKit makes an API call to:

```
GET https://rpc.walletconnect.org/v1/identity/5FcWU3f2TFcnd218wsVdx3iiPCH6MJvnQQxgj1mgo6XxZ99i
```

This call fails with **400 Bad Request** because the WalletConnect Identity API only supports EVM addresses, not Polkadot SS58-encoded addresses.

## Call Stack

```
Polkadot Connection (SubWallet)
  └─> PolkadotAdapter.connect() emits 'accountChanged' event
      └─> AppKit.syncAccount() [appkit-base-client.ts:1627]
          └─> AppKit.syncAccountInfo() [appkit-base-client.ts:1644]
              └─> AppKit.syncIdentity() [appkit-base-client.ts:1658]
                  └─> AppKit.syncIdentity() [appkit.ts:549]
                      └─> AppKit.fetchIdentity() [appkit-base-client.ts:2145]
                          └─> BlockchainApiController.fetchIdentity() [BlockchainApiController.ts:200]
                              └─> GET /v1/identity/{address} ❌ 400 Bad Request
```

## Root Cause

### Location: `packages/appkit/src/client/appkit.ts` (lines 530-564)

```typescript
public override async syncIdentity({
  address,
  chainId,
  chainNamespace
}: Pick<AdapterBlueprint.ConnectResult, 'address' | 'chainId'> & {
  chainNamespace: ChainNamespace
}): Promise<void> {
  const caipNetworkId: CaipNetworkId = `${chainNamespace}:${chainId}`
  const activeCaipNetwork = this.caipNetworks?.find(n => n.caipNetworkId === caipNetworkId)

  if (activeCaipNetwork?.testnet) {
    this.setProfileName(null, chainNamespace)
    this.setProfileImage(null, chainNamespace)
    return
  }

  const isAuthConnector =
    ConnectorController.getConnectorId(chainNamespace) === ConstantsUtil.CONNECTOR_ID.AUTH

  try {
    // ❌ THIS IS THE PROBLEM: fetchIdentity is called for ALL namespaces
    const { name, avatar } = await this.fetchIdentity({
      address
    })

    if (!name && isAuthConnector) {
      await this.syncReownName(address, chainNamespace)
    } else {
      this.setProfileName(name, chainNamespace)
      this.setProfileImage(avatar, chainNamespace)
    }
  } catch {
    if (chainId !== 1) {
      this.setProfileImage(null, chainNamespace)
    }
  }
}
```

**The Issue**: The method calls `fetchIdentity` for **all chain namespaces** without checking if the namespace is supported by the WalletConnect Identity API.

## API Endpoint Details

### File: `packages/controllers/src/controllers/BlockchainApiController.ts` (line 200-207)

```typescript
const result = await BlockchainApiController.get<BlockchainApiIdentityResponse>({
  path: `/v1/identity/${address}`,
  params: {
    sender: ChainController.state.activeCaipAddress
      ? CoreHelperUtil.getPlainAddress(ChainController.state.activeCaipAddress)
      : undefined
  }
})
```

This endpoint (`/v1/identity/{address}`) is part of the WalletConnect/Reown Blockchain API and is designed for:

- **Supported**: EVM addresses (0x... format) - eip155 namespace
- **NOT Supported**:
  - Solana addresses (base58)
  - Bitcoin addresses (base58/bech32)
  - Polkadot addresses (SS58 encoding)

## Why It Fails

Polkadot addresses use **SS58 encoding** (e.g., `5FcWU3f2TFcnd218wsVdx3iiPCH6MJvnQQxgj1mgo6XxZ99i`), which the WalletConnect Identity API doesn't recognize, resulting in a 400 Bad Request.

## Trigger Points

The `syncIdentity` method is called from multiple locations:

1. **appkit-base-client.ts:814** - During ENS avatar sync
2. **appkit-base-client.ts:1252** - During account sync (non-active chain)
3. **appkit-base-client.ts:1255** - During account sync (active chain)
4. **appkit-base-client.ts:1636** - After balance sync
5. **appkit-base-client.ts:1658** - In syncAccountInfo method

All of these trigger for **any namespace**, including Polkadot, Solana, and Bitcoin.

## Solution

### Recommended Fix

Add a namespace check before calling `fetchIdentity` to only execute for EVM chains:

```typescript
public override async syncIdentity({
  address,
  chainId,
  chainNamespace
}: Pick<AdapterBlueprint.ConnectResult, 'address' | 'chainId'> & {
  chainNamespace: ChainNamespace
}): Promise<void> {
  const caipNetworkId: CaipNetworkId = `${chainNamespace}:${chainId}`
  const activeCaipNetwork = this.caipNetworks?.find(n => n.caipNetworkId === caipNetworkId)

  if (activeCaipNetwork?.testnet) {
    this.setProfileName(null, chainNamespace)
    this.setProfileImage(null, chainNamespace)
    return
  }

  // ✅ ADD THIS CHECK: Only fetch identity for EVM chains
  if (chainNamespace !== CommonConstantsUtil.CHAIN.EVM) {
    this.setProfileName(null, chainNamespace)
    this.setProfileImage(null, chainNamespace)
    return
  }

  const isAuthConnector =
    ConnectorController.getConnectorId(chainNamespace) === ConstantsUtil.CONNECTOR_ID.AUTH

  try {
    const { name, avatar } = await this.fetchIdentity({
      address
    })

    if (!name && isAuthConnector) {
      await this.syncReownName(address, chainNamespace)
    } else {
      this.setProfileName(name, chainNamespace)
      this.setProfileImage(avatar, chainNamespace)
    }
  } catch {
    if (chainId !== 1) {
      this.setProfileImage(null, chainNamespace)
    }
  }
}
```

### Alternative: Handle in fetchIdentity

Add namespace validation in `BlockchainApiController.fetchIdentity`:

```typescript
async fetchIdentity(address: string, chainNamespace?: ChainNamespace) {
  // Only support EVM addresses
  if (chainNamespace && chainNamespace !== 'eip155') {
    return { name: null, avatar: null }
  }

  // ... existing code
}
```

## Impact

### Current Behavior

- ❌ API call fails with 400 for Polkadot, Solana, Bitcoin addresses
- ❌ Error logged in console
- ❌ Unnecessary network request
- ✅ App still works (error is caught and handled)

### After Fix

- ✅ No API call for non-EVM namespaces
- ✅ Cleaner console output
- ✅ Reduced network traffic
- ✅ Proper separation of concerns

## Related Files

1. **Main Issue**: `packages/appkit/src/client/appkit.ts:530-564`
2. **API Call**: `packages/controllers/src/controllers/BlockchainApiController.ts:200-207`
3. **Base Class**: `packages/appkit/src/client/appkit-base-client.ts:1299` (abstract declaration)
4. **Trigger Points**: `packages/appkit/src/client/appkit-base-client.ts:1627, 1636, 1658`

## Testing Recommendation

After implementing the fix, verify:

1. ✅ Polkadot connection doesn't trigger identity API call
2. ✅ Solana connection doesn't trigger identity API call
3. ✅ Bitcoin connection doesn't trigger identity API call
4. ✅ EVM connection DOES trigger identity API call (regression test)
5. ✅ Profile name/avatar still works correctly for EVM addresses

## Additional Context

The Identity API is used to fetch:

- ENS names
- ENS avatars
- Other on-chain identity information

This functionality is specific to Ethereum and EVM chains. Other chains have their own identity systems:

- **Polkadot**: On-chain identity pallet
- **Solana**: SNS (Solana Name Service)
- **Bitcoin**: No native identity system

Supporting these would require separate API integrations specific to each chain.

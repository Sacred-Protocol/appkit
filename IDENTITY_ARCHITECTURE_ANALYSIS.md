# Identity Architecture Analysis

## Current State: How Non-EVM Chains Handle Identity

### Architecture Overview

```
AppKit.syncIdentity() [appkit.ts]
  ├─> calls this.fetchIdentity(address)
  │   └─> BlockchainApiController.fetchIdentity()
  │       └─> GET /v1/identity/{address} (EVM-only API)
  │
  └─> Applied to ALL namespaces (eip155, solana, bip122, polkadot)
```

### Key Files

1. **`packages/appkit/src/client/appkit-base-client.ts:2144-2145`**

   ```typescript
   public fetchIdentity: (typeof BlockchainApiController)['fetchIdentity'] = request =>
     BlockchainApiController.fetchIdentity(request)
   ```

   - Simple passthrough method
   - NO namespace awareness
   - Just delegates to BlockchainApiController

2. **`packages/controllers/src/controllers/BlockchainApiController.ts:194-216`**

   ```typescript
   async fetchIdentity({ address }: BlockchainApiIdentityRequest) {
     const result = await BlockchainApiController.get<BlockchainApiIdentityResponse>({
       path: `/v1/identity/${address}`,
       params: { sender: ... }
     })
     return result
   }
   ```

   - Generic HTTP API call
   - NO chain/namespace logic
   - Calls WalletConnect/Reown API (EVM-only)

3. **`packages/appkit/src/client/appkit.ts:528-564`**

   ```typescript
   public override async syncIdentity({ address, chainId, chainNamespace }) {
     // Skip testnets
     if (activeCaipNetwork?.testnet) {
       this.setProfileName(null, chainNamespace)
       this.setProfileImage(null, chainNamespace)
       return
     }

     try {
       // ❌ This is called for ALL namespaces!
       const { name, avatar } = await this.fetchIdentity({ address })

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

   - **This is where namespace logic SHOULD be**
   - Currently calls `fetchIdentity` for ALL chains
   - Catches errors silently (400s from Polkadot/Solana/Bitcoin)

## How Solana & Bitcoin Currently Work

### Solana

- ❌ **DOES call** `fetchIdentity` when connecting
- ❌ **DOES fail** with 400 Bad Request (Solana addresses not supported)
- ✅ **Error is caught** and silently ignored
- ✅ **Result**: No profile name/avatar (which is fine - no SNS integration)

### Bitcoin

- ❌ **DOES call** `fetchIdentity` when connecting
- ❌ **DOES fail** with 400 Bad Request (Bitcoin addresses not supported)
- ✅ **Error is caught** and silently ignored
- ✅ **Result**: No profile name/avatar (which is fine - no naming system)

### Polkadot

- ❌ **DOES call** `fetchIdentity` when connecting
- ❌ **DOES fail** with 400 Bad Request (Polkadot addresses not supported)
- ✅ **Error is caught** and silently ignored
- ✅ **Result**: No profile name/avatar (even though Polkadot HAS on-chain identity!)

## The Pattern

**ALL non-EVM chains currently:**

1. Make unnecessary API calls to WalletConnect identity endpoint
2. Get 400 errors logged in console
3. Silently ignore errors
4. End up with no profile name/avatar

**This works, but it's inefficient and noisy.**

## The Right Solution

### Option 1: Namespace Check (Minimal Change)

Add a simple guard in `syncIdentity`:

```typescript
public override async syncIdentity({ address, chainId, chainNamespace }) {
  // Skip testnets
  if (activeCaipNetwork?.testnet) {
    this.setProfileName(null, chainNamespace)
    this.setProfileImage(null, chainNamespace)
    return
  }

  // ✅ ADD THIS: Only fetch identity for EVM chains
  if (chainNamespace !== CommonConstantsUtil.CHAIN.EVM) {
    this.setProfileName(null, chainNamespace)
    this.setProfileImage(null, chainNamespace)
    return
  }

  // ... rest of EVM-specific logic
}
```

**Pros:**

- ✅ Stops unnecessary API calls
- ✅ No console errors
- ✅ Minimal code change
- ✅ Matches current behavior for Solana/Bitcoin

**Cons:**

- ❌ No support for Polkadot on-chain identity
- ❌ No support for SNS (Solana Name Service)

### Option 2: Adapter-Provided Identity (Future-Proof)

Create an adapter interface for identity lookups:

```typescript
// In ChainAdapterBlueprint.ts
export abstract class AdapterBlueprint {
  // Optional: Adapters can implement their own identity lookup
  public async fetchIdentity?(params: {
    address: string
  }): Promise<{ name: string | null; avatar: string | null }>

  // ... existing methods
}

// In PolkadotAdapter
export class PolkadotAdapter extends AdapterBlueprint {
  public async fetchIdentity(params: { address: string }) {
    const api = await this.getApi(/* current network */)
    const identity = await api.query.identity.identityOf(params.address)

    if (identity.isSome) {
      const data = identity.unwrap()
      return {
        name: data.display.asText.toString() || null,
        avatar: null // Could fetch from IPFS if riot.im field exists
      }
    }

    return { name: null, avatar: null }
  }
}

// In appkit.ts syncIdentity
public override async syncIdentity({ address, chainId, chainNamespace }) {
  // Skip testnets
  if (activeCaipNetwork?.testnet) {
    this.setProfileName(null, chainNamespace)
    this.setProfileImage(null, chainNamespace)
    return
  }

  try {
    const adapter = this.getAdapterForNamespace(chainNamespace)
    let name = null
    let avatar = null

    // Use adapter-specific identity if available
    if (adapter?.fetchIdentity) {
      ({ name, avatar } = await adapter.fetchIdentity({ address }))
    }
    // Fallback to EVM/WalletConnect API
    else if (chainNamespace === CommonConstantsUtil.CHAIN.EVM) {
      ({ name, avatar } = await this.fetchIdentity({ address }))
    }

    this.setProfileName(name, chainNamespace)
    this.setProfileImage(avatar, chainNamespace)
  } catch {
    this.setProfileImage(null, chainNamespace)
  }
}
```

**Pros:**

- ✅ Future-proof architecture
- ✅ Enables Polkadot on-chain identity
- ✅ Enables SNS for Solana
- ✅ Chain-agnostic design
- ✅ Adapters own their identity logic

**Cons:**

- ❌ More code to write
- ❌ Requires changes across adapters
- ❌ More complexity

## Recommendation

**Start with Option 1 (Namespace Check)** because:

1. It's the minimal fix that solves the immediate problem
2. Matches how Solana and Bitcoin already work
3. Stops unnecessary 400 errors in console
4. Can be enhanced later with Option 2 when needed

**Upgrade to Option 2** when:

- Someone actually wants Polkadot on-chain identity
- SNS integration is requested for Solana
- Other chains need custom identity systems

## Implementation

### File to Modify

`packages/appkit/src/client/appkit.ts`

### Change

```diff
  public override async syncIdentity({
    address,
    chainId,
    chainNamespace
  }: Pick<AdapterBlueprint.ConnectResult, 'address' | 'chainId'> & {
    chainNamespace: ChainNamespace
  }) {
    const caipNetworkId: CaipNetworkId = `${chainNamespace}:${chainId}`
    const activeCaipNetwork = this.caipNetworks?.find(n => n.caipNetworkId === caipNetworkId)

    if (activeCaipNetwork?.testnet) {
      this.setProfileName(null, chainNamespace)
      this.setProfileImage(null, chainNamespace)
      return
    }

+   // Only fetch identity for EVM chains (WalletConnect API only supports EVM)
+   if (chainNamespace !== CommonConstantsUtil.CHAIN.EVM) {
+     this.setProfileName(null, chainNamespace)
+     this.setProfileImage(null, chainNamespace)
+     return
+   }

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

## Testing

After implementing, verify:

1. ✅ EVM connections STILL fetch identity from WalletConnect API
2. ✅ Polkadot connections DON'T call identity API (no 400 error)
3. ✅ Solana connections DON'T call identity API (no 400 error)
4. ✅ Bitcoin connections DON'T call identity API (no 400 error)
5. ✅ Profile names/avatars still work for EVM addresses with ENS

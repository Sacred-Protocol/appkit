# AssetHub WebSocket Disconnection Fix

## Problem

AssetHub was experiencing WebSocket disconnection errors (Error 1006: Abnormal Closure) while connecting to `wss://statemint-rpc.polkadot.io`, while Polkadot relay chain worked fine with `wss://rpc.polkadot.io`.

### Error Message

```
"API-WS:" "disconnected from wss://statemint-rpc.polkadot.io: 1006:: Abnormal Closure"
```

### Root Cause

1. The `wss://statemint-rpc.polkadot.io` endpoint was unreliable/unstable
2. No fallback RPC endpoints were configured
3. The Polkadot adapter had no retry logic for failed WebSocket connections
4. Cached API instances weren't checked for disconnection before reuse

## Solution

### 1. Added Fallback RPC Endpoints

Updated AssetHub network configuration in two files to include multiple fallback endpoints:

**Files Modified:**

- `packages/appkit/src/networks/polkadot/assetHub.ts`
- `packages/adapters/polkadot/src/utils/networks.ts`

**New Endpoint Configuration:**

```typescript
webSocket: [
  'wss://sys.ibp.network/statemint', // IBP (Internet Based Providers) - Primary fallback
  'wss://statemint-rpc.polkadot.io', // Parity official (kept as secondary)
  'wss://polkadot-asset-hub-rpc.polkadot.io' // Alternative Parity endpoint
]
```

### 2. Implemented Endpoint Retry Logic

Enhanced the Polkadot adapter with automatic fallback capability:

**File Modified:** `packages/adapters/polkadot/src/adapter.ts`

#### Changes:

**a) New `resolveWsUrls()` method**

- Returns **all** available WebSocket URLs (instead of just the first one)
- Collects URLs from both `default` and `public` RPC configurations
- Removes duplicates
- Supports wss:// URLs in http arrays for flexibility

**b) Enhanced `getApi()` method**

- **Connection Validation**: Checks if cached API is still connected before reusing
- **Automatic Retry**: Tries each endpoint sequentially until one succeeds
- **Better Error Handling**: Uses `autoConnect = false` for WsProvider to improve error detection
- **Connection Verification**: Waits for `api.isReady` to ensure the connection is fully established
- **Informative Logging**: Logs which endpoint succeeded and why others failed

#### Algorithm:

```typescript
1. Check cache for existing API
   ├─ If cached AND connected → Use it
   └─ If cached BUT disconnected → Remove from cache, reconnect

2. Get all WebSocket URLs for the network

3. For each URL (in order):
   ├─ Try to create WsProvider
   ├─ Try to create ApiPromise
   ├─ Wait for isReady
   ├─ If success → Cache and return
   └─ If failure → Log warning, try next URL

4. If all URLs fail → Throw error with details
```

## Benefits

1. **Reliability**: Automatically switches to working endpoints when one fails
2. **Resilience**: Handles temporary network issues gracefully
3. **Performance**: Maintains cache validation to avoid stale connections
4. **Transparency**: Detailed logging helps debug connection issues
5. **Backward Compatibility**: Doesn't break existing code

## Testing

Both packages successfully compiled with no errors:

```bash
✓ @laughingwhales/appkit-adapter-polkadot build successful
✓ @laughingwhales/appkit build successful
```

## Expected Behavior After Fix

When connecting to AssetHub:

1. **First Attempt**: Tries `wss://sys.ibp.network/statemint` (IBP endpoint)
   - If successful → Uses this endpoint
2. **Second Attempt**: If IBP fails, tries `wss://statemint-rpc.polkadot.io`
   - If successful → Uses this endpoint
3. **Third Attempt**: If both fail, tries `wss://polkadot-asset-hub-rpc.polkadot.io`
   - If successful → Uses this endpoint
4. **All Failed**: Only throws error if all three endpoints fail

## Files Changed

1. `packages/appkit/src/networks/polkadot/assetHub.ts` - Added fallback endpoints
2. `packages/adapters/polkadot/src/utils/networks.ts` - Added fallback endpoints
3. `packages/adapters/polkadot/src/adapter.ts` - Implemented retry logic

## Next Steps

Users should:

1. Clear any cached API instances if they were experiencing issues
2. The adapter will now automatically handle endpoint failover
3. Monitor logs to see which endpoint is being used successfully

## Technical Notes

- The fix uses the same fallback pattern as EVM chains in the codebase
- The IBP endpoint (`wss://sys.ibp.network/statemint`) is prioritized as it's known for reliability
- The original Parity endpoint is kept as a fallback for compatibility
- All WebSocket providers now use `autoConnect = false` for better error handling
- Connection state is validated before using cached API instances

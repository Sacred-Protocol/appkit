# Log Investigation Report

## Overview

This document traces the source and trigger points of the logs observed during the demo application startup.

---

## 1. PolkadotAdapter Logs

### Trigger Flow:

```
Demo App Startup (http://localhost:3001)
  └─> appkit-provider.tsx (line 18)
      └─> createAppKit(appKitConfigs)
          └─> config.ts (line 75-77)
              └─> new PolkadotAdapter({ appName: 'AppKit Builder' })
                  └─> packages/adapters/polkadot/src/adapter.ts
```

### Log Locations:

#### Constructor Logs

**File**: `packages/adapters/polkadot/src/adapter.ts`

| Line | Log Message                                   | Trigger Point                                             |
| ---- | --------------------------------------------- | --------------------------------------------------------- |
| 98   | `[PolkadotAdapter] CONSTRUCTED with options:` | Constructor (called when adapter instance is created)     |
| 99   | `[PolkadotAdapter] namespace:`                | Constructor (shows the namespace: 'polkadot')             |
| 100  | `[PolkadotAdapter] adapterType:`              | Constructor (shows the adapter type: 'polkadot-injected') |

**When**: These logs fire immediately when the demo app loads because the adapter is instantiated in `lib/config.ts` at module load time.

#### syncConnectors() Logs

**File**: `packages/adapters/polkadot/src/adapter.ts`

| Line | Log Message                                       | Trigger Point                 |
| ---- | ------------------------------------------------- | ----------------------------- |
| 269  | `[PolkadotAdapter] syncConnectors() called`       | Method entry                  |
| 271  | `[PolkadotAdapter] window is undefined, skipping` | SSR/Node.js environment check |

**When**: `syncConnectors()` is called by AppKit during initialization to detect installed wallet extensions. During server-side rendering (Next.js), `window` is undefined, so it logs the skip message.

**Note**: The adapter has 110 console.log statements throughout, providing extensive debugging information for:

- Connection flow (lines 431-665)
- Account subscription (lines 207-258)
- Balance queries (lines 753-811)
- Network switching (lines 985-1012)
- API connections (lines 1088-1135)

---

## 2. Lit Dev Mode Warning

### Log Message:

```
Lit is in dev mode. Not recommended for production! See https://lit.dev/msg/dev-mode for more information.
```

**Source**: This comes from the Lit library (Web Components framework used by AppKit UI)

**Trigger**: Lit automatically detects when it's running in development mode (NODE_ENV !== 'production') and emits this warning.

**Location**: Internal to `@lit` packages used by:

- `@laughingwhales/appkit-ui` (Web Components)
- `@laughingwhales/appkit-scaffold-ui` (Modal/UI flows)

**When**: First time any Lit component is loaded/rendered

**Solution**: This warning will disappear in production builds.

---

## 3. BigInt Bindings Warning

### Log Message:

```
bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)
```

**Source**: Polkadot.js libraries (`@polkadot/util`, `@polkadot/util-crypto`)

**Trigger**: The Polkadot.js library tries to load native bindings for performance but falls back to pure JavaScript when the native bindings aren't available.

**When**: First time Polkadot crypto/utility functions are initialized

**Context**: This happens during the Polkadot adapter initialization when it loads the extension-dapp library.

**Impact**: Non-critical - the library works fine with pure JS, just slightly slower for cryptographic operations.

**Location**: Deep in `@polkadot/util-crypto` package initialization, specifically when trying to load native WebAssembly/native bindings.

---

## 4. Next.js Server Logs

### Log Messages:

```
⚠ Port 3000 is in use, trying 3001 instead.
▲ Next.js 14.2.32
- Local:        http://localhost:3001
```

**Source**: Next.js framework

**When**: Application startup

**Reason**: Port 3000 was already occupied (likely by another process or previous demo instance), so Next.js automatically used port 3001.

---

## Configuration File Locations

### Key Files:

1. **Adapter Instantiation**: `apps/demo/lib/config.ts`

   - Line 75-77: PolkadotAdapter creation
   - Line 78: All adapters array (includes polkadot)

2. **AppKit Creation**: `apps/demo/providers/appkit-provider.tsx`

   - Line 18: `createAppKit(appKitConfigs)` - triggers adapter initialization

3. **Adapter Implementation**: `packages/adapters/polkadot/src/adapter.ts`
   - Constructor: Lines 71-101
   - syncConnectors: Lines 268-428

---

## Execution Timeline

```
1. Next.js app starts (SSR)
   ├─> Loads appkit-provider.tsx
   ├─> Imports config.ts
   ├─> Creates adapter instances:
   │   ├─> EthersAdapter (no console logs)
   │   ├─> SolanaAdapter (no console logs)
   │   ├─> BitcoinAdapter (no console logs)
   │   └─> PolkadotAdapter (LOGS: CONSTRUCTED, namespace, adapterType)
   │
   ├─> Calls createAppKit()
   │   └─> AppKit initialization
   │       └─> Calls syncConnectors() on all adapters
   │           └─> PolkadotAdapter.syncConnectors()
   │               ├─> LOGS: "syncConnectors() called"
   │               └─> LOGS: "window is undefined, skipping" (SSR)
   │
   └─> Lit components initialize
       └─> LOGS: "Lit is in dev mode"

2. Polkadot.js libraries initialize
   └─> Try to load native bindings
       └─> LOGS: "bigint: Failed to load bindings, pure JS will be used"

3. Client-side hydration
   └─> syncConnectors() runs again in browser
       └─> Actually detects wallet extensions
```

---

## Recommendations

### To Reduce Console Noise:

1. **Remove/Gate PolkadotAdapter Logs**:

   - Remove or wrap in environment checks (e.g., `if (process.env.DEBUG_POLKADOT)`)
   - File: `packages/adapters/polkadot/src/adapter.ts`

2. **Lit Dev Warning**:

   - Will auto-resolve in production builds
   - Or suppress via Lit configuration if needed

3. **BigInt Warning**:

   - Non-critical, can be suppressed or ignored
   - Or build native bindings with `npm run rebuild` in the Polkadot packages

4. **Port Warning**:
   - Close other process on port 3000, or configure Next.js to use 3001 by default

---

## Summary

All logs are expected and normal for a development environment:

- **PolkadotAdapter logs**: Intentional debug logging (110 console.log statements)
- **Lit warning**: Standard dev mode warning
- **BigInt warning**: Fallback notification (non-critical)
- **Port warning**: Port conflict resolution

The extensive logging in PolkadotAdapter appears to be for development/debugging purposes and should likely be removed or gated behind a debug flag for production.

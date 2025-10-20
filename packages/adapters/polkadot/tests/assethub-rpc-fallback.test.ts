/**
 * AssetHub RPC Endpoint Fallback Tests
 *
 * Tests the automatic fallback between multiple RPC endpoints when connecting to AssetHub.
 * This addresses the issue where wss://statemint-rpc.polkadot.io was unreliable.
 */
import type { CaipNetwork } from '@laughingwhales/appkit-common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PolkadotAdapter } from '../src/adapter.js'
import { clearMockInjectedWeb3, setupMockInjectedWeb3 } from './mocks/mockInjectedWeb3.js'
import { ASSETHUB_NETWORK } from './mocks/mockNetworks.js'
import {
  MockApiPromise,
  MockWsProvider,
  formatBalance,
  resetMockApi
} from './mocks/mockPolkadotApi.js'
import {
  resetMockExtension,
  web3Accounts,
  web3AccountsSubscribe,
  web3Enable,
  web3FromAddress
} from './mocks/mockPolkadotExtension.js'
import { ACCOUNT_SUBWALLET_1, POLKADOT_MAINNET } from './util/TestConstants.js'

// Mock Polkadot modules
vi.mock('@polkadot/extension-dapp', () => ({
  web3Enable,
  web3Accounts,
  web3FromAddress,
  web3AccountsSubscribe
}))

vi.mock('@polkadot/api', () => ({
  ApiPromise: MockApiPromise,
  WsProvider: MockWsProvider
}))

vi.mock('@polkadot/util', () => ({
  formatBalance
}))

describe('AssetHub RPC Endpoint Fallback', () => {
  let adapter: PolkadotAdapter

  beforeEach(() => {
    // Reset all mocks
    resetMockExtension()
    resetMockApi()
    clearMockInjectedWeb3()

    // Setup default environment
    setupMockInjectedWeb3(['subwallet-js'])

    // Create fresh adapter instance
    adapter = new PolkadotAdapter({
      appName: 'Test App'
    })

    // Mock getCaipNetworks to return test networks
    vi.spyOn(adapter as any, 'getCaipNetworks').mockReturnValue([
      POLKADOT_MAINNET,
      ASSETHUB_NETWORK
    ])
  })

  afterEach(() => {
    clearMockInjectedWeb3()
  })

  describe('resolveWsUrls', () => {
    it('should return all WebSocket URLs from network config', () => {
      // Access private method via any cast for testing
      const resolveWsUrls = (adapter as any).resolveWsUrls.bind(adapter)
      const urls = resolveWsUrls(ASSETHUB_NETWORK)

      expect(urls).toHaveLength(3)
      expect(urls).toContain('wss://sys.ibp.network/statemint')
      expect(urls).toContain('wss://statemint-rpc.polkadot.io')
      expect(urls).toContain('wss://polkadot-asset-hub-rpc.polkadot.io')
    })

    it('should return URLs in correct priority order', () => {
      const resolveWsUrls = (adapter as any).resolveWsUrls.bind(adapter)
      const urls = resolveWsUrls(ASSETHUB_NETWORK)

      // IBP endpoint should be first (primary fallback)
      expect(urls[0]).toBe('wss://sys.ibp.network/statemint')
      // Original Parity endpoint should be second
      expect(urls[1]).toBe('wss://statemint-rpc.polkadot.io')
      // Alternative Parity endpoint should be third
      expect(urls[2]).toBe('wss://polkadot-asset-hub-rpc.polkadot.io')
    })

    it('should remove duplicate URLs', () => {
      const resolveWsUrls = (adapter as any).resolveWsUrls.bind(adapter)

      const networkWithDuplicates: CaipNetwork = {
        ...ASSETHUB_NETWORK,
        rpcUrls: {
          default: {
            webSocket: ['wss://endpoint1.io', 'wss://endpoint2.io']
          },
          public: {
            webSocket: ['wss://endpoint2.io', 'wss://endpoint3.io'] // endpoint2 is duplicate
          }
        }
      } as any

      const urls = resolveWsUrls(networkWithDuplicates)

      expect(urls).toHaveLength(3)
      expect(urls).toContain('wss://endpoint1.io')
      expect(urls).toContain('wss://endpoint2.io')
      expect(urls).toContain('wss://endpoint3.io')
    })

    it('should handle networks with single WebSocket URL', () => {
      const resolveWsUrls = (adapter as any).resolveWsUrls.bind(adapter)

      const singleUrlNetwork: CaipNetwork = {
        ...ASSETHUB_NETWORK,
        rpcUrls: {
          default: {
            webSocket: ['wss://single-endpoint.io']
          }
        }
      } as any

      const urls = resolveWsUrls(singleUrlNetwork)

      expect(urls).toHaveLength(1)
      expect(urls[0]).toBe('wss://single-endpoint.io')
    })

    it('should handle wss:// URLs in http arrays', () => {
      const resolveWsUrls = (adapter as any).resolveWsUrls.bind(adapter)

      const mixedUrlNetwork: CaipNetwork = {
        ...ASSETHUB_NETWORK,
        rpcUrls: {
          default: {
            http: ['wss://ws-in-http.io', 'https://normal-http.io'],
            webSocket: ['wss://normal-ws.io']
          }
        }
      } as any

      const urls = resolveWsUrls(mixedUrlNetwork)

      expect(urls).toContain('wss://normal-ws.io')
      expect(urls).toContain('wss://ws-in-http.io')
      expect(urls).not.toContain('https://normal-http.io') // http:// should be excluded
    })
  })

  describe('getApi - Fallback Behavior', () => {
    it('should successfully connect using first endpoint', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')
      const wsProviderSpy = vi.spyOn(MockWsProvider.prototype, 'constructor' as any)

      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Should only try the first endpoint if it succeeds
      expect(createSpy).toHaveBeenCalledTimes(1)
      expect(wsProviderSpy).toHaveBeenCalledTimes(1)

      // Verify it tried the first endpoint (IBP)
      const firstCallArgs = wsProviderSpy.mock.calls[0]
      expect(firstCallArgs?.[0]).toBe('wss://sys.ibp.network/statemint')
    })

    it('should fallback to second endpoint when first fails', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')

      // Make first attempt fail, second succeed
      createSpy
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(new MockApiPromise())

      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Should have tried twice (first failed, second succeeded)
      expect(createSpy).toHaveBeenCalledTimes(2)
    })

    it('should try all three endpoints before failing', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')

      // Make all attempts fail
      createSpy
        .mockRejectedValueOnce(new Error('First endpoint failed'))
        .mockRejectedValueOnce(new Error('Second endpoint failed'))
        .mockRejectedValueOnce(new Error('Third endpoint failed'))

      const result = await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Should have tried all three endpoints
      expect(createSpy).toHaveBeenCalledTimes(3)

      // Should return zero balance on failure (graceful degradation)
      expect(result.balance).toBe('0')
      expect(result.symbol).toBe('DOT')
    })

    it('should succeed with third endpoint when first two fail', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')

      // First two fail, third succeeds
      createSpy
        .mockRejectedValueOnce(new Error('First failed'))
        .mockRejectedValueOnce(new Error('Second failed'))
        .mockResolvedValueOnce(new MockApiPromise())

      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Should have tried all three times
      expect(createSpy).toHaveBeenCalledTimes(3)
    })

    it('should cache successful API connection', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')

      // First call
      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Second call (should use cache)
      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Should only create API once due to caching
      expect(createSpy).toHaveBeenCalledTimes(1)
    })

    it('should remove disconnected API from cache and reconnect', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')

      // First call - creates and caches API
      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      expect(createSpy).toHaveBeenCalledTimes(1)

      // Simulate disconnection by making isConnected return false
      const cachedApi = createSpy.mock.results[0]?.value
      if (cachedApi) {
        Object.defineProperty(cachedApi, 'isConnected', {
          value: false,
          writable: true
        })
      }

      // Second call - should detect disconnection and reconnect
      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Should have created a new API connection
      expect(createSpy).toHaveBeenCalledTimes(2)
    })

    it('should handle Error 1006 Abnormal Closure and fallback', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')

      // Simulate the actual error that AssetHub was experiencing
      const error1006 = new Error(
        'disconnected from wss://statemint-rpc.polkadot.io: 1006:: Abnormal Closure'
      )

      // First endpoint fails with 1006, second succeeds
      createSpy.mockRejectedValueOnce(error1006).mockResolvedValueOnce(new MockApiPromise())

      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Should have successfully fallen back
      expect(createSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('getApi - Error Messages', () => {
    it('should throw informative error when all endpoints fail', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')
      const lastError = new Error('Connection refused')

      createSpy
        .mockRejectedValueOnce(new Error('First failed'))
        .mockRejectedValueOnce(new Error('Second failed'))
        .mockRejectedValueOnce(lastError)

      // Use getApi directly to test error throwing (getBalance catches errors)
      const getApi = (adapter as any).getApi.bind(adapter)

      await expect(getApi(ASSETHUB_NETWORK)).rejects.toThrow()
    })

    it('should throw error when no WebSocket URLs are configured', async () => {
      const noWsNetwork: CaipNetwork = {
        ...ASSETHUB_NETWORK,
        rpcUrls: {
          default: {
            http: ['https://http-only.io']
          }
        }
      } as any

      const getApi = (adapter as any).getApi.bind(adapter)

      await expect(getApi(noWsNetwork)).rejects.toThrow(
        'No WebSocket RPC URL configured for Substrate network'
      )
    })
  })

  describe('Real-world Scenario: Switching Between Networks', () => {
    it('should maintain separate API caches for different networks', async () => {
      const createSpy = vi.spyOn(MockApiPromise, 'create')

      // Connect to AssetHub
      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      const kusama: CaipNetwork = {
        id: 'b0a8d493285c2df73290dfb7e61f870f',
        name: 'Kusama',
        chainNamespace: 'polkadot',
        caipNetworkId: 'polkadot:b0a8d493285c2df73290dfb7e61f870f',
        nativeCurrency: { name: 'Kusama', symbol: 'KSM', decimals: 12 },
        rpcUrls: {
          default: { webSocket: ['wss://kusama-rpc.polkadot.io'] }
        }
      } as any

      // Switch to Kusama
      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: kusama
      } as any)

      // Switch back to AssetHub (should use cache)
      await adapter.getBalance({
        address: ACCOUNT_SUBWALLET_1.address,
        caipNetwork: ASSETHUB_NETWORK
      } as any)

      // Should have created API twice (once for each network, AssetHub cached on return)
      expect(createSpy).toHaveBeenCalledTimes(2)
    })
  })
})

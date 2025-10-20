/**
 * AssetHub Balance Verification Test
 *
 * Real-world test to verify balance fetching works correctly on AssetHub
 * with the fallback RPC endpoint implementation.
 */
import { describe, expect, it } from 'vitest'

import { PolkadotAdapter } from '../src/adapter.js'
import { assetHub } from '../src/utils/networks.js'

describe('AssetHub Balance Verification (Real Address)', () => {
  it('should fetch balance for address 14YocNv6K2tG4Z1euWYe6CYsEpGk3cUvUuhAtJm3MBZUjVHP', async () => {
    const adapter = new PolkadotAdapter({
      appName: 'AssetHub Balance Test'
    })

    const testAddress = '14YocNv6K2tG4Z1euWYe6CYsEpGk3cUvUuhAtJm3MBZUjVHP'

    console.log('\n🔍 Testing AssetHub balance fetch with fallback endpoints...')
    console.log('Address:', testAddress)
    console.log('Network:', assetHub.name)
    console.log('Chain ID:', assetHub.id)
    console.log('RPC Endpoints:', assetHub.rpcUrls.default.webSocket)

    const result = await adapter.getBalance({
      address: testAddress,
      caipNetwork: assetHub
    })

    console.log('\n✅ Balance fetch successful!')
    console.log('Balance:', result.balance)
    console.log('Symbol:', result.symbol)

    // Verify the result structure
    expect(result).toBeDefined()
    expect(result.balance).toBeDefined()
    expect(result.symbol).toBe('DOT')
    expect(typeof result.balance).toBe('string')

    // Balance should be a valid number (not error state)
    const balanceNum = parseFloat(result.balance)
    expect(balanceNum).toBeGreaterThanOrEqual(0)

    console.log('\n🎉 AssetHub balance verification PASSED!')
  }, 30000) // 30 second timeout for real network call
})

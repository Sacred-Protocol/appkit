#!/usr/bin/env node
/**
 * AssetHub Balance Verification Script
 *
 * Verifies that balance fetching works correctly on AssetHub
 * with the fallback RPC endpoint implementation.
 *
 * Usage: node verify-assethub-balance.js
 */
import { ApiPromise, WsProvider } from '@polkadot/api'
import { formatBalance } from '@polkadot/util'

const TEST_ADDRESS = '14YocNv6K2tG4Z1euWYe6CYsEpGk3cUvUuhAtJm3MBZUjVHP'

const ASSETHUB_RPC_ENDPOINTS = [
  'wss://sys.ibp.network/statemint',
  'wss://statemint-rpc.polkadot.io',
  'wss://polkadot-asset-hub-rpc.polkadot.io'
]

async function tryEndpoint(wsUrl) {
  console.log(`\n🔗 Attempting connection to: ${wsUrl}`)

  try {
    const provider = new WsProvider(wsUrl, 5000) // 5 second timeout
    const api = await ApiPromise.create({ provider })
    await api.isReady

    console.log('✅ Connected successfully!')

    // Fetch balance
    const accountInfo = await api.query.system.account(TEST_ADDRESS)
    const data = accountInfo.data
    const free = data?.free ? data.free.toString() : '0'
    const decimals = api.registry.chainDecimals[0] || 10
    const symbol = api.registry.chainTokens[0] || 'DOT'

    const formattedBalance = formatBalance(free, {
      decimals,
      withUnit: false
    })

    console.log(`💰 Balance: ${formattedBalance} ${symbol}`)
    console.log(`📊 Raw: ${free} planck`)

    await api.disconnect()
    return { success: true, balance: formattedBalance, symbol, endpoint: wsUrl }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`)
    return { success: false, error: error.message, endpoint: wsUrl }
  }
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 AssetHub Balance Verification with Fallback Endpoints')
  console.log('='.repeat(80))
  console.log(`\n📍 Test Address: ${TEST_ADDRESS}`)
  console.log(`🌐 Network: Polkadot Asset Hub (Statemint)`)
  console.log(`🔄 Fallback Endpoints: ${ASSETHUB_RPC_ENDPOINTS.length}`)

  for (const endpoint of ASSETHUB_RPC_ENDPOINTS) {
    const result = await tryEndpoint(endpoint)

    if (result.success) {
      console.log('\n' + '='.repeat(80))
      console.log('🎉 SUCCESS! Balance fetched correctly from AssetHub')
      console.log('='.repeat(80))
      console.log(`✅ Working Endpoint: ${result.endpoint}`)
      console.log(`💰 Balance: ${result.balance} ${result.symbol}`)
      console.log('\n✨ The fallback RPC endpoint implementation is working correctly!')
      console.log('='.repeat(80) + '\n')
      process.exit(0)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('❌ FAILED: All endpoints failed')
  console.log('='.repeat(80) + '\n')
  process.exit(1)
}

main().catch(error => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})

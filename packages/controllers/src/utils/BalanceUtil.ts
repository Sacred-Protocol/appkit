import {
  type Address,
  type CaipAddress,
  type CaipNetwork,
  ConstantsUtil,
  ParseUtil
} from '@laughingwhales/appkit-common'
import { erc20Abi, formatUnits } from 'viem'

import { BlockchainApiController } from '../controllers/BlockchainApiController.js'
import { ChainController } from '../controllers/ChainController.js'
import { ConnectionController } from '../controllers/ConnectionController.js'
import { ConnectorController } from '../controllers/ConnectorController.js'
import { ERC7811Utils } from './ERC7811Util.js'
import { StorageUtil } from './StorageUtil.js'
import type { BlockchainApiBalanceResponse } from './TypeUtil.js'
import { ViemUtil } from './ViemUtil.js'

// Polkadot AssetHub token mapping (like CoinGecko ID mapping)
// Reserved for future AssetHub token support
// @ts-expect-error - Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const POLKADOT_ASSETHUB_TOKENS: Record<
  string,
  { assetId: string; symbol: string; decimals: number; name: string }
> = {
  // AssetHub common tokens
  '1984': { assetId: '1984', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  '1337': { assetId: '1337', symbol: 'USDC', decimals: 6, name: 'USD Coin' }
  // Add more as needed
}

// -- Types -------------------------------------------------------------------- //
interface FetchER20BalanceParams {
  caipAddress: CaipAddress
  assetAddress: string
  caipNetwork: CaipNetwork
}

// -- Controller ---------------------------------------- //
export const BalanceUtil = {
  /**
   * Get the balances of the user's tokens. If user connected with Auth provider or and on the EIP155 network,
   * it'll use the `wallet_getAssets` and `wallet_getCapabilities` calls to fetch the balance rather than Blockchain API
   * @param forceUpdate - If true, the balances will be fetched from the server
   * @returns The balances of the user's tokens
   */
  async getMyTokensWithBalance(
    forceUpdate?: string
  ): Promise<BlockchainApiBalanceResponse['balances']> {
    const address = ChainController.getAccountData()?.address
    const caipNetwork = ChainController.state.activeCaipNetwork
    const isAuthConnector =
      ConnectorController.getConnectorId('eip155') === ConstantsUtil.CONNECTOR_ID.AUTH

    if (!address || !caipNetwork) {
      return []
    }

    const caipAddress = `${caipNetwork.caipNetworkId}:${address}`
    const cachedBalance = StorageUtil.getBalanceCacheForCaipAddress(caipAddress)

    if (cachedBalance) {
      return cachedBalance.balances
    }

    // Extract EIP-155 specific logic
    if (caipNetwork.chainNamespace === ConstantsUtil.CHAIN.EVM && isAuthConnector) {
      const eip155Balances = await this.getEIP155Balances(address, caipNetwork)

      if (eip155Balances) {
        return this.filterLowQualityTokens(eip155Balances)
      }
    }

    // Extract Polkadot-specific logic (like CoinGecko pattern)
    if (caipNetwork.chainNamespace === ConstantsUtil.CHAIN.POLKADOT) {
      const polkadotBalances = await this.getPolkadotBalances(address, caipNetwork)

      if (polkadotBalances) {
        return polkadotBalances
      }
    }

    // Fallback to 1Inch API (only works for supported EVM chains)
    try {
      const response = await BlockchainApiController.getBalance(
        address,
        caipNetwork.caipNetworkId,
        forceUpdate
      )

      return this.filterLowQualityTokens(response.balances)
    } catch (error) {
      console.warn('[BalanceUtil] BlockchainAPI failed, returning empty:', error)
      return []
    }
  },

  /**
   * Get the balances of Polkadot tokens (native + AssetHub)
   * Following the CoinGecko pattern: namespace-specific implementation with fallbacks
   * @param address - The Polkadot address
   * @param caipNetwork - The CAIP network
   * @returns The balances of Polkadot tokens
   */
  async getPolkadotBalances(
    address: string,
    caipNetwork: CaipNetwork
  ): Promise<BlockchainApiBalanceResponse['balances'] | null> {
    try {
      console.log('[BalanceUtil] Fetching Polkadot balances for:', {
        address,
        network: caipNetwork.name,
        chainId: caipNetwork.caipNetworkId
      })

      // Use the adapter's native getBalance method (which already works!)
      // We don't have direct adapter access here, so we use the connectionControllerClient
      // to trigger updateBalance which will fetch via the adapter
      const chainAdapter = ChainController.state.chains.get(ConstantsUtil.CHAIN.POLKADOT)
      if (!chainAdapter?.connectionControllerClient) {
        console.warn('[BalanceUtil] No Polkadot connection client available')
        return null
      }

      // Trigger balance update
      chainAdapter.connectionControllerClient.updateBalance(ConstantsUtil.CHAIN.POLKADOT)

      // For now, return the native balance from account state
      // The balance will be fetched and displayed through the normal flow
      const accountData = ChainController.getAccountData(ConstantsUtil.CHAIN.POLKADOT)
      const nativeBalance = accountData?.balance || '0'
      const nativeSymbol = caipNetwork.nativeCurrency.symbol

      console.log('[BalanceUtil] Got Polkadot balance from account state:', {
        balance: nativeBalance,
        symbol: nativeSymbol
      })

      const balances: BlockchainApiBalanceResponse['balances'] = [
        {
          name: caipNetwork.nativeCurrency.name,
          symbol: nativeSymbol,
          chainId: caipNetwork.caipNetworkId,
          address: undefined, // Native token has no contract address
          value: parseFloat(nativeBalance || '0'),
          price: 0, // Will be populated by price service
          quantity: {
            decimals: caipNetwork.nativeCurrency.decimals?.toString() || '10',
            numeric: nativeBalance
          },
          iconUrl: caipNetwork.assets?.imageId || ''
        }
      ]

      // TODO: Add AssetHub token support when needed
      // For AssetHub (chainId contains specific pattern), query assets.account()
      // const isAssetHub = caipNetwork.name?.toLowerCase().includes('assethub')
      // if (isAssetHub) {
      //   const assetBalances = await this.getPolkadotAssetHubBalances(address, caipNetwork)
      //   balances.push(...assetBalances)
      // }

      // Cache the result
      const caipAddress = `${caipNetwork.caipNetworkId}:${address}`
      StorageUtil.updateBalanceCache({
        caipAddress,
        balance: { balances },
        timestamp: Date.now()
      })

      console.log('[BalanceUtil] Returning Polkadot balances:', balances)
      return balances
    } catch (error) {
      console.error('[BalanceUtil] Failed to fetch Polkadot balances:', error)
      return null
    }
  },

  /**
   * Get the balances of the user's tokens on the EIP155 network using native `wallet_getAssets` and `wallet_getCapabilities` calls
   * @param address - The address of the user
   * @param caipNetwork - The CAIP network
   * @returns The balances of the user's tokens on the EIP155 network
   */
  async getEIP155Balances(address: string, caipNetwork: CaipNetwork) {
    try {
      const chainIdHex = ERC7811Utils.getChainIdHexFromCAIP2ChainId(caipNetwork.caipNetworkId)
      const walletCapabilities = (await ConnectionController.getCapabilities(address)) as Record<
        string,
        { assetDiscovery?: { supported: boolean } }
      >

      if (!walletCapabilities?.[chainIdHex]?.['assetDiscovery']?.supported) {
        return null
      }

      const walletGetAssetsResponse = await ConnectionController.walletGetAssets({
        account: address as Address,
        chainFilter: [chainIdHex]
      })

      if (!ERC7811Utils.isWalletGetAssetsResponse(walletGetAssetsResponse)) {
        return null
      }

      const assets = walletGetAssetsResponse[chainIdHex] || []
      const filteredAssets = assets.map(asset =>
        ERC7811Utils.createBalance(asset, caipNetwork.caipNetworkId)
      )

      StorageUtil.updateBalanceCache({
        caipAddress: `${caipNetwork.caipNetworkId}:${address}`,
        balance: { balances: filteredAssets },
        timestamp: Date.now()
      })

      return filteredAssets
    } catch (error) {
      return null
    }
  },

  /**
   * The 1Inch API includes many low-quality tokens in the balance response,
   * which appear inconsistently. This filter prevents them from being displayed.
   */
  filterLowQualityTokens(balances: BlockchainApiBalanceResponse['balances']) {
    return balances.filter(balance => balance.quantity.decimals !== '0')
  },
  async fetchERC20Balance({ caipAddress, assetAddress, caipNetwork }: FetchER20BalanceParams) {
    const publicClient = await ViemUtil.createViemPublicClient(caipNetwork)

    const { address } = ParseUtil.parseCaipAddress(caipAddress)

    const [{ result: name }, { result: symbol }, { result: balance }, { result: decimals }] =
      await publicClient.multicall({
        contracts: [
          {
            address: assetAddress as Address,
            functionName: 'name',
            args: [],
            abi: erc20Abi
          },
          {
            address: assetAddress as Address,
            functionName: 'symbol',
            args: [],
            abi: erc20Abi
          },
          {
            address: assetAddress as Address,
            functionName: 'balanceOf',
            args: [address as Address],
            abi: erc20Abi
          },
          {
            address: assetAddress as Address,
            functionName: 'decimals',
            args: [],
            abi: erc20Abi
          }
        ]
      })

    return {
      name,
      symbol,
      decimals,
      balance: balance && decimals ? formatUnits(balance, decimals) : '0'
    }
  }
}

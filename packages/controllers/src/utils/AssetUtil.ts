import type { CaipNetwork, ChainNamespace } from '@laughingwhales/appkit-common'
import { proxy } from 'valtio/vanilla'

import { ApiController } from '../controllers/ApiController.js'
import { AssetController } from '../controllers/AssetController.js'
import type { Connector, WcWallet } from './TypeUtil.js'

// -- Types --------------------------------------------- //
export interface AssetUtilState {
  networkImagePromises: Record<string, Promise<void>>
}

const namespaceImageIds: Record<ChainNamespace, string> = {
  // Ethereum
  eip155: 'ba0ba0cd-17c6-4806-ad93-f9d174f17900',
  // Solana
  solana: 'a1b58899-f671-4276-6a5e-56ca5bd59700',
  // Polkadot - No official Reown CDN UUID; skip CDN fetch and use SVG fallback
  polkadot: '',
  // Bitcoin
  bip122: '0b4838db-0161-4ffe-022d-532bf03dba00',
  // Cosmos
  cosmos: '',
  // Sui
  sui: '',
  // Stacks
  stacks: ''
}

// Polkadot logo as data URL (official magenta/pink color #E6007A)
const POLKADOT_LOGO_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyByb2xlPSJpbWciIGZpbGw9IiNFNjAwN0EiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIsMGMyLjM5LDAsNC4zMjgsMS4xMjcsNC4zMjgsMi41MTdTMTQuMzksNS4wMzQsMTIsNS4wMzQsNy42NzIsMy45MDcsNy42NzIsMi41MTcsOS42MSwwLDEyLDBabTAsMTguOTY2YzIuMzksMCw0LjMyOCwxLjEyNyw0LjMyOCwyLjUxN1MxNC4zOSwyNCwxMiwyNHMtNC4zMjgtMS4xMjctNC4zMjgtMi41MTdTOS42MSwxOC45NjYsMTIsMTguOTY2Wk0xLjYwNiw2QzIuOCwzLjkzLDQuNzQ3LDIuODE2LDUuOTUyLDMuNTExczEuMjEyLDIuOTM3LjAxNyw1LjAwN1MyLjgyOCwxMS43LDEuNjI0LDExLjAwNy40MTEsOC4wNywxLjYwNiw2Wm0xNi40MjcsOS40ODNjMS4yLTIuMDcsMy4xMzktMy4xODQsNC4zNDMtMi40ODlzMS4yMTEsMi45MzYuMDE2LDUuMDA2LTMuMTQsMy4xODUtNC4zNDQsMi40OVMxNi44MzcsMTcuNTUzLDE4LjAzMywxNS40ODNaTTEuNjI0LDEyLjk5M2MxLjIwNS0uNywzLjE1LjQxOSw0LjM0NiwyLjQ4OXMxLjE4Nyw0LjMxMS0uMDE4LDUuMDA3UzIuOCwyMC4wNywxLjYwNywxOC40MiwxMy42ODksMS42MjQsMTIuOTkzWk0xOC4wNDksMy41MTJjMS4yLS42OTUsMy4xNDkuNDE5LDQuMzQ0LDIuNDg5czEuMTg4LDQuMzExLS4wMTYsNS4wMDctMy4xNDgtLjQyLTQuMzQzLTIuNDlTMTYuODQ2LDQuMjA3LDE4LjA0OSwzLjUxMloiLz48L3N2Zz4='

// -- State --------------------------------------------- //
const state = proxy<AssetUtilState>({
  networkImagePromises: {}
})

// -- Util ---------------------------------------- //
export const AssetUtil = {
  async fetchWalletImage(imageId?: string) {
    if (!imageId) {
      return undefined
    }

    await ApiController._fetchWalletImage(imageId)

    return this.getWalletImageById(imageId)
  },

  async fetchNetworkImage(imageId?: string) {
    if (!imageId || imageId.trim() === '') {
      return undefined
    }

    const existingImage = this.getNetworkImageById(imageId)

    // Check if the image already exists
    if (existingImage) {
      return existingImage
    }

    // Check if the promise is already created
    if (!state.networkImagePromises[imageId]) {
      state.networkImagePromises[imageId] = ApiController._fetchNetworkImage(imageId)
    }

    await state.networkImagePromises[imageId]

    return this.getNetworkImageById(imageId)
  },

  getWalletImageById(imageId?: string) {
    if (!imageId) {
      return undefined
    }

    return AssetController.state.walletImages[imageId]
  },

  getWalletImage(wallet?: WcWallet) {
    if (wallet?.image_url) {
      return wallet?.image_url
    }

    if (wallet?.image_id) {
      return AssetController.state.walletImages[wallet.image_id]
    }

    return undefined
  },

  getNetworkImage(network?: CaipNetwork) {
    if (network?.assets?.imageUrl) {
      return network?.assets?.imageUrl
    }

    if (network?.assets?.imageId) {
      return AssetController.state.networkImages[network.assets.imageId]
    }

    // Fallback to chain image for namespaces without network-specific assets
    if (network?.chainNamespace) {
      return this.getChainImage(network.chainNamespace)
    }

    return undefined
  },

  getNetworkImageById(imageId?: string) {
    if (!imageId) {
      return undefined
    }

    return AssetController.state.networkImages[imageId]
  },

  getConnectorImage(connector?: Connector) {
    if (connector?.imageUrl) {
      return connector.imageUrl
    }

    if (connector?.info?.icon) {
      return connector.info.icon
    }

    if (connector?.imageId) {
      return AssetController.state.connectorImages[connector.imageId]
    }

    return undefined
  },

  getChainImage(chain: ChainNamespace) {
    const imageId = namespaceImageIds[chain]
    const image = AssetController.state.networkImages[imageId]

    if (image) {
      return image
    }

    // Fallback for namespaces without a valid CDN image ID
    if (chain === 'polkadot') {
      return POLKADOT_LOGO_DATA_URL
    }

    return undefined
  },

  getNamespaceImageId(chain: ChainNamespace) {
    const id = namespaceImageIds[chain]

    return id || undefined
  },

  getAllNamespaceImageIds() {
    return Object.values(namespaceImageIds).filter(Boolean) as string[]
  },

  getTokenImage(symbol?: string) {
    if (!symbol) {
      return undefined
    }

    return AssetController.state.tokenImages[symbol]
  }
}

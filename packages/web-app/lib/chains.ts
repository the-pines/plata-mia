export type ChainType = 'evm' | 'substrate'

export interface ChainConfig {
  id: string
  name: string
  type: ChainType
  rpcUrl: string
  chainId?: number
  ss58Prefix?: number
  gatewayAddress?: string
  hostAddress?: string
  tokenSymbol: string
  tokenDecimals: number
  explorerUrl?: string
  isTestnet: boolean
}

export const GATEWAY_ADDRESSES = {
  ethereum: '0xFd413e3AFe560182C4471F4d143A96d3e259B6dE',
  sepolia: '0xFcDa26cA021d5535C3059547390E6cCd8De7acA6',
} as const

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    type: 'evm',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    gatewayAddress: GATEWAY_ADDRESSES.ethereum,
    tokenSymbol: 'ETH',
    tokenDecimals: 18,
    explorerUrl: 'https://etherscan.io',
    isTestnet: false,
  },
  {
    id: 'polkadot-hub',
    name: 'Polkadot Hub',
    type: 'evm',
    chainId: 420420419,
    rpcUrl: 'https://eth-rpc.polkadot.io',
    ss58Prefix: 0,
    tokenSymbol: 'DOT',
    tokenDecimals: 10,
    explorerUrl: 'https://blockscout.polkadot.io',
    isTestnet: false,
  },
  {
    id: 'sepolia',
    name: 'Sepolia',
    type: 'evm',
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    gatewayAddress: GATEWAY_ADDRESSES.sepolia,
    tokenSymbol: 'ETH',
    tokenDecimals: 18,
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
  {
    id: 'polkadot-hub-testnet',
    name: 'Polkadot Hub TestNet',
    type: 'evm',
    chainId: 420420417,
    rpcUrl: 'https://eth-rpc-testnet.polkadot.io',
    ss58Prefix: 42,
    tokenSymbol: 'DOT',
    tokenDecimals: 10,
    explorerUrl: 'https://blockscout-testnet.polkadot.io',
    isTestnet: true,
  },
]

export function getChainById(id: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((chain) => chain.id === id)
}

export function getChainsByType(type: ChainType): ChainConfig[] {
  return SUPPORTED_CHAINS.filter((chain) => chain.type === type)
}

export function getTestnetChains(): ChainConfig[] {
  return SUPPORTED_CHAINS.filter((chain) => chain.isTestnet)
}

export function getMainnetChains(): ChainConfig[] {
  return SUPPORTED_CHAINS.filter((chain) => !chain.isTestnet)
}

export function isCrossChainTransfer(
  sourceChain: ChainConfig,
  destChain: ChainConfig
): boolean {
  return sourceChain.id !== destChain.id
}

export function requiresHyperbridge(
  sourceChain: ChainConfig,
  destChain: ChainConfig
): boolean {
  if (!isCrossChainTransfer(sourceChain, destChain)) return false
  return true
}

export const DEFAULT_SOURCE_CHAIN_ID = 'polkadot-hub-testnet'
export const DEFAULT_DEST_CHAIN_ID = 'polkadot-hub-testnet'

export async function ensureMetaMaskChain(chain: ChainConfig): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) return
  if (!chain.chainId) throw new Error(`No chainId configured for ${chain.name}`)

  const chainIdHex = `0x${chain.chainId.toString(16)}`
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    })
  } catch (err) {
    const error = err as { code?: number }
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: chain.name,
          nativeCurrency: {
            name: chain.tokenSymbol,
            symbol: chain.tokenSymbol,
            decimals: chain.tokenDecimals,
          },
          rpcUrls: [chain.rpcUrl],
          blockExplorerUrls: chain.explorerUrl ? [chain.explorerUrl] : undefined,
        }],
      })
    } else {
      throw err
    }
  }
}

export type ChainType = 'evm' | 'substrate'

export interface ChainConfig {
  id: string
  name: string
  type: ChainType
  rpcUrl: string
  chainId?: number // EVM chain ID
  ss58Prefix?: number // Substrate network prefix
  gatewayAddress?: string // Token Gateway contract (EVM only)
  hostAddress?: string // ISMP Host contract (EVM only)
  tokenSymbol: string
  tokenDecimals: number
  explorerUrl?: string
  isTestnet: boolean
}

// Hyperbridge Token Gateway addresses
// Source: https://docs.hyperbridge.network
export const GATEWAY_ADDRESSES = {
  ethereum: '0xfd413e3afe560182c4471f4d143a96d3e259b6de',
  sepolia: '0x...', // TODO: Add testnet address
} as const

// Supported chains configuration
export const SUPPORTED_CHAINS: ChainConfig[] = [
  // EVM Chains - Mainnet
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
    id: 'base',
    name: 'Base',
    type: 'evm',
    chainId: 8453,
    rpcUrl: 'https://base.llamarpc.com',
    tokenSymbol: 'ETH',
    tokenDecimals: 18,
    explorerUrl: 'https://basescan.org',
    isTestnet: false,
  },
  {
    id: 'optimism',
    name: 'Optimism',
    type: 'evm',
    chainId: 10,
    rpcUrl: 'https://optimism.llamarpc.com',
    tokenSymbol: 'ETH',
    tokenDecimals: 18,
    explorerUrl: 'https://optimistic.etherscan.io',
    isTestnet: false,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    type: 'evm',
    chainId: 42161,
    rpcUrl: 'https://arbitrum.llamarpc.com',
    tokenSymbol: 'ETH',
    tokenDecimals: 18,
    explorerUrl: 'https://arbiscan.io',
    isTestnet: false,
  },
  // Substrate Chains
  {
    id: 'polkadot',
    name: 'Polkadot',
    type: 'substrate',
    rpcUrl: 'wss://rpc.polkadot.io',
    ss58Prefix: 0,
    tokenSymbol: 'DOT',
    tokenDecimals: 10,
    explorerUrl: 'https://polkadot.subscan.io',
    isTestnet: false,
  },
  {
    id: 'westend-asset-hub',
    name: 'Westend Asset Hub',
    type: 'substrate',
    rpcUrl: 'wss://westend-asset-hub-rpc.polkadot.io',
    ss58Prefix: 42,
    tokenSymbol: 'WND',
    tokenDecimals: 12,
    explorerUrl: 'https://westend.subscan.io',
    isTestnet: true,
  },
  // EVM Testnet
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

// Check if cross-chain transfer is needed
export function isCrossChainTransfer(
  sourceChain: ChainConfig,
  destChain: ChainConfig
): boolean {
  return sourceChain.id !== destChain.id
}

// Check if Hyperbridge is required (cross-chain between different types)
export function requiresHyperbridge(
  sourceChain: ChainConfig,
  destChain: ChainConfig
): boolean {
  if (!isCrossChainTransfer(sourceChain, destChain)) return false
  // Hyperbridge needed for EVM <-> Substrate or different EVM chains
  return true
}

// Default chains for initial state
export const DEFAULT_SOURCE_CHAIN_ID = 'westend-asset-hub'
export const DEFAULT_DEST_CHAIN_ID = 'westend-asset-hub'

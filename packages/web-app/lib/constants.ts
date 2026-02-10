export const COLORS = {
  lemon: '#FDE047',
  lemonLight: '#FEF9C3',
  lemonDark: '#EAB308',
  gray: '#1F2937',
  grayLight: '#374151',
  grayLighter: '#6B7280',
  white: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
} as const

export const CHAIN_CONFIG = {
  name: 'Westend Asset Hub',
  rpcUrl: 'wss://westend-asset-hub-rpc.polkadot.io',
  tokenSymbol: 'WND',
  tokenDecimals: 12,
  ss58Prefix: 42,
} as const

export const XX_PROXY_URL = process.env.NEXT_PUBLIC_XX_PROXY_URL || 'http://localhost:8080'

export const REGISTRY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || ''

// Hyperbridge configuration
export const HYPERBRIDGE_INDEXER_URL =
  process.env.NEXT_PUBLIC_HYPERBRIDGE_INDEXER || 'https://gargantua.indexer.polytope.technology'

export const HYPERBRIDGE_EXPLORER_URL = 'https://explorer.hyperbridge.network'

// Default chains for cross-chain transfers
export const DEFAULT_SOURCE_CHAIN =
  process.env.NEXT_PUBLIC_DEFAULT_SOURCE_CHAIN || 'westend-asset-hub'
export const DEFAULT_DEST_CHAIN =
  process.env.NEXT_PUBLIC_DEFAULT_DEST_CHAIN || 'westend-asset-hub'

// Transfer timeout in seconds
export const DEFAULT_TRANSFER_TIMEOUT = 3600 // 1 hour

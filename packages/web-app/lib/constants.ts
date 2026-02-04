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

export const POLKADOT_HUB_TESTNET = {
  name: 'Polkadot Hub TestNet',
  chainId: 420420417,
  evmRpcUrl: 'https://eth-rpc-testnet.polkadot.io',
  wsRpcUrl: 'wss://testnet-rpc.polkadot.io',
  tokenSymbol: 'DOT',
  tokenDecimals: 10,
  ss58Prefix: 0,
} as const

export const XX_PROXY_URL = process.env.NEXT_PUBLIC_XX_PROXY_URL || 'http://localhost:8080'

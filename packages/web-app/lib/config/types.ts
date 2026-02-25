export interface Gateway {
  address: `0x${string}`
  hostAddress: `0x${string}`
  feeTokenAddress: `0x${string}`
  stateMachineId: string
  consensusStateId: string
}

export interface ChainConfig {
  id: string
  name: string
  type: 'evm' | 'substrate'
  chainId: number
  rpcUrl: string
  wsUrl?: string
  explorerUrl?: string
  isTestnet: boolean
  nativeCurrency: { name: string; symbol: string; decimals: number }
  gateway?: Gateway
  registryAddress?: `0x${string}`
}

export interface TokenConfig {
  symbol: string
  name: string
  decimals: number
  assetId?: string
}

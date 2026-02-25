import type { TokenConfig } from './types'

export const ALL_TOKENS: TokenConfig[] = [
  { symbol: 'ETH', name: 'Ether', decimals: 18, assetId: 'WETH' },
  { symbol: 'BNB', name: 'BNB', decimals: 18, assetId: 'WBNB' },
  { symbol: 'PAS', name: 'Paseo', decimals: 18 },
  { symbol: 'DOT', name: 'Polkadot', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, assetId: 'USDC' },
  { symbol: 'USDT', name: 'Tether', decimals: 6, assetId: 'USDT' },
  { symbol: 'DAI', name: 'Dai', decimals: 18, assetId: 'DAI' },
]

// Native token symbol for each chain
const NATIVE_SYMBOL: Record<string, string> = {
  ethereum: 'ETH',
  sepolia: 'ETH',
  'arbitrum-sepolia': 'ETH',
  'optimism-sepolia': 'ETH',
  'bsc-testnet': 'BNB',
  'polkadot-hub': 'DOT',
  'polkadot-hub-testnet': 'PAS',
}

// Canonical ERC20 contract addresses (for same-chain transfers)
const ERC20_ADDRESSES: Record<string, Record<string, `0x${string}`>> = {
  ethereum: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
}

export function getToken(symbol: string): TokenConfig | undefined {
  return ALL_TOKENS.find((t) => t.symbol === symbol)
}

export function getNativeSymbol(chainId: string): string | undefined {
  return NATIVE_SYMBOL[chainId]
}

export function isNativeToken(chainId: string, symbol: string): boolean {
  return NATIVE_SYMBOL[chainId] === symbol
}

export function getTokenAddress(chainId: string, symbol: string): `0x${string}` | null | undefined {
  if (isNativeToken(chainId, symbol)) return null
  return ERC20_ADDRESSES[chainId]?.[symbol]
}

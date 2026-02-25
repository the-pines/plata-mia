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
  arbitrum: 'ETH',
  optimism: 'ETH',
  bsc: 'BNB',
  sepolia: 'ETH',
  'arbitrum-sepolia': 'ETH',
  'optimism-sepolia': 'ETH',
  'bsc-testnet': 'BNB',
  'polkadot-hub-testnet': 'PAS',
}

// Canonical ERC20 contract addresses (for same-chain transfers)
const ERC20_ADDRESSES: Record<string, Record<string, `0x${string}`>> = {
  ethereum: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  arbitrum: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  optimism: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  bsc: {
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  },
  sepolia: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Circle official
    USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // Aave faucet
    DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',  // Aave faucet
  },
  'arbitrum-sepolia': {
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Circle official
  },
  'optimism-sepolia': {
    USDC: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Circle official
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

// Per-chain decimal overrides (only where they differ from global TokenConfig.decimals)
const DECIMAL_OVERRIDES: Record<string, Record<string, number>> = {
  bsc: { USDC: 18, USDT: 18 },
  'bsc-testnet': { USDC: 18, USDT: 18 },
}

export function getTokenDecimals(chainId: string, symbol: string): number {
  const override = DECIMAL_OVERRIDES[chainId]?.[symbol]
  if (override !== undefined) return override
  const token = ALL_TOKENS.find((t) => t.symbol === symbol)
  return token?.decimals ?? 18
}

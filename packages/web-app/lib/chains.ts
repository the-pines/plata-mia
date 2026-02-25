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
  feeTokenAddress?: string
  consensusStateId?: string
  tokenSymbol: string
  tokenDecimals: number
  explorerUrl?: string
  isTestnet: boolean
}

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? ''

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
    rpcUrl: ALCHEMY_KEY
      ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
      : 'https://eth.llamarpc.com',
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
    tokenDecimals: 18,
    explorerUrl: 'https://blockscout.polkadot.io',
    isTestnet: false,
  },
  {
    id: 'sepolia',
    name: 'Sepolia',
    type: 'evm',
    chainId: 11155111,
    rpcUrl: ALCHEMY_KEY
      ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
      : 'https://rpc.sepolia.org',
    gatewayAddress: GATEWAY_ADDRESSES.sepolia,
    hostAddress: '0x2EdB74C269948b60ec1000040E104cef0eABaae8',
    feeTokenAddress: '0xa801da100bf16d07f668f4a49e1f71fc54d05177',
    consensusStateId: 'ETH0',
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
    gatewayAddress: '0x1c1e5be83df4a54c7a2230c337e4a3e8b7354b1c',
    hostAddress: '0xbb26e04a71e7c12093e82b83ba310163eac186fa',
    feeTokenAddress: '0x0dc440cf87830f0af564eb8b62b454b7e0c68a4b',
    consensusStateId: 'PAS0',
    ss58Prefix: 42,
    tokenSymbol: 'PAS',
    tokenDecimals: 18,
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

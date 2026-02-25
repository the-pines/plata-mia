import type { ChainConfig } from './types'
import { ALL_CHAINS } from './chains'
import { env } from './env'

type Network = 'testnet' | 'mainnet'

export const NETWORK: Network = env.NEXT_PUBLIC_NETWORK

export function isTestnet(): boolean {
  return NETWORK === 'testnet'
}

export function getActiveChains(): ChainConfig[] {
  return ALL_CHAINS.filter((c) => (NETWORK === 'testnet' ? c.isTestnet : !c.isTestnet))
}

export function getDefaultChain(): ChainConfig {
  const chains = getActiveChains()
  if (chains.length === 0) {
    throw new Error(`No chains configured for network: ${NETWORK}`)
  }
  return chains[0]
}

export function isCrossChain(source: ChainConfig, dest: ChainConfig): boolean {
  return source.id !== dest.id
}

export function toViemChain(chain: ChainConfig) {
  return {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: {
      default: {
        http: [chain.rpcUrl],
        ...(chain.wsUrl ? { webSocket: [chain.wsUrl] } : {}),
      },
    },
  } as const
}

export async function ensureMetaMaskChain(chain: ChainConfig): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) return

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
        params: [
          {
            chainId: chainIdHex,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: chain.explorerUrl ? [chain.explorerUrl] : undefined,
          },
        ],
      })
    } else {
      throw err
    }
  }
}

export function getHyperbridgeIndexerUrl(): string {
  if (NETWORK === 'mainnet') {
    return (
      env.NEXT_PUBLIC_HYPERBRIDGE_INDEXER ?? 'https://nexus.indexer.polytope.technology'
    )
  }
  return env.NEXT_PUBLIC_HYPERBRIDGE_INDEXER ?? 'https://gargantua.indexer.polytope.technology'
}

export const HYPERBRIDGE_EXPLORER_URL = 'https://explorer.hyperbridge.network'

export function getHyperbridgeExplorerLink(
  commitmentHash: string | undefined
): string | null {
  if (!commitmentHash) return null
  const base = `${HYPERBRIDGE_EXPLORER_URL}/messages/${commitmentHash}`
  return isTestnet() ? `${base}?network=gargantua` : base
}

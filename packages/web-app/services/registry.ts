// Registry contract service for stealth address registration
// Supports both MetaMask (direct EVM) and Polkadot.js (via revive.call)

import { blake2b } from '@noble/hashes/blake2b'
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
} from 'viem'
import {
  REGISTRY_ABI,
  getRegistryAddress,
  getRegistryChain,
  toViemChain,
  ensureMetaMaskChain,
} from '@/lib/config'
import type { ApiPromise } from '@polkadot/api'
import type { Signer } from '@polkadot/api/types'

export interface StealthMetaAddress {
  spendingKey: string
  viewingKey: string
  preferredChain: number
  nickname?: string
}

export function hashHint(hint: string): `0x${string}` {
  const encoder = new TextEncoder()
  const hash = blake2b(encoder.encode(hint.toLowerCase().trim()), { dkLen: 32 })
  return `0x${bytesToHex(hash)}` as `0x${string}`
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function toBytes32(value: string): `0x${string}` {
  const hex = value.startsWith('0x') ? value.slice(2) : value
  if (hex.length > 64) {
    throw new Error('Value too long for bytes32')
  }
  return `0x${hex.padStart(64, '0')}` as `0x${string}`
}

function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: toViemChain(getRegistryChain()),
    transport: http(),
  })
}

function getWalletClient(): WalletClient {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not available')
  }
  return createWalletClient({
    chain: toViemChain(getRegistryChain()),
    transport: custom(window.ethereum),
  })
}

// Register via MetaMask (direct EVM call)
export async function registerWithMetaMask(
  hint: string,
  spendingKey: string,
  viewingKey: string,
  preferredChain: number,
  nickname: string,
  account: `0x${string}`
): Promise<{ txHash: string }> {
  await ensureMetaMaskChain(getRegistryChain())
  const client = getWalletClient()
  const identifier = hashHint(hint)
  const registryAddress = getRegistryAddress()

  const txHash = await client.writeContract({
    chain: toViemChain(getRegistryChain()),
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'register',
    args: [
      identifier,
      toBytes32(spendingKey),
      toBytes32(viewingKey),
      preferredChain,
      nickname,
    ],
    account,
  })

  return { txHash }
}

// Register via Polkadot.js (revive.call)
export async function registerWithPolkadotJs(
  hint: string,
  spendingKey: string,
  viewingKey: string,
  preferredChain: number,
  nickname: string,
  api: ApiPromise,
  signerAddress: string,
  signer: Signer
): Promise<{ txHash: string; blockHash: string }> {
  const { encodeFunctionData } = await import('viem')

  const identifier = hashHint(hint)
  const registryAddress = getRegistryAddress()
  const callData = encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: 'register',
    args: [
      identifier,
      toBytes32(spendingKey),
      toBytes32(viewingKey),
      preferredChain,
      nickname,
    ],
  })

  const gasLimit = 4_294_967_295n
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tx = (api.tx as any).revive.call(
    { Id: registryAddress },
    0n,
    gasLimit,
    null,
    callData
  )

  return new Promise((resolve, reject) => {
    tx.signAndSend(
      signerAddress,
      { signer },
      ({ status, dispatchError, txHash }: { status: { isInBlock: boolean; asInBlock: { toHex: () => string } }; dispatchError: unknown; txHash: { toHex: () => string } }) => {
        if (dispatchError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const err = dispatchError as any
          if (err.isModule) {
            const decoded = api.registry.findMetaError(err.asModule)
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`))
          } else {
            reject(new Error(err.toString()))
          }
          return
        }
        if (status.isInBlock) {
          resolve({
            blockHash: status.asInBlock.toHex(),
            txHash: txHash.toHex(),
          })
        }
      }
    ).catch(reject)
  })
}

// Lookup - works for both wallet types (read-only)
export async function lookup(hint: string): Promise<StealthMetaAddress | null> {
  const client = getPublicClient()
  const identifier = hashHint(hint)
  const registryAddress = getRegistryAddress()

  const result = await client.readContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'lookup',
    args: [identifier],
  }) as [string, string, number, string, boolean]

  const [spendingKey, viewingKey, preferredChain, nickname, exists] = result

  if (!exists) {
    return null
  }

  // Contract stores 32-byte x-coordinates; prepend 0x02 to reconstruct compressed pubkeys
  const spendHex = spendingKey.startsWith('0x') ? spendingKey.slice(2) : spendingKey
  const viewHex = viewingKey.startsWith('0x') ? viewingKey.slice(2) : viewingKey

  return {
    spendingKey: '02' + spendHex,
    viewingKey: '02' + viewHex,
    preferredChain,
    nickname: nickname || undefined,
  }
}

// Get owner - works for both wallet types (read-only)
export async function getOwner(hint: string): Promise<string> {
  const client = getPublicClient()
  const identifier = hashHint(hint)
  const registryAddress = getRegistryAddress()

  const owner = await client.readContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'getOwner',
    args: [identifier],
  }) as string

  return owner
}

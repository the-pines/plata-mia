// Registry contract service for stealth address registration
// Calls Solidity contract on Polkadot Hub TestNet via pallet_revive

import { blake2b } from '@noble/hashes/blake2b'
import type { ApiPromise } from '@polkadot/api'
import type { Signer } from '@polkadot/types/types'
import { REGISTRY_ABI, REGISTRY_CONTRACT_ADDRESS } from '@/lib/contracts'
import {
  encodeCall,
  decodeResult,
  callContract,
  queryContract,
  toBytes32,
} from './evmSubstrateAdapter'

export interface StealthMetaAddress {
  spendingKey: string
  viewingKey: string
  preferredChain: number
  nickname?: string
}

// Hash a human-readable hint to 32-byte identifier
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

export class RegistryService {
  private api: ApiPromise
  private contractAddress: string

  constructor(api: ApiPromise, contractAddress: string = REGISTRY_CONTRACT_ADDRESS) {
    this.api = api
    this.contractAddress = contractAddress
  }

  async register(
    hint: string,
    spendingKey: string,
    viewingKey: string,
    preferredChain: number,
    nickname: string,
    signerAddress: string,
    signer: Signer
  ): Promise<{ blockHash: string; txHash: string; identifier: string }> {
    const identifier = hashHint(hint)
    const spendingKeyBytes32 = toBytes32(spendingKey)
    const viewingKeyBytes32 = toBytes32(viewingKey)

    const callData = encodeCall(
      REGISTRY_ABI,
      'register',
      [identifier, spendingKeyBytes32, viewingKeyBytes32, preferredChain, nickname]
    )

    const result = await callContract(
      this.api,
      this.contractAddress,
      callData,
      signerAddress,
      signer
    )

    return {
      ...result,
      identifier,
    }
  }

  async lookup(hint: string, callerAddress?: string): Promise<StealthMetaAddress | null> {
    const identifier = hashHint(hint)

    const callData = encodeCall(REGISTRY_ABI, 'lookup', [identifier])

    const resultData = await queryContract(
      this.api,
      this.contractAddress,
      callData,
      callerAddress
    )

    const decoded = decodeResult(REGISTRY_ABI, 'lookup', resultData) as [
      `0x${string}`,
      `0x${string}`,
      number,
      string,
      boolean
    ]

    const [spendingKey, viewingKey, preferredChain, nickname, exists] = decoded

    if (!exists) {
      return null
    }

    return {
      spendingKey: spendingKey.slice(2),
      viewingKey: viewingKey.slice(2),
      preferredChain,
      nickname: nickname || undefined,
    }
  }

  async getOwner(hint: string, callerAddress?: string): Promise<string> {
    const identifier = hashHint(hint)

    const callData = encodeCall(REGISTRY_ABI, 'getOwner', [identifier])

    const resultData = await queryContract(
      this.api,
      this.contractAddress,
      callData,
      callerAddress
    )

    const decoded = decodeResult(REGISTRY_ABI, 'getOwner', resultData) as string
    return decoded
  }

  async updatePreferredChain(
    hint: string,
    newChain: number,
    signerAddress: string,
    signer: Signer
  ): Promise<{ blockHash: string; txHash: string }> {
    const identifier = hashHint(hint)

    const callData = encodeCall(
      REGISTRY_ABI,
      'updatePreferredChain',
      [identifier, newChain]
    )

    return callContract(
      this.api,
      this.contractAddress,
      callData,
      signerAddress,
      signer
    )
  }

  async updateNickname(
    hint: string,
    newNickname: string,
    signerAddress: string,
    signer: Signer
  ): Promise<{ blockHash: string; txHash: string }> {
    const identifier = hashHint(hint)

    const callData = encodeCall(
      REGISTRY_ABI,
      'updateNickname',
      [identifier, newNickname]
    )

    return callContract(
      this.api,
      this.contractAddress,
      callData,
      signerAddress,
      signer
    )
  }
}

// Singleton instance for use across the app
let registryInstance: RegistryService | null = null

export function getRegistry(api: ApiPromise): RegistryService {
  if (!registryInstance) {
    registryInstance = new RegistryService(api)
  }
  return registryInstance
}

export function clearRegistry(): void {
  registryInstance = null
}

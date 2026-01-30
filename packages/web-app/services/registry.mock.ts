// Mock registry contract service - stores meta-addresses in memory
// Replace with real contract calls when deployed

import { blake2b } from '@noble/hashes/blake2b'

export interface StealthMetaAddress {
  spendingKey: string  // Hex encoded pubkey (S)
  viewingKey: string   // Hex encoded pubkey (V)
  preferredChain: number
}

// In-memory storage (resets on page refresh)
const registry = new Map<string, StealthMetaAddress>()
const owners = new Map<string, string>() // identifier -> owner address

// Hash a human-readable hint to 32-byte identifier
export function hashHint(hint: string): string {
  const encoder = new TextEncoder()
  const hash = blake2b(encoder.encode(hint.toLowerCase().trim()), { dkLen: 32 })
  return bytesToHex(hash)
}

export async function register(
  hint: string,
  spendingKey: string,
  viewingKey: string,
  preferredChain: number,
  ownerAddress?: string
): Promise<{ success: boolean; identifier: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200))

  const identifier = hashHint(hint)

  if (registry.has(identifier)) {
    throw new Error('Hint already registered')
  }

  const metaAddress: StealthMetaAddress = {
    spendingKey,
    viewingKey,
    preferredChain,
  }

  registry.set(identifier, metaAddress)
  if (ownerAddress) {
    owners.set(identifier, ownerAddress)
  }

  console.log('[registry mock] Registered:', { hint, identifier: identifier.slice(0, 16) + '...' })

  return { success: true, identifier }
}

export async function lookup(hint: string): Promise<StealthMetaAddress | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100))

  const identifier = hashHint(hint)
  const result = registry.get(identifier) || null

  console.log('[registry mock] Lookup:', { hint, found: !!result })

  return result
}

export async function updatePreferredChain(
  hint: string,
  newChain: number,
  callerAddress: string
): Promise<{ success: boolean }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200))

  const identifier = hashHint(hint)
  const metaAddress = registry.get(identifier)

  if (!metaAddress) {
    throw new Error('Not found')
  }

  const owner = owners.get(identifier)
  if (owner && owner !== callerAddress) {
    throw new Error('Not owner')
  }

  metaAddress.preferredChain = newChain
  registry.set(identifier, metaAddress)

  return { success: true }
}

// Helper to convert bytes to hex
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// For debugging
export function getAllRegistrations(): Map<string, StealthMetaAddress> {
  return new Map(registry)
}

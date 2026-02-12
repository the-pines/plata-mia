import { secp256k1 } from '@noble/curves/secp256k1'
import { randomBytes } from '@noble/hashes/utils'
import type { KeyPair, StealthMetaAddress, ChainId } from './types.js'

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte)
  }
  return result
}

function bigIntToBytes(n: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(n & 0xffn)
    n >>= 8n
  }
  return bytes
}

// Ensure the private key produces a public key with even y-coordinate (0x02 prefix).
// This lets us store only the 32-byte x-coordinate in the contract's bytes32 slots
// and reconstruct the full compressed pubkey by prepending 0x02.
function ensureEvenY(secret: Uint8Array): Uint8Array {
  const point = secp256k1.ProjectivePoint.fromPrivateKey(secret)
  const compressed = point.toRawBytes(true)
  if (compressed[0] === 0x03) {
    const negated = secp256k1.CURVE.n - bytesToBigInt(secret)
    return bigIntToBytes(negated, 32)
  }
  return secret
}

function generateKeyPair(): KeyPair {
  let secret = randomBytes(32)
  secret = ensureEvenY(secret)
  const pubkey = secp256k1.getPublicKey(secret, true)
  return { secret, pubkey }
}

export function generateSpendingKeyPair(): KeyPair {
  return generateKeyPair()
}

export function generateViewingKeyPair(): KeyPair {
  return generateKeyPair()
}

export function createStealthMetaAddress(
  spending: KeyPair,
  viewing: KeyPair,
  preferredChain: ChainId,
  identifier?: string
): StealthMetaAddress {
  return {
    spendingPubkey: spending.pubkey,
    viewingPubkey: viewing.pubkey,
    preferredChain,
    identifier,
  }
}

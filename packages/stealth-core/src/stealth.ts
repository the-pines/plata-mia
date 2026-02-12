import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { randomBytes } from '@noble/hashes/utils'
import { pubkeyToAddress } from './encoding.js'
import type { DerivedAddress, ScanResult } from './types.js'

const G = secp256k1.ProjectivePoint.BASE
const n = secp256k1.CURVE.n

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte)
  }
  return result
}

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn)
    value >>= 8n
  }
  return bytes
}

// Generate an ephemeral key with even-y parity
function generateEphemeralKeyPair(): { secret: Uint8Array; pubkey: Uint8Array } {
  let secret = randomBytes(32)
  const point = secp256k1.ProjectivePoint.fromPrivateKey(secret)
  const compressed = point.toRawBytes(true)
  if (compressed[0] === 0x03) {
    const negated = n - bytesToBigInt(secret)
    secret = bigIntToBytes(negated, 32)
  }
  return { secret, pubkey: secp256k1.getPublicKey(secret, true) }
}

function computeSharedHash(ecdh: Uint8Array): Uint8Array {
  return keccak_256(ecdh)
}

export function computeViewTag(hash: Uint8Array): number {
  return hash[0]
}

export function deriveStealthAddress(
  spendingPubkey: Uint8Array,
  viewingPubkey: Uint8Array
): DerivedAddress {
  const { secret: r, pubkey: R } = generateEphemeralKeyPair()

  const ecdh = secp256k1.getSharedSecret(r, viewingPubkey)
  const hash = computeSharedHash(ecdh)
  const viewTag = computeViewTag(hash)

  const hashScalar = bytesToBigInt(hash) % n
  const S = secp256k1.ProjectivePoint.fromHex(spendingPubkey)
  const stealthPoint = S.add(G.multiply(hashScalar))
  const stealthPubkey = stealthPoint.toRawBytes(true)

  const address = pubkeyToAddress(stealthPubkey)

  return { address, pubkey: stealthPubkey, ephemeralPubkey: R, viewTag }
}

export function scanAnnouncement(
  viewingSecret: Uint8Array,
  spendingPubkey: Uint8Array,
  ephemeralPubkey: Uint8Array,
  viewTag: number
): ScanResult | null {
  const ecdh = secp256k1.getSharedSecret(viewingSecret, ephemeralPubkey)
  const hash = computeSharedHash(ecdh)

  if (computeViewTag(hash) !== viewTag) {
    return null
  }

  const hashScalar = bytesToBigInt(hash) % n
  const S = secp256k1.ProjectivePoint.fromHex(spendingPubkey)
  const stealthPoint = S.add(G.multiply(hashScalar))
  const stealthPubkey = stealthPoint.toRawBytes(true)

  const address = pubkeyToAddress(stealthPubkey)

  return { address, pubkey: stealthPubkey }
}

export function deriveSpendingKey(
  spendingSecret: Uint8Array,
  viewingSecret: Uint8Array,
  ephemeralPubkey: Uint8Array
): Uint8Array {
  const ecdh = secp256k1.getSharedSecret(viewingSecret, ephemeralPubkey)
  const hash = computeSharedHash(ecdh)

  const s = bytesToBigInt(spendingSecret)
  const hashScalar = bytesToBigInt(hash) % n
  const derived = (s + hashScalar) % n

  return bigIntToBytes(derived, 32)
}

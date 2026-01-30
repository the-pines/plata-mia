'use client'

// Stealth address cryptography using @scure/sr25519
// Matches the implementation in @plata-mia/stealth-core

import { getPublicKey, getSharedSecret, secretFromSeed, HDKD } from '@scure/sr25519'
import { blake2b } from '@noble/hashes/blake2b'
import { randomBytes } from '@noble/hashes/utils'

export interface KeyPair {
  secret: Uint8Array  // 64 bytes
  pubkey: Uint8Array  // 32 bytes
}

export interface DerivedAddress {
  address: string
  pubkey: Uint8Array
  ephemeralPubkey: Uint8Array
  viewTag: number
}

export interface ScanResult {
  address: string
  pubkey: Uint8Array
}

// Generate a random sr25519 key pair
function generateKeyPair(): KeyPair {
  const seed = randomBytes(32)
  const secret = secretFromSeed(seed)
  const pubkey = getPublicKey(secret)
  return { secret, pubkey }
}

// Generate a spending key pair
export function generateSpendingKeyPair(): KeyPair {
  return generateKeyPair()
}

// Generate a viewing key pair
export function generateViewingKeyPair(): KeyPair {
  return generateKeyPair()
}

// Hash shared secret for chain code
function hashSharedSecret(sharedSecret: Uint8Array): Uint8Array {
  return blake2b(sharedSecret, { dkLen: 32 })
}

// Compute view tag from shared secret (first byte)
export function computeViewTag(sharedSecret: Uint8Array): number {
  return sharedSecret[0]
}

// SS58 encode a public key
export function encodeAddress(pubkey: Uint8Array, networkId: number = 42): string {
  const SS58_PREFIX = new Uint8Array([0x53, 0x53, 0x35, 0x38, 0x50, 0x52, 0x45]) // "SS58PRE"

  let addressBytes: Uint8Array
  if (networkId < 64) {
    addressBytes = new Uint8Array(1 + 32)
    addressBytes[0] = networkId
    addressBytes.set(pubkey, 1)
  } else {
    addressBytes = new Uint8Array(2 + 32)
    addressBytes[0] = ((networkId & 0xfc) >> 2) | 0x40
    addressBytes[1] = (networkId >> 8) | ((networkId & 0x03) << 6)
    addressBytes.set(pubkey, 2)
  }

  const checksumInput = new Uint8Array(SS58_PREFIX.length + addressBytes.length)
  checksumInput.set(SS58_PREFIX)
  checksumInput.set(addressBytes, SS58_PREFIX.length)

  const checksum = blake2b(checksumInput, { dkLen: 64 }).slice(0, 2)

  const full = new Uint8Array(addressBytes.length + 2)
  full.set(addressBytes)
  full.set(checksum, addressBytes.length)

  return base58Encode(full)
}

// Base58 encoding
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58Encode(bytes: Uint8Array): string {
  const digits = [0]
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }

  let result = ''
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result += BASE58_ALPHABET[0]
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]]
  }

  return result
}

// Derive stealth address for sending (sender's perspective)
export function deriveStealthAddress(
  spendingPubkey: Uint8Array,
  viewingPubkey: Uint8Array,
  networkId: number = 42
): DerivedAddress {
  // Generate ephemeral keypair (r, R)
  const ephemeralSeed = randomBytes(32)
  const ephemeralSecret = secretFromSeed(ephemeralSeed)
  const ephemeralPubkey = getPublicKey(ephemeralSecret)

  // Compute shared secret: ECDH(r, V)
  const sharedSecret = getSharedSecret(ephemeralSecret, viewingPubkey)

  // Compute view tag
  const viewTag = computeViewTag(sharedSecret)

  // Hash shared secret for chain code
  const chainCode = hashSharedSecret(sharedSecret)

  // Derive stealth public key: S' = HDKD.publicSoft(S, chainCode)
  const stealthPubkey = HDKD.publicSoft(spendingPubkey, chainCode)

  // Encode as SS58 address
  const address = encodeAddress(stealthPubkey, networkId)

  return {
    address,
    pubkey: stealthPubkey,
    ephemeralPubkey,
    viewTag,
  }
}

// Scan an announcement to check if it's for us (receiver's perspective)
export function scanAnnouncement(
  viewingSecret: Uint8Array,
  spendingPubkey: Uint8Array,
  ephemeralPubkey: Uint8Array,
  viewTag: number,
  networkId: number = 42
): ScanResult | null {
  // Compute shared secret: ECDH(v, R)
  const sharedSecret = getSharedSecret(viewingSecret, ephemeralPubkey)

  // Quick rejection using view tag
  if (computeViewTag(sharedSecret) !== viewTag) {
    return null
  }

  // Hash shared secret for chain code
  const chainCode = hashSharedSecret(sharedSecret)

  // Derive stealth public key: S' = HDKD.publicSoft(S, chainCode)
  const stealthPubkey = HDKD.publicSoft(spendingPubkey, chainCode)

  // Encode as SS58 address
  const address = encodeAddress(stealthPubkey, networkId)

  return { address, pubkey: stealthPubkey }
}

// Derive spending key for matched stealth address (receiver's perspective)
export function deriveSpendingKey(
  spendingSecret: Uint8Array,
  viewingSecret: Uint8Array,
  ephemeralPubkey: Uint8Array
): Uint8Array {
  // Compute shared secret: ECDH(v, R)
  const sharedSecret = getSharedSecret(viewingSecret, ephemeralPubkey)

  // Hash shared secret for chain code
  const chainCode = hashSharedSecret(sharedSecret)

  // Derive spending secret: s' = HDKD.secretSoft(s, chainCode)
  return HDKD.secretSoft(spendingSecret, chainCode)
}

// Utility: bytes to hex
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Utility: hex to bytes
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16)
  }
  return bytes
}

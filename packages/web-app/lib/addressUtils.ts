'use client'

import { blake2b } from '@noble/hashes/blake2b'

const SS58_PREFIX = new Uint8Array([0x53, 0x53, 0x35, 0x38, 0x50, 0x52, 0x45]) // "SS58PRE"
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

function base58Decode(str: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const idx = BASE58_ALPHABET.indexOf(str[i])
    if (idx === -1) throw new Error('Invalid base58 character')

    let carry = idx
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  for (let i = 0; i < str.length && str[i] === BASE58_ALPHABET[0]; i++) {
    bytes.push(0)
  }

  return new Uint8Array(bytes.reverse())
}

// Decode SS58 address to get the public key
export function decodeAddress(address: string): { pubkey: Uint8Array; prefix: number } {
  const decoded = base58Decode(address)
  if (decoded.length < 35) throw new Error('Invalid SS58 address')

  let prefix: number
  let pubkeyStart: number

  if ((decoded[0] & 0x40) === 0) {
    prefix = decoded[0]
    pubkeyStart = 1
  } else {
    prefix = ((decoded[0] & 0x3f) << 2) | ((decoded[1] & 0xc0) >> 6) | ((decoded[1] & 0x3f) << 8)
    pubkeyStart = 2
  }

  const pubkey = decoded.slice(pubkeyStart, pubkeyStart + 32)
  const checksum = decoded.slice(pubkeyStart + 32)

  // Verify checksum
  const checksumInput = new Uint8Array(SS58_PREFIX.length + pubkeyStart + 32)
  checksumInput.set(SS58_PREFIX)
  checksumInput.set(decoded.slice(0, pubkeyStart + 32), SS58_PREFIX.length)
  const expectedChecksum = blake2b(checksumInput, { dkLen: 64 }).slice(0, 2)

  if (checksum[0] !== expectedChecksum[0] || checksum[1] !== expectedChecksum[1]) {
    throw new Error('Invalid SS58 checksum')
  }

  return { pubkey, prefix }
}

// Encode a public key as SS58 address
export function encodeAddress(pubkey: Uint8Array, networkId: number = 42): string {
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

// Convert SS58 address to H160 (EVM compatible)
// pallet_revive uses blake2 hash of the account ID, truncated to 20 bytes
export function ss58ToH160(ss58: string): `0x${string}` {
  const { pubkey } = decodeAddress(ss58)
  const hash = blake2b(pubkey, { dkLen: 32 })
  const h160 = hash.slice(0, 20)
  return `0x${bytesToHex(h160)}` as `0x${string}`
}

// Convert H160 to SS58 (reverse lookup not directly possible without mapping)
// This function encodes an H160 as if it were a public key (for display purposes)
// Note: This is not a true conversion - the original SS58 cannot be recovered
export function h160ToSs58(h160: string, prefix: number = 42): string {
  const cleanHex = h160.startsWith('0x') ? h160.slice(2) : h160
  if (cleanHex.length !== 40) throw new Error('Invalid H160 address')

  // Pad H160 (20 bytes) to 32 bytes for SS58 encoding
  const bytes = new Uint8Array(32)
  bytes.set(hexToBytes(cleanHex), 12)
  return encodeAddress(bytes, prefix)
}

// Check if a string is a valid EVM address
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Check if a string is a valid SS58 address
export function isValidSs58Address(address: string): boolean {
  try {
    decodeAddress(address)
    return true
  } catch {
    return false
  }
}

// Normalize an EVM address to checksum format
export function checksumAddress(address: string): `0x${string}` {
  const cleanAddress = address.toLowerCase().replace('0x', '')
  const hash = blake2b(new TextEncoder().encode(cleanAddress), { dkLen: 32 })
  const hashHex = bytesToHex(hash)

  let checksummed = '0x'
  for (let i = 0; i < cleanAddress.length; i++) {
    if (parseInt(hashHex[i], 16) >= 8) {
      checksummed += cleanAddress[i].toUpperCase()
    } else {
      checksummed += cleanAddress[i]
    }
  }
  return checksummed as `0x${string}`
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16)
  }
  return bytes
}

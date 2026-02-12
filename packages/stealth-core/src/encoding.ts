import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'

export function pubkeyToAddress(compressedPubkey: Uint8Array): `0x${string}` {
  const uncompressed = secp256k1.ProjectivePoint.fromHex(compressedPubkey).toRawBytes(false)
  const hash = keccak_256(uncompressed.slice(1))
  return `0x${bytesToHex(hash.slice(-20))}` as `0x${string}`
}

export function pubkeyToBytes32(compressedPubkey: Uint8Array): `0x${string}` {
  return `0x${bytesToHex(compressedPubkey.slice(1))}` as `0x${string}`
}

export function bytes32ToPubkey(bytes32: string): Uint8Array {
  const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32
  return hexToBytes('02' + hex)
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

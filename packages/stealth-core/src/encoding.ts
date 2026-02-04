import { ss58Address, ss58Decode } from '@polkadot-labs/hdkd-helpers';
import { blake2b } from '@noble/hashes/blake2b';

// Common network prefixes
export const NETWORK_IDS = {
  polkadot: 0,
  kusama: 2,
  substrate: 42,
  'asset-hub-polkadot': 0,  // Uses same prefix as relay chain
  'asset-hub-kusama': 2,    // Uses same prefix as relay chain
} as const;

/**
 * Encode a public key as an SS58 address
 *
 * @param pubkey - 32-byte sr25519 public key
 * @param networkId - SS58 network prefix (defaults to Polkadot)
 * @returns SS58 encoded address string
 */
export function encodeAddress(pubkey: Uint8Array, networkId: number = NETWORK_IDS.polkadot): string {
  return ss58Address(pubkey, networkId);
}

/**
 * Decode an SS58 address to get the public key and network prefix
 *
 * @param address - SS58 encoded address string
 * @returns Tuple of [publicKey, networkPrefix]
 */
export function decodeAddress(address: string): [Uint8Array, number] {
  return ss58Decode(address);
}

/**
 * Convert SS58 address to H160 (EVM compatible)
 * pallet_revive uses blake2 hash of the account ID, truncated to 20 bytes
 *
 * @param ss58 - SS58 encoded address string
 * @returns H160 address as hex string with 0x prefix
 */
export function ss58ToH160(ss58: string): `0x${string}` {
  const [pubkey] = decodeAddress(ss58);
  const hash = blake2b(pubkey, { dkLen: 32 });
  return `0x${bytesToHex(hash.slice(0, 20))}` as `0x${string}`;
}

/**
 * Convert H160 to SS58 address
 * Note: This is not a true reverse conversion - it encodes the H160 as a padded public key
 *
 * @param h160 - H160 address (with or without 0x prefix)
 * @param prefix - SS58 network prefix (defaults to 42/substrate)
 * @returns SS58 encoded address string
 */
export function h160ToSs58(h160: string, prefix: number = 42): string {
  const cleanHex = h160.startsWith('0x') ? h160.slice(2) : h160;
  if (cleanHex.length !== 40) throw new Error('Invalid H160 address');
  const bytes = new Uint8Array(32);
  bytes.set(hexToBytes(cleanHex), 12);
  return encodeAddress(bytes, prefix);
}

/**
 * Check if a string is a valid EVM address (H160)
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a string is a valid SS58 address
 */
export function isValidSs58Address(address: string): boolean {
  try {
    decodeAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

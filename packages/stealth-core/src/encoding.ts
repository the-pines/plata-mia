import { ss58Address, ss58Decode } from '@polkadot-labs/hdkd-helpers';

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

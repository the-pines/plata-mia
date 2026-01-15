/**
 * Supported chain identifiers for stealth payments
 */
export type ChainId = 'polkadot' | 'kusama' | 'asset-hub-polkadot' | 'asset-hub-kusama';

/**
 * A key pair consisting of a secret (private) key and public key
 */
export interface KeyPair {
  secret: Uint8Array;
  pubkey: Uint8Array;
}

/**
 * Stealth meta-address published by the receiver
 * Contains the public keys needed for senders to derive stealth addresses
 */
export interface StealthMetaAddress {
  spendingPubkey: Uint8Array;  // S - 32 bytes, sr25519 public key
  viewingPubkey: Uint8Array;   // V - 32 bytes, sr25519 public key
  preferredChain: ChainId;
  identifier?: string;
}

/**
 * Announcement published after sending a stealth payment
 * Contains the ephemeral public key and view tag for scanning
 */
export interface Announcement {
  ephemeralPubkey: Uint8Array; // R - 32 bytes
  viewTag: number;             // First byte of shared secret (0-255)
  blockHint: bigint;           // Approximate block number for scanning
}

/**
 * Result of deriving a stealth address for sending
 */
export interface DerivedAddress {
  address: string;             // SS58 encoded stealth address
  pubkey: Uint8Array;          // Raw public key bytes
  ephemeralPubkey: Uint8Array; // R to publish
  viewTag: number;             // View tag to publish
}

/**
 * Result of scanning - contains the stealth address and derived spending key
 */
export interface ScanResult {
  address: string;
  pubkey: Uint8Array;
}

export type ChainId = 'polkadot' | 'kusama' | 'asset-hub-polkadot' | 'asset-hub-kusama'

export interface KeyPair {
  secret: Uint8Array   // 32 bytes, secp256k1 private key
  pubkey: Uint8Array   // 33 bytes, compressed secp256k1 public key (always 0x02 prefix)
}

export interface StealthMetaAddress {
  spendingPubkey: Uint8Array  // S - 33 bytes, compressed secp256k1
  viewingPubkey: Uint8Array   // V - 33 bytes, compressed secp256k1
  preferredChain: ChainId
  identifier?: string
}

export interface Announcement {
  ephemeralPubkey: Uint8Array // R - 33 bytes, compressed secp256k1
  viewTag: number             // First byte of hashed shared secret (0-255)
  blockHint: bigint
}

export interface DerivedAddress {
  address: `0x${string}`     // H160 EVM address
  pubkey: Uint8Array         // 33 bytes, compressed stealth pubkey
  ephemeralPubkey: Uint8Array // R to publish
  viewTag: number
}

export interface ScanResult {
  address: `0x${string}`     // H160 EVM address
  pubkey: Uint8Array         // 33 bytes, compressed stealth pubkey
}

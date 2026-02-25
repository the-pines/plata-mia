# stealth-core

secp256k1 stealth address cryptography for EVM chains.

```
pnpm add @plata-mia/stealth-core
pnpm test
```

## API

```typescript
// Key generation
generateSpendingKeyPair(): KeyPair
generateViewingKeyPair(): KeyPair
createStealthMetaAddress(spending: KeyPair, viewing: KeyPair, preferredChain: ChainId): StealthMetaAddress

// Sender — derive one-time stealth address
deriveStealthAddress(spendingPubkey: Uint8Array, viewingPubkey: Uint8Array): DerivedAddress

// Receiver — scan announcement for match
scanAnnouncement(viewingSecret: Uint8Array, spendingPubkey: Uint8Array, ephemeralPubkey: Uint8Array, viewTag: number): ScanResult | null

// Receiver — derive private key to spend
deriveSpendingKey(spendingSecret: Uint8Array, viewingSecret: Uint8Array, ephemeralPubkey: Uint8Array): Uint8Array

// Utilities
computeViewTag(sharedSecret: Uint8Array): number
pubkeyToAddress(compressedPubkey: Uint8Array): `0x${string}`
pubkeyToBytes32(compressedPubkey: Uint8Array): `0x${string}`
bytes32ToPubkey(bytes32: `0x${string}`): Uint8Array
isValidEvmAddress(address: string): boolean
bytesToHex(bytes: Uint8Array): string
hexToBytes(hex: string): Uint8Array
```

## Usage

```typescript
import {
  generateSpendingKeyPair, generateViewingKeyPair, createStealthMetaAddress,
  deriveStealthAddress, scanAnnouncement, deriveSpendingKey,
} from '@plata-mia/stealth-core'

// Bob generates keys and publishes meta-address
const spending = generateSpendingKeyPair()
const viewing = generateViewingKeyPair()
const meta = createStealthMetaAddress(spending, viewing, 'polkadot')

// Alice derives stealth address and sends payment
const derived = deriveStealthAddress(meta.spendingPubkey, meta.viewingPubkey)
// → sends funds to derived.address
// → publishes { R: derived.ephemeralPubkey, viewTag: derived.viewTag }

// Bob scans announcement
const result = scanAnnouncement(viewing.secret, spending.pubkey, derived.ephemeralPubkey, derived.viewTag)
if (result) {
  const key = deriveSpendingKey(spending.secret, viewing.secret, derived.ephemeralPubkey)
  // Bob signs txs from the stealth address with key
}
```

Built on [@noble/curves](https://github.com/paulmillr/noble-curves) (secp256k1 ECDH) and [@noble/hashes](https://github.com/paulmillr/noble-hashes) (keccak_256).

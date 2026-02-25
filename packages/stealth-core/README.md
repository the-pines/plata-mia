# stealth-core

TypeScript library implementing secp256k1 stealth address cryptography for EVM chains.

## Install

```bash
pnpm add @plata-mia/stealth-core
```

## Test

```bash
pnpm test
```

## API

### Key Generation

```typescript
generateSpendingKeyPair(): KeyPair
generateViewingKeyPair(): KeyPair
createStealthMetaAddress(spending: KeyPair, viewing: KeyPair, preferredChain: ChainId): StealthMetaAddress
```

### Stealth Operations

```typescript
// Sender: derive one-time stealth address for payment
deriveStealthAddress(spendingPubkey: Uint8Array, viewingPubkey: Uint8Array): DerivedAddress

// Receiver: scan an announcement for a match
scanAnnouncement(viewingSecret: Uint8Array, spendingPubkey: Uint8Array, ephemeralPubkey: Uint8Array, viewTag: number): ScanResult | null

// Receiver: derive private key to spend from stealth address
deriveSpendingKey(spendingSecret: Uint8Array, viewingSecret: Uint8Array, ephemeralPubkey: Uint8Array): Uint8Array

// View tag computation (first byte of shared secret hash)
computeViewTag(sharedSecret: Uint8Array): number
```

### EVM Encoding

```typescript
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
  generateSpendingKeyPair,
  generateViewingKeyPair,
  createStealthMetaAddress,
  deriveStealthAddress,
  scanAnnouncement,
  deriveSpendingKey,
} from '@plata-mia/stealth-core'

// Bob generates keys and publishes meta-address
const spending = generateSpendingKeyPair()
const viewing = generateViewingKeyPair()
const meta = createStealthMetaAddress(spending, viewing, 'polkadot')

// Alice derives stealth address and sends payment
const derived = deriveStealthAddress(meta.spendingPubkey, meta.viewingPubkey)
// Alice sends funds to derived.address
// Alice publishes { R: derived.ephemeralPubkey, viewTag: derived.viewTag }

// Bob scans announcement
const result = scanAnnouncement(viewing.secret, spending.pubkey, derived.ephemeralPubkey, derived.viewTag)
if (result) {
  const key = deriveSpendingKey(spending.secret, viewing.secret, derived.ephemeralPubkey)
  // Bob uses key to sign txs from the stealth address
}
```

## Dependencies

- `@noble/curves` — secp256k1 ECDH
- `@noble/hashes` — keccak_256

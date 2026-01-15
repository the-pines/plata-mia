# stealth-core

TypeScript library implementing sr25519 stealth address cryptography for Polkadot.

## Installation

```bash
npm install @plata-mia/stealth-core
```

## Test

```bash
npm test
```

## API

```typescript
// Key generation
function generateSpendingKeyPair(): KeyPair
function generateViewingKeyPair(): KeyPair
function createStealthMetaAddress(spending: KeyPair, viewing: KeyPair, preferredChain: ChainId): StealthMetaAddress

// Sender: derive stealth address for payment
function deriveStealthAddress(spendingPubkey: Uint8Array, viewingPubkey: Uint8Array, networkId?: number): DerivedAddress

// Receiver: scan announcements for payments
function scanAnnouncement(viewingSecret: Uint8Array, spendingPubkey: Uint8Array, ephemeralPubkey: Uint8Array, viewTag: number, networkId?: number): ScanResult | null

// Receiver: derive key to spend from stealth address
function deriveSpendingKey(spendingSecret: Uint8Array, viewingSecret: Uint8Array, ephemeralPubkey: Uint8Array): Uint8Array

// Utilities
function encodeAddress(pubkey: Uint8Array, networkId?: number): string
function decodeAddress(address: string): [Uint8Array, number]
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
} from '@plata-mia/stealth-core';

// Bob generates keys and publishes meta-address
const spending = generateSpendingKeyPair();
const viewing = generateViewingKeyPair();
const metaAddress = createStealthMetaAddress(spending, viewing, 'asset-hub-polkadot');

// Alice derives stealth address and sends payment
const payment = deriveStealthAddress(metaAddress.spendingPubkey, metaAddress.viewingPubkey);
// Alice sends funds to payment.address
// Alice publishes { R: payment.ephemeralPubkey, viewTag: payment.viewTag }

// Bob scans announcements
const result = scanAnnouncement(viewing.secret, spending.pubkey, payment.ephemeralPubkey, payment.viewTag);
if (result) {
  // Payment found at result.address
  const key = deriveSpendingKey(spending.secret, viewing.secret, payment.ephemeralPubkey);
  // Bob uses key to sign transactions from the stealth address
}
```

## Dependencies

- `@scure/sr25519` - sr25519 ECDH and HDKD
- `@polkadot-labs/hdkd-helpers` - SS58 encoding
- `@noble/hashes` - blake2b

## Notes

- **Spending secret**: Must be stored securely (controls funds)
- **Viewing secret**: Can be shared with trusted parties (reveals payment history, not funds)
- **View tag**: First byte of shared secret, filters 99.6% of non-matching announcements

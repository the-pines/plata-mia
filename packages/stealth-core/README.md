# @plata-mia/stealth-core

TypeScript library implementing sr25519 stealth address cryptography for Polkadot.

## Installation

```bash
npm install @plata-mia/stealth-core
```

## Quick Start

```typescript
import {
  generateSpendingKeyPair,
  generateViewingKeyPair,
  createStealthMetaAddress,
  deriveStealthAddress,
  scanAnnouncement,
  deriveSpendingKey,
  NETWORK_IDS,
} from '@plata-mia/stealth-core';

// === Bob (Receiver) Setup ===
const spending = generateSpendingKeyPair();
const viewing = generateViewingKeyPair();
const metaAddress = createStealthMetaAddress(spending, viewing, 'asset-hub-polkadot');
// Bob publishes metaAddress.spendingPubkey and metaAddress.viewingPubkey to registry

// === Alice (Sender) Sends Payment ===
const payment = deriveStealthAddress(
  metaAddress.spendingPubkey,
  metaAddress.viewingPubkey,
  NETWORK_IDS['asset-hub-polkadot']
);
// Alice sends funds to: payment.address
// Alice publishes announcement: { R: payment.ephemeralPubkey, viewTag: payment.viewTag }

// === Bob Scans for Payments ===
const result = scanAnnouncement(
  viewing.secret,
  spending.pubkey,
  payment.ephemeralPubkey,
  payment.viewTag,
  NETWORK_IDS['asset-hub-polkadot']
);
// result.address === payment.address (it's for Bob!)

// === Bob Spends from Stealth Address ===
const spendingKey = deriveSpendingKey(
  spending.secret,
  viewing.secret,
  payment.ephemeralPubkey
);
// Bob uses spendingKey to sign transactions from the stealth address
```

## How It Works

This library implements dual-key stealth addresses using sr25519 elliptic curve cryptography.

### The Problem

On public blockchains, if someone knows your address, they can see all your incoming payments. Stealth addresses solve this by generating a unique, unlinkable address for each payment.

### The Solution

**Bob (receiver)** generates two key pairs:
- **Spending keys** `(s, S)` - controls funds
- **Viewing keys** `(v, V)` - detects payments

Bob publishes `(S, V)` to a registry. He keeps `s` and `v` secret.

**Alice (sender)** wants to pay Bob:
1. Looks up Bob's `(S, V)` from registry
2. Generates random ephemeral keys `(r, R)`
3. Computes shared secret: `ECDH(r, V)`
4. Derives one-time stealth address from `S` + shared secret
5. Sends funds to stealth address
6. Publishes `(R, viewTag)` as announcement

**Bob scans** announcements:
1. For each `(R, viewTag)`:
2. Computes shared secret: `ECDH(v, R)` (same as Alice's!)
3. Quick check: does `viewTag` match? (filters 255/256 non-matches)
4. Derives stealth address, checks for funds
5. If funds found, derives spending key to claim them

### View Tag Optimization

The view tag is the first byte of the shared secret. It allows Bob to reject 99.6% of non-matching announcements with a single byte comparison, avoiding expensive cryptographic operations.

## API Reference

### Key Generation

```typescript
function generateSpendingKeyPair(): KeyPair
function generateViewingKeyPair(): KeyPair
function createStealthMetaAddress(
  spending: KeyPair,
  viewing: KeyPair,
  preferredChain: ChainId,
  identifier?: string
): StealthMetaAddress
```

### Sender Operations

```typescript
function deriveStealthAddress(
  spendingPubkey: Uint8Array,
  viewingPubkey: Uint8Array,
  networkId?: number
): DerivedAddress
```

### Receiver Operations

```typescript
function scanAnnouncement(
  viewingSecret: Uint8Array,
  spendingPubkey: Uint8Array,
  ephemeralPubkey: Uint8Array,
  viewTag: number,
  networkId?: number
): ScanResult | null

function deriveSpendingKey(
  spendingSecret: Uint8Array,
  viewingSecret: Uint8Array,
  ephemeralPubkey: Uint8Array
): Uint8Array
```

## Dependencies

- `@scure/sr25519` - Audited sr25519 implementation (ECDH, HDKD)
- `@polkadot-labs/hdkd-helpers` - SS58 address encoding
- `@noble/hashes` - blake2b hashing

## Development

```bash
npm install
npm run build
npm test
```

## References

- [EIP-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
- [scure-sr25519](https://github.com/paulmillr/scure-sr25519)
- [Polkadot Cryptography](https://wiki.polkadot.com/learn/learn-cryptography/)

import { describe, it, expect } from 'vitest';
import { getPublicKey } from '@scure/sr25519';
import {
  generateSpendingKeyPair,
  generateViewingKeyPair,
  createStealthMetaAddress,
  deriveStealthAddress,
  scanAnnouncement,
  deriveSpendingKey,
  computeViewTag,
  encodeAddress,
  decodeAddress,
  NETWORK_IDS,
} from '../src/index.js';

describe('key generation', () => {
  it('generates valid spending key pair', () => {
    const pair = generateSpendingKeyPair();
    expect(pair.secret).toBeInstanceOf(Uint8Array);
    expect(pair.pubkey).toBeInstanceOf(Uint8Array);
    expect(pair.secret.length).toBe(64);
    expect(pair.pubkey.length).toBe(32);
  });

  it('generates valid viewing key pair', () => {
    const pair = generateViewingKeyPair();
    expect(pair.secret).toBeInstanceOf(Uint8Array);
    expect(pair.pubkey).toBeInstanceOf(Uint8Array);
    expect(pair.secret.length).toBe(64);
    expect(pair.pubkey.length).toBe(32);
  });

  it('generates unique keys each time', () => {
    const pair1 = generateSpendingKeyPair();
    const pair2 = generateSpendingKeyPair();
    expect(pair1.pubkey).not.toEqual(pair2.pubkey);
  });
});

describe('meta-address creation', () => {
  it('creates stealth meta-address with correct fields', () => {
    const spending = generateSpendingKeyPair();
    const viewing = generateViewingKeyPair();
    const meta = createStealthMetaAddress(spending, viewing, 'asset-hub-polkadot', 'alice');

    expect(meta.spendingPubkey).toBe(spending.pubkey);
    expect(meta.viewingPubkey).toBe(viewing.pubkey);
    expect(meta.preferredChain).toBe('asset-hub-polkadot');
    expect(meta.identifier).toBe('alice');
  });
});

describe('stealth address derivation', () => {
  it('derives valid stealth address', () => {
    const spending = generateSpendingKeyPair();
    const viewing = generateViewingKeyPair();

    const result = deriveStealthAddress(spending.pubkey, viewing.pubkey);

    expect(result.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/); // SS58 format
    expect(result.pubkey.length).toBe(32);
    expect(result.ephemeralPubkey.length).toBe(32);
    expect(result.viewTag).toBeGreaterThanOrEqual(0);
    expect(result.viewTag).toBeLessThanOrEqual(255);
  });

  it('generates unique stealth addresses each time', () => {
    const spending = generateSpendingKeyPair();
    const viewing = generateViewingKeyPair();

    const result1 = deriveStealthAddress(spending.pubkey, viewing.pubkey);
    const result2 = deriveStealthAddress(spending.pubkey, viewing.pubkey);

    expect(result1.address).not.toBe(result2.address);
    expect(result1.ephemeralPubkey).not.toEqual(result2.ephemeralPubkey);
  });
});

describe('announcement scanning', () => {
  it('detects matching announcements', () => {
    const spending = generateSpendingKeyPair();
    const viewing = generateViewingKeyPair();

    // Alice derives stealth address
    const derived = deriveStealthAddress(spending.pubkey, viewing.pubkey);

    // Bob scans the announcement
    const scanned = scanAnnouncement(
      viewing.secret,
      spending.pubkey,
      derived.ephemeralPubkey,
      derived.viewTag
    );

    expect(scanned).not.toBeNull();
    expect(scanned!.address).toBe(derived.address);
  });

  it('rejects non-matching announcements with wrong view tag', () => {
    const spending = generateSpendingKeyPair();
    const viewing = generateViewingKeyPair();

    const derived = deriveStealthAddress(spending.pubkey, viewing.pubkey);

    // Try with wrong view tag
    const wrongViewTag = (derived.viewTag + 1) % 256;
    const scanned = scanAnnouncement(
      viewing.secret,
      spending.pubkey,
      derived.ephemeralPubkey,
      wrongViewTag
    );

    expect(scanned).toBeNull();
  });

  it('rejects announcements for different recipients', () => {
    const spending1 = generateSpendingKeyPair();
    const viewing1 = generateViewingKeyPair();
    const spending2 = generateSpendingKeyPair();
    const viewing2 = generateViewingKeyPair();

    // Alice sends to Bob1
    const derived = deriveStealthAddress(spending1.pubkey, viewing1.pubkey);

    // Bob2 tries to scan (should fail or find different address)
    const scanned = scanAnnouncement(
      viewing2.secret,
      spending2.pubkey,
      derived.ephemeralPubkey,
      derived.viewTag
    );

    // Either null (view tag mismatch) or different address
    if (scanned !== null) {
      expect(scanned.address).not.toBe(derived.address);
    }
  });
});

describe('spending key derivation', () => {
  it('derives valid spending key', () => {
    const spending = generateSpendingKeyPair();
    const viewing = generateViewingKeyPair();

    const derived = deriveStealthAddress(spending.pubkey, viewing.pubkey);

    const spendingKey = deriveSpendingKey(
      spending.secret,
      viewing.secret,
      derived.ephemeralPubkey
    );

    expect(spendingKey).toBeInstanceOf(Uint8Array);
    expect(spendingKey.length).toBe(64);
  });

  it('derived spending key produces correct public key', () => {
    const spending = generateSpendingKeyPair();
    const viewing = generateViewingKeyPair();

    const derived = deriveStealthAddress(spending.pubkey, viewing.pubkey);

    const spendingKey = deriveSpendingKey(
      spending.secret,
      viewing.secret,
      derived.ephemeralPubkey
    );

    // The derived spending key should produce the same public key as the stealth address
    const derivedPubkey = getPublicKey(spendingKey);
    expect(derivedPubkey).toEqual(derived.pubkey);
  });
});

describe('full round trip', () => {
  it('complete flow: generate → derive → scan → spend', () => {
    // Bob generates his keys and creates meta-address
    const bobSpending = generateSpendingKeyPair();
    const bobViewing = generateViewingKeyPair();
    const bobMeta = createStealthMetaAddress(
      bobSpending,
      bobViewing,
      'asset-hub-polkadot',
      'bob'
    );

    // Alice looks up Bob's meta-address and derives stealth address
    const payment = deriveStealthAddress(
      bobMeta.spendingPubkey,
      bobMeta.viewingPubkey,
      NETWORK_IDS['asset-hub-polkadot']
    );

    // Alice publishes announcement (R, viewTag, blockHint)
    const announcement = {
      ephemeralPubkey: payment.ephemeralPubkey,
      viewTag: payment.viewTag,
      blockHint: BigInt(12345),
    };

    // Bob scans announcements
    const scanned = scanAnnouncement(
      bobViewing.secret,
      bobSpending.pubkey,
      announcement.ephemeralPubkey,
      announcement.viewTag,
      NETWORK_IDS['asset-hub-polkadot']
    );

    expect(scanned).not.toBeNull();
    expect(scanned!.address).toBe(payment.address);

    // Bob derives spending key
    const spendingKey = deriveSpendingKey(
      bobSpending.secret,
      bobViewing.secret,
      announcement.ephemeralPubkey
    );

    // Verify the spending key produces the correct stealth address
    const derivedPubkey = getPublicKey(spendingKey);
    const derivedAddress = encodeAddress(derivedPubkey, NETWORK_IDS['asset-hub-polkadot']);

    expect(derivedAddress).toBe(payment.address);
  });
});

describe('address encoding', () => {
  it('encodes and decodes addresses correctly', () => {
    const spending = generateSpendingKeyPair();
    const address = encodeAddress(spending.pubkey, NETWORK_IDS.polkadot);

    const [decodedPubkey, prefix] = decodeAddress(address);

    expect(decodedPubkey).toEqual(spending.pubkey);
    expect(prefix).toBe(NETWORK_IDS.polkadot);
  });

  it('uses different prefixes for different networks', () => {
    const spending = generateSpendingKeyPair();

    const polkadotAddr = encodeAddress(spending.pubkey, NETWORK_IDS.polkadot);
    const kusamaAddr = encodeAddress(spending.pubkey, NETWORK_IDS.kusama);

    expect(polkadotAddr).not.toBe(kusamaAddr);
    expect(polkadotAddr[0]).toBe('1'); // Polkadot addresses start with 1
    // Kusama addresses start with different characters
  });
});

describe('view tag', () => {
  it('computes view tag as first byte', () => {
    const testCases = [
      new Uint8Array([0, 1, 2, 3]),
      new Uint8Array([255, 1, 2, 3]),
      new Uint8Array([128, 0, 0, 0]),
    ];

    for (const input of testCases) {
      expect(computeViewTag(input)).toBe(input[0]);
    }
  });
});

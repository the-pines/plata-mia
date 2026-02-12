import { describe, it, expect } from 'vitest'
import { secp256k1 } from '@noble/curves/secp256k1'
import {
  generateSpendingKeyPair,
  generateViewingKeyPair,
  createStealthMetaAddress,
  deriveStealthAddress,
  scanAnnouncement,
  deriveSpendingKey,
  computeViewTag,
  pubkeyToAddress,
  pubkeyToBytes32,
  bytes32ToPubkey,
  isValidEvmAddress,
  bytesToHex,
  hexToBytes,
} from '../src/index.js'

describe('key generation', () => {
  it('generates valid spending key pair', () => {
    const pair = generateSpendingKeyPair()
    expect(pair.secret).toBeInstanceOf(Uint8Array)
    expect(pair.pubkey).toBeInstanceOf(Uint8Array)
    expect(pair.secret.length).toBe(32)
    expect(pair.pubkey.length).toBe(33)
  })

  it('generates valid viewing key pair', () => {
    const pair = generateViewingKeyPair()
    expect(pair.secret).toBeInstanceOf(Uint8Array)
    expect(pair.pubkey).toBeInstanceOf(Uint8Array)
    expect(pair.secret.length).toBe(32)
    expect(pair.pubkey.length).toBe(33)
  })

  it('always generates even-y keys (0x02 prefix)', () => {
    for (let i = 0; i < 20; i++) {
      const pair = generateSpendingKeyPair()
      expect(pair.pubkey[0]).toBe(0x02)
    }
  })

  it('generates unique keys each time', () => {
    const pair1 = generateSpendingKeyPair()
    const pair2 = generateSpendingKeyPair()
    expect(pair1.pubkey).not.toEqual(pair2.pubkey)
  })
})

describe('meta-address creation', () => {
  it('creates stealth meta-address with correct fields', () => {
    const spending = generateSpendingKeyPair()
    const viewing = generateViewingKeyPair()
    const meta = createStealthMetaAddress(spending, viewing, 'asset-hub-polkadot', 'alice')

    expect(meta.spendingPubkey).toBe(spending.pubkey)
    expect(meta.viewingPubkey).toBe(viewing.pubkey)
    expect(meta.preferredChain).toBe('asset-hub-polkadot')
    expect(meta.identifier).toBe('alice')
  })
})

describe('stealth address derivation', () => {
  it('derives valid H160 stealth address', () => {
    const spending = generateSpendingKeyPair()
    const viewing = generateViewingKeyPair()

    const result = deriveStealthAddress(spending.pubkey, viewing.pubkey)

    expect(result.address).toMatch(/^0x[a-f0-9]{40}$/)
    expect(result.pubkey.length).toBe(33)
    expect(result.ephemeralPubkey.length).toBe(33)
    expect(result.ephemeralPubkey[0]).toBe(0x02)
    expect(result.viewTag).toBeGreaterThanOrEqual(0)
    expect(result.viewTag).toBeLessThanOrEqual(255)
  })

  it('generates unique stealth addresses each time', () => {
    const spending = generateSpendingKeyPair()
    const viewing = generateViewingKeyPair()

    const result1 = deriveStealthAddress(spending.pubkey, viewing.pubkey)
    const result2 = deriveStealthAddress(spending.pubkey, viewing.pubkey)

    expect(result1.address).not.toBe(result2.address)
    expect(result1.ephemeralPubkey).not.toEqual(result2.ephemeralPubkey)
  })
})

describe('announcement scanning', () => {
  it('detects matching announcements', () => {
    const spending = generateSpendingKeyPair()
    const viewing = generateViewingKeyPair()

    const derived = deriveStealthAddress(spending.pubkey, viewing.pubkey)

    const scanned = scanAnnouncement(
      viewing.secret,
      spending.pubkey,
      derived.ephemeralPubkey,
      derived.viewTag
    )

    expect(scanned).not.toBeNull()
    expect(scanned!.address).toBe(derived.address)
  })

  it('rejects non-matching announcements with wrong view tag', () => {
    const spending = generateSpendingKeyPair()
    const viewing = generateViewingKeyPair()

    const derived = deriveStealthAddress(spending.pubkey, viewing.pubkey)

    const wrongViewTag = (derived.viewTag + 1) % 256
    const scanned = scanAnnouncement(
      viewing.secret,
      spending.pubkey,
      derived.ephemeralPubkey,
      wrongViewTag
    )

    expect(scanned).toBeNull()
  })

  it('rejects announcements for different recipients', () => {
    const spending1 = generateSpendingKeyPair()
    const viewing1 = generateViewingKeyPair()
    const spending2 = generateSpendingKeyPair()
    const viewing2 = generateViewingKeyPair()

    const derived = deriveStealthAddress(spending1.pubkey, viewing1.pubkey)

    const scanned = scanAnnouncement(
      viewing2.secret,
      spending2.pubkey,
      derived.ephemeralPubkey,
      derived.viewTag
    )

    if (scanned !== null) {
      expect(scanned.address).not.toBe(derived.address)
    }
  })
})

describe('spending key derivation', () => {
  it('derives a 32-byte spending key', () => {
    const spending = generateSpendingKeyPair()
    const viewing = generateViewingKeyPair()

    const derived = deriveStealthAddress(spending.pubkey, viewing.pubkey)

    const spendingKey = deriveSpendingKey(
      spending.secret,
      viewing.secret,
      derived.ephemeralPubkey
    )

    expect(spendingKey).toBeInstanceOf(Uint8Array)
    expect(spendingKey.length).toBe(32)
  })

  it('derived spending key produces the correct stealth address', () => {
    const spending = generateSpendingKeyPair()
    const viewing = generateViewingKeyPair()

    const derived = deriveStealthAddress(spending.pubkey, viewing.pubkey)

    const spendingKey = deriveSpendingKey(
      spending.secret,
      viewing.secret,
      derived.ephemeralPubkey
    )

    const derivedPubkey = secp256k1.getPublicKey(spendingKey, true)
    const derivedAddress = pubkeyToAddress(derivedPubkey)

    expect(derivedAddress).toBe(derived.address)
  })
})

describe('full round trip', () => {
  it('complete flow: generate -> derive -> scan -> spend', () => {
    const bobSpending = generateSpendingKeyPair()
    const bobViewing = generateViewingKeyPair()
    const bobMeta = createStealthMetaAddress(
      bobSpending,
      bobViewing,
      'asset-hub-polkadot',
      'bob'
    )

    const payment = deriveStealthAddress(
      bobMeta.spendingPubkey,
      bobMeta.viewingPubkey
    )

    const announcement = {
      ephemeralPubkey: payment.ephemeralPubkey,
      viewTag: payment.viewTag,
      blockHint: BigInt(12345),
    }

    const scanned = scanAnnouncement(
      bobViewing.secret,
      bobSpending.pubkey,
      announcement.ephemeralPubkey,
      announcement.viewTag
    )

    expect(scanned).not.toBeNull()
    expect(scanned!.address).toBe(payment.address)

    const spendingKey = deriveSpendingKey(
      bobSpending.secret,
      bobViewing.secret,
      announcement.ephemeralPubkey
    )

    const derivedPubkey = secp256k1.getPublicKey(spendingKey, true)
    const derivedAddress = pubkeyToAddress(derivedPubkey)

    expect(derivedAddress).toBe(payment.address)
  })
})

describe('encoding', () => {
  it('pubkeyToAddress produces valid H160', () => {
    const pair = generateSpendingKeyPair()
    const address = pubkeyToAddress(pair.pubkey)
    expect(address).toMatch(/^0x[a-f0-9]{40}$/)
  })

  it('pubkeyToBytes32 and bytes32ToPubkey roundtrip', () => {
    const pair = generateSpendingKeyPair()
    const bytes32 = pubkeyToBytes32(pair.pubkey)

    expect(bytes32).toMatch(/^0x[a-f0-9]{64}$/)

    const recovered = bytes32ToPubkey(bytes32)
    expect(recovered).toEqual(pair.pubkey)
  })

  it('pubkeyToAddress is deterministic', () => {
    const pair = generateSpendingKeyPair()
    const addr1 = pubkeyToAddress(pair.pubkey)
    const addr2 = pubkeyToAddress(pair.pubkey)
    expect(addr1).toBe(addr2)
  })
})

describe('view tag', () => {
  it('computes view tag as first byte', () => {
    const testCases = [
      new Uint8Array([0, 1, 2, 3]),
      new Uint8Array([255, 1, 2, 3]),
      new Uint8Array([128, 0, 0, 0]),
    ]

    for (const input of testCases) {
      expect(computeViewTag(input)).toBe(input[0])
    }
  })
})

describe('address validation', () => {
  it('isValidEvmAddress accepts valid H160', () => {
    expect(isValidEvmAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true)
    expect(isValidEvmAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true)
  })

  it('isValidEvmAddress rejects invalid addresses', () => {
    expect(isValidEvmAddress('0x1234')).toBe(false)
    expect(isValidEvmAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false)
    expect(isValidEvmAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false)
  })
})

describe('hex utilities', () => {
  it('bytesToHex converts correctly', () => {
    expect(bytesToHex(new Uint8Array([0, 1, 255, 16]))).toBe('0001ff10')
    expect(bytesToHex(new Uint8Array([]))).toBe('')
  })

  it('hexToBytes converts correctly', () => {
    expect(hexToBytes('0001ff10')).toEqual(new Uint8Array([0, 1, 255, 16]))
    expect(hexToBytes('0x0001ff10')).toEqual(new Uint8Array([0, 1, 255, 16]))
  })

  it('bytesToHex and hexToBytes roundtrip', () => {
    const original = new Uint8Array([0, 127, 255, 1, 128])
    const hex = bytesToHex(original)
    const result = hexToBytes(hex)
    expect(result).toEqual(original)
  })
})

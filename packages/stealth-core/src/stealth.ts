import { getPublicKey, getSharedSecret, secretFromSeed, HDKD } from '@scure/sr25519';
import { blake2b } from '@noble/hashes/blake2';
import { randomBytes } from '@noble/hashes/utils';
import { encodeAddress } from './encoding.js';
import type { DerivedAddress, ScanResult } from './types.js';

/**
 * Compute the view tag from a shared secret (first byte)
 */
export function computeViewTag(sharedSecret: Uint8Array): number {
  return sharedSecret[0];
}

/**
 * Hash the shared secret for use as a chain code in derivation
 */
function hashSharedSecret(sharedSecret: Uint8Array): Uint8Array {
  return blake2b(sharedSecret, { dkLen: 32 });
}

/**
 * Derive a stealth address for sending a payment (Alice's perspective)
 *
 * @param spendingPubkey - Recipient's spending public key (S)
 * @param viewingPubkey - Recipient's viewing public key (V)
 * @param networkId - SS58 network prefix
 * @returns Derived stealth address with ephemeral pubkey and view tag
 */
export function deriveStealthAddress(
  spendingPubkey: Uint8Array,
  viewingPubkey: Uint8Array,
  networkId?: number
): DerivedAddress {
  // Generate ephemeral key pair (r, R)
  const ephemeralSeed = randomBytes(32);
  const ephemeralSecret = secretFromSeed(ephemeralSeed);
  const ephemeralPubkey = getPublicKey(ephemeralSecret);

  // Compute shared secret: ECDH(r, V)
  const sharedSecret = getSharedSecret(ephemeralSecret, viewingPubkey);

  // Compute view tag
  const viewTag = computeViewTag(sharedSecret);

  // Hash shared secret for chain code
  const chainCode = hashSharedSecret(sharedSecret);

  // Derive stealth public key: S' = HDKD.publicSoft(S, hash(shared))
  const stealthPubkey = HDKD.publicSoft(spendingPubkey, chainCode);

  // Encode as SS58 address
  const address = encodeAddress(stealthPubkey, networkId);

  return {
    address,
    pubkey: stealthPubkey,
    ephemeralPubkey,
    viewTag,
  };
}

/**
 * Scan an announcement to check if it's for us (Bob's perspective)
 *
 * @param viewingSecret - Our viewing secret key (v)
 * @param spendingPubkey - Our spending public key (S)
 * @param ephemeralPubkey - Ephemeral public key from announcement (R)
 * @param viewTag - View tag from announcement
 * @param networkId - SS58 network prefix
 * @returns Stealth address if the announcement matches, null otherwise
 */
export function scanAnnouncement(
  viewingSecret: Uint8Array,
  spendingPubkey: Uint8Array,
  ephemeralPubkey: Uint8Array,
  viewTag: number,
  networkId?: number
): ScanResult | null {
  // Compute shared secret: ECDH(v, R)
  const sharedSecret = getSharedSecret(viewingSecret, ephemeralPubkey);

  // Quick rejection using view tag
  if (computeViewTag(sharedSecret) !== viewTag) {
    return null;
  }

  // Hash shared secret for chain code
  const chainCode = hashSharedSecret(sharedSecret);

  // Derive stealth public key: S' = HDKD.publicSoft(S, hash(shared))
  const stealthPubkey = HDKD.publicSoft(spendingPubkey, chainCode);

  // Encode as SS58 address
  const address = encodeAddress(stealthPubkey, networkId);

  return { address, pubkey: stealthPubkey };
}

/**
 * Derive the spending key for a matched stealth address (Bob's perspective)
 *
 * @param spendingSecret - Our spending secret key (s)
 * @param viewingSecret - Our viewing secret key (v)
 * @param ephemeralPubkey - Ephemeral public key from announcement (R)
 * @returns Derived secret key for spending from the stealth address
 */
export function deriveSpendingKey(
  spendingSecret: Uint8Array,
  viewingSecret: Uint8Array,
  ephemeralPubkey: Uint8Array
): Uint8Array {
  // Compute shared secret: ECDH(v, R)
  const sharedSecret = getSharedSecret(viewingSecret, ephemeralPubkey);

  // Hash shared secret for chain code
  const chainCode = hashSharedSecret(sharedSecret);

  // Derive spending secret: s' = HDKD.secretSoft(s, hash(shared))
  return HDKD.secretSoft(spendingSecret, chainCode);
}

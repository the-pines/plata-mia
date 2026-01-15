import { getPublicKey, secretFromSeed } from '@scure/sr25519';
import { randomBytes } from '@noble/hashes/utils';
import type { KeyPair, StealthMetaAddress, ChainId } from './types.js';

/**
 * Generate a random sr25519 key pair
 */
function generateKeyPair(): KeyPair {
  const seed = randomBytes(32);
  const secret = secretFromSeed(seed);
  const pubkey = getPublicKey(secret);
  return { secret, pubkey };
}

/**
 * Generate a spending key pair for stealth address derivation
 */
export function generateSpendingKeyPair(): KeyPair {
  return generateKeyPair();
}

/**
 * Generate a viewing key pair for stealth address scanning
 */
export function generateViewingKeyPair(): KeyPair {
  return generateKeyPair();
}

/**
 * Create a stealth meta-address from spending and viewing key pairs
 */
export function createStealthMetaAddress(
  spending: KeyPair,
  viewing: KeyPair,
  preferredChain: ChainId,
  identifier?: string
): StealthMetaAddress {
  return {
    spendingPubkey: spending.pubkey,
    viewingPubkey: viewing.pubkey,
    preferredChain,
    identifier,
  };
}

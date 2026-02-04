// Types
export type {
  ChainId,
  KeyPair,
  StealthMetaAddress,
  Announcement,
  DerivedAddress,
  ScanResult,
} from './types.js';

// Key generation
export {
  generateSpendingKeyPair,
  generateViewingKeyPair,
  createStealthMetaAddress,
} from './keys.js';

// Stealth operations
export {
  computeViewTag,
  deriveStealthAddress,
  scanAnnouncement,
  deriveSpendingKey,
} from './stealth.js';

// Address encoding
export {
  encodeAddress,
  decodeAddress,
  NETWORK_IDS,
  ss58ToH160,
  h160ToSs58,
  isValidEvmAddress,
  isValidSs58Address,
  bytesToHex,
  hexToBytes,
} from './encoding.js';

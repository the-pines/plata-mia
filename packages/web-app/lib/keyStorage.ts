import { sha256 } from '@noble/hashes/sha256'

export interface StoredKeys {
  spendingSecret: string
  spendingPubkey: string
  viewingSecret: string
  viewingPubkey: string
  hint?: string
}

interface EncryptedPayload {
  ciphertext: string
  iv: string
}

type WalletSigner = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getSignMessage(address: string): string {
  return [
    'Plata Mia: Encrypt stealth keys\n',
    'This signature encrypts your stealth keys in this browser.',
    'It does NOT authorize any transaction or transfer of funds.\n',
    `Address: ${address}`,
  ].join('\n')
}

async function deriveKey(material: Uint8Array): Promise<CryptoKey> {
  const hash = sha256(material)
  const buf = new ArrayBuffer(hash.byteLength)
  new Uint8Array(buf).set(hash)
  return crypto.subtle.importKey('raw', buf, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

async function encrypt(
  keys: StoredKeys,
  cryptoKey: CryptoKey
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(keys))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  )
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

async function decrypt(
  payload: EncryptedPayload,
  cryptoKey: CryptoKey
): Promise<StoredKeys> {
  const ciphertext = Uint8Array.from(atob(payload.ciphertext), (c) =>
    c.charCodeAt(0)
  )
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  )
  return JSON.parse(new TextDecoder().decode(decrypted))
}

function storageKey(address: string): string {
  return `plata-mia:keys:${address.toLowerCase()}`
}

async function requestEncryptionKey(
  walletType: 'metamask' | 'polkadotjs',
  signer: unknown,
  address: string,
  password?: string
): Promise<CryptoKey> {
  if (walletType === 'metamask') {
    const eth = signer as WalletSigner
    const message = getSignMessage(address)
    const sig = (await eth.request({
      method: 'personal_sign',
      params: [message, address],
    })) as string
    return deriveKey(new TextEncoder().encode(sig))
  }

  if (!password) {
    throw new Error('Password required for Polkadot.js key encryption')
  }
  return deriveKey(new TextEncoder().encode(password))
}

export async function storeKeys(
  keys: StoredKeys,
  walletType: 'metamask' | 'polkadotjs',
  signer: unknown,
  address: string,
  password?: string
): Promise<void> {
  const cryptoKey = await requestEncryptionKey(
    walletType,
    signer,
    address,
    password
  )
  const payload = await encrypt(keys, cryptoKey)
  localStorage.setItem(storageKey(address), JSON.stringify(payload))
}

export async function loadKeys(
  walletType: 'metamask' | 'polkadotjs',
  signer: unknown,
  address: string,
  password?: string
): Promise<StoredKeys> {
  const raw = localStorage.getItem(storageKey(address))
  if (!raw) throw new Error('No stored keys found')

  const payload: EncryptedPayload = JSON.parse(raw)
  const cryptoKey = await requestEncryptionKey(
    walletType,
    signer,
    address,
    password
  )
  return decrypt(payload, cryptoKey)
}

export function hasStoredKeys(address: string): boolean {
  return localStorage.getItem(storageKey(address)) !== null
}

export function clearKeys(address: string): void {
  localStorage.removeItem(storageKey(address))
}

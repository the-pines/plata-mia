import { ContractPromise } from '@polkadot/api-contract'
import { blake2b } from '@noble/hashes/blake2b'
import { REGISTRY_CONTRACT_ADDRESS } from '@/lib/constants'
import registryAbi from '@/contracts/registry.json'

export interface StealthMetaAddress {
  spendingKey: string
  viewingKey: string
  preferredChain: number
}

interface RegisterOptions {
  hint: string
  spendingKey: string
  viewingKey: string
  preferredChain: number
  callerAddress: string
  api: unknown
  onStatusChange?: (status: string) => void
}

interface LookupOptions {
  hint: string
  api: unknown | null
}

let devMode = true
const mockRegistry = new Map<string, StealthMetaAddress>()

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16)
  }
  return bytes
}

export function hashHint(hint: string): Uint8Array {
  const encoder = new TextEncoder()
  return blake2b(encoder.encode(hint.toLowerCase().trim()), { dkLen: 32 })
}

function createGasLimit(api: unknown): unknown {
  const typedApi = api as { registry: { createType: (t: string, v: unknown) => unknown } }
  return typedApi.registry.createType('WeightV2', {
    refTime: 10_000_000_000n,
    proofSize: 262144n,
  })
}

async function checkContractAvailability(api: unknown): Promise<boolean> {
  if (!REGISTRY_CONTRACT_ADDRESS) {
    console.warn('[Registry] No contract address configured')
    devMode = true
    return false
  }

  try {
    const contract = new ContractPromise(api as never, registryAbi, REGISTRY_CONTRACT_ADDRESS)
    const testIdentifier = new Uint8Array(32).fill(0)
    const gasLimit = createGasLimit(api)

    await contract.query.lookup(
      REGISTRY_CONTRACT_ADDRESS,
      { gasLimit } as never,
      testIdentifier
    )

    devMode = false
    console.log('[Registry] Contract available')
    return true
  } catch (err) {
    console.warn('[Registry] Contract unavailable, using mock fallback:', err)
    devMode = true
    return false
  }
}

export function isDevMode(): boolean {
  return devMode
}

export async function register(options: RegisterOptions): Promise<{ success: boolean; identifier: string }> {
  const { hint, spendingKey, viewingKey, preferredChain, callerAddress, api, onStatusChange } = options

  const identifier = hashHint(hint)
  const identifierHex = bytesToHex(identifier)

  const isAvailable = await checkContractAvailability(api)

  if (!isAvailable) {
    onStatusChange?.('Using mock registry...')
    await new Promise(resolve => setTimeout(resolve, 200))

    if (mockRegistry.has(identifierHex)) {
      throw new Error('Hint already registered')
    }

    mockRegistry.set(identifierHex, {
      spendingKey,
      viewingKey,
      preferredChain,
    })

    console.log('[Registry mock] Registered:', { hint, identifier: identifierHex.slice(0, 16) + '...' })
    return { success: true, identifier: identifierHex }
  }

  const contract = new ContractPromise(api as never, registryAbi, REGISTRY_CONTRACT_ADDRESS)
  const { web3FromAddress } = await import('@polkadot/extension-dapp')
  const injector = await web3FromAddress(callerAddress)

  const spendingKeyBytes = hexToBytes(spendingKey)
  const viewingKeyBytes = hexToBytes(viewingKey)
  const gasLimit = createGasLimit(api)

  onStatusChange?.('Estimating gas...')

  const { gasRequired, result: dryRunResult } = await contract.query.register(
    callerAddress,
    { gasLimit } as never,
    identifier,
    spendingKeyBytes,
    viewingKeyBytes,
    preferredChain
  )

  if (dryRunResult.isErr) {
    throw new Error(`Contract call would fail: ${dryRunResult.asErr.toString()}`)
  }

  onStatusChange?.('Please sign the transaction...')

  const typedApi = api as {
    events: {
      system: {
        ExtrinsicFailed: {
          is: (event: unknown) => boolean
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    contract.tx
      .register(
        { gasLimit: gasRequired },
        identifier,
        spendingKeyBytes,
        viewingKeyBytes,
        preferredChain
      )
      .signAndSend(callerAddress, { signer: injector.signer as never }, (result) => {
        if (result.status.isInBlock) {
          onStatusChange?.('Transaction in block...')
        }
        if (result.status.isFinalized) {
          const failed = result.events.find(({ event }) =>
            typedApi.events.system.ExtrinsicFailed.is(event)
          )
          if (failed) {
            reject(new Error('Transaction failed'))
          } else {
            console.log('[Registry] Registered:', { hint, identifier: identifierHex.slice(0, 16) + '...' })
            resolve({ success: true, identifier: identifierHex })
          }
        }
        if (result.isError) {
          reject(new Error('Transaction error'))
        }
      })
      .catch(reject)
  })
}

export async function lookup(options: LookupOptions): Promise<StealthMetaAddress | null> {
  const { hint, api } = options

  const identifier = hashHint(hint)
  const identifierHex = bytesToHex(identifier)

  if (!api) {
    await new Promise(resolve => setTimeout(resolve, 100))
    const result = mockRegistry.get(identifierHex) || null
    console.log('[Registry mock] Lookup:', { hint, found: !!result })
    return result
  }

  const isAvailable = await checkContractAvailability(api)

  if (!isAvailable) {
    await new Promise(resolve => setTimeout(resolve, 100))
    const result = mockRegistry.get(identifierHex) || null
    console.log('[Registry mock] Lookup:', { hint, found: !!result })
    return result
  }

  const contract = new ContractPromise(api as never, registryAbi, REGISTRY_CONTRACT_ADDRESS)
  const gasLimit = createGasLimit(api)

  const { result, output } = await contract.query.lookup(
    REGISTRY_CONTRACT_ADDRESS,
    { gasLimit } as never,
    identifier
  )

  if (result.isOk && output) {
    const value = output.toHuman() as { Ok?: { spendingKey: string; viewingKey: string; preferredChain: string } | null }

    if (value?.Ok) {
      const spendingKeyHex = value.Ok.spendingKey.replace('0x', '')
      const viewingKeyHex = value.Ok.viewingKey.replace('0x', '')
      const chain = parseInt(value.Ok.preferredChain.replace(/,/g, ''), 10)

      console.log('[Registry] Lookup:', { hint, found: true })
      return {
        spendingKey: spendingKeyHex,
        viewingKey: viewingKeyHex,
        preferredChain: chain,
      }
    }
  }

  console.log('[Registry] Lookup:', { hint, found: false })
  return null
}

// Adapter for calling Solidity contracts via pallet_revive on Substrate chains
// Uses Polkadot.js API to call revive.call extrinsic

import { encodeFunctionData, decodeFunctionResult } from 'viem'
import type { ApiPromise } from '@polkadot/api'
import type { Signer } from '@polkadot/types/types'

export interface CallOptions {
  value?: bigint
  gasLimit?: bigint
  storageDepositLimit?: bigint | null
}

const DEFAULT_GAS_LIMIT = 4_294_967_295n // max u32

// Encode a function call for a Solidity contract
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encodeCall(abi: any, functionName: string, args: unknown[]): `0x${string}` {
  return encodeFunctionData({ abi, functionName, args })
}

// Decode a return value from a Solidity contract
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeResult(abi: any, functionName: string, data: `0x${string}`): unknown {
  return decodeFunctionResult({ abi, functionName, data })
}

// Call a Solidity contract via revive.call (state-changing transaction)
export async function callContract(
  api: ApiPromise,
  contractAddress: string,
  callData: `0x${string}`,
  signerAddress: string,
  signer: Signer,
  options: CallOptions = {}
): Promise<{ blockHash: string; txHash: string }> {
  const {
    value = 0n,
    gasLimit = DEFAULT_GAS_LIMIT,
    storageDepositLimit = null,
  } = options

  // Remove 0x prefix and convert to hex bytes
  const dataHex = callData.startsWith('0x') ? callData.slice(2) : callData
  const data = `0x${dataHex}`

  const tx = api.tx.revive.call(
    { Id: contractAddress },
    value,
    gasLimit,
    storageDepositLimit,
    data
  )

  return new Promise((resolve, reject) => {
    tx.signAndSend(signerAddress, { signer }, ({ status, dispatchError, txHash }) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule)
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`))
        } else {
          reject(new Error(dispatchError.toString()))
        }
        return
      }

      if (status.isInBlock) {
        resolve({
          blockHash: status.asInBlock.toHex(),
          txHash: txHash.toHex(),
        })
      }
    }).catch(reject)
  })
}

// Query a Solidity contract via revive.call (read-only, no state change)
export async function queryContract(
  api: ApiPromise,
  contractAddress: string,
  callData: `0x${string}`,
  callerAddress?: string
): Promise<`0x${string}`> {
  // Use eth_call style query via revive.call RPC
  const caller = callerAddress || '0x0000000000000000000000000000000000000000'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (api.call as any).reviveApi.call(
    caller,
    contractAddress,
    0, // value
    null, // gas limit (null = unlimited for queries)
    null, // storage deposit limit
    callData
  )

  if (result.result.isErr) {
    throw new Error(`Contract call failed: ${result.result.asErr.toString()}`)
  }

  const data = result.result.asOk.data
  return `0x${Buffer.from(data).toString('hex')}` as `0x${string}`
}

// Helper to convert hex string to bytes32
export function toBytes32(value: string): `0x${string}` {
  const hex = value.startsWith('0x') ? value.slice(2) : value
  if (hex.length > 64) {
    throw new Error('Value too long for bytes32')
  }
  return `0x${hex.padStart(64, '0')}` as `0x${string}`
}

// Helper to convert string to bytes32 (for identifiers/hints)
export function stringToBytes32(str: string): `0x${string}` {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  if (bytes.length > 32) {
    throw new Error('String too long for bytes32')
  }
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `0x${hex.padEnd(64, '0')}` as `0x${string}`
}

// Helper to convert bytes32 to string
export function bytes32ToString(bytes32: `0x${string}`): string {
  const hex = bytes32.slice(2)
  const bytes: number[] = []
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16)
    if (byte === 0) break
    bytes.push(byte)
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

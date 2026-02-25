import type { ChainConfig } from './types'
import { ALL_CHAINS } from './chains'

export const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'register',
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'spendingKey', type: 'bytes32' },
      { name: 'viewingKey', type: 'bytes32' },
      { name: 'preferredChain', type: 'uint32' },
      { name: 'nickname', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'lookup',
    inputs: [{ name: 'identifier', type: 'bytes32' }],
    outputs: [
      { name: 'spendingKey', type: 'bytes32' },
      { name: 'viewingKey', type: 'bytes32' },
      { name: 'preferredChain', type: 'uint32' },
      { name: 'nickname', type: 'string' },
      { name: 'exists', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOwner',
    inputs: [{ name: 'identifier', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'updatePreferredChain',
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'newChain', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateNickname',
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'newNickname', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

export function getRegistryChain(): ChainConfig {
  const chain = ALL_CHAINS.find((c) => c.registryAddress)
  if (!chain) throw new Error('No chain with registry address configured')
  return chain
}

export function getRegistryAddress(): `0x${string}` {
  const chain = getRegistryChain()
  return chain.registryAddress!
}

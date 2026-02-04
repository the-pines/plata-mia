// Registry contract ABI and chain config for Polkadot Hub TestNet

import { defineChain } from 'viem'

export const REGISTRY_CONTRACT_ADDRESS = '0x47568470D89CD2Ea20553ffB08bD630BC95FE4bB' as const

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: {
    decimals: 10,
    name: 'DOT',
    symbol: 'DOT',
  },
  rpcUrls: {
    default: {
      http: ['https://eth-rpc-testnet.polkadot.io'],
      webSocket: ['wss://testnet-rpc.polkadot.io'],
    },
  },
})

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

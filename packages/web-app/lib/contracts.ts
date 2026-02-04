// Registry contract ABI and addresses for pallet_revive integration

export const REGISTRY_CONTRACT_ADDRESS = '0x47568470D89CD2Ea20553ffB08bD630BC95FE4bB' as const

export const POLKADOT_HUB_TESTNET = {
  name: 'Polkadot Hub TestNet',
  chainId: 420420417,
  rpcUrl: 'https://eth-rpc-testnet.polkadot.io',
  wsUrl: 'wss://testnet-rpc.polkadot.io',
} as const

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

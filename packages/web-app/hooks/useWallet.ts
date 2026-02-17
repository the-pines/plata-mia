'use client'

import { useWalletStore, type WalletType } from '@/stores/walletStore'

export interface WalletAccount {
  address: string
  name?: string
}

export interface UseWallet {
  account: WalletAccount | null
  walletType: WalletType
  substrateAddress: string | null
  evmAddress: string | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  api: unknown | null
  signer: unknown | null
  connectMetaMask: () => Promise<void>
  connectPolkadotJs: () => Promise<void>
  disconnect: () => void
  switchWallet: (type: WalletType) => Promise<void>
}

export function useWallet(): UseWallet {
  const store = useWalletStore()

  return {
    account: store.account,
    walletType: store.walletType,
    substrateAddress:
      store.walletType === 'polkadotjs' && store.account ? store.account.address : null,
    evmAddress:
      store.walletType === 'metamask' && store.account ? store.account.address : null,
    isConnecting: store.isConnecting,
    isConnected: !!store.account,
    error: store.error,
    api: store.api,
    signer: store.signer,
    connectMetaMask: store.connectMetaMask,
    connectPolkadotJs: store.connectPolkadotJs,
    disconnect: store.disconnect,
    switchWallet: store.switchWallet,
  }
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

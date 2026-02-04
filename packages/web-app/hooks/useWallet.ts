'use client'

import { useWalletContext, WalletType } from '@/contexts/WalletContext'

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
  return useWalletContext()
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

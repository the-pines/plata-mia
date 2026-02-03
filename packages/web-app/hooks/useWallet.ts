'use client'

import { ApiPromise } from '@polkadot/api'
import { useWalletContext } from '@/contexts/WalletContext'

export interface WalletAccount {
  address: string
  name?: string
}

export interface UseWallet {
  account: WalletAccount | null
  api: ApiPromise | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

export function useWallet(): UseWallet {
  return useWalletContext()
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

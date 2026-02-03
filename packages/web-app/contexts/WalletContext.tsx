'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import { ApiPromise } from '@polkadot/api'
import { CHAIN_CONFIG } from '@/lib/constants'

export interface WalletAccount {
  address: string
  name?: string
}

interface WalletContextType {
  account: WalletAccount | null
  api: ApiPromise | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [api, setApi] = useState<ApiPromise | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiRef = useRef<ApiPromise | null>(null)

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return

    setIsConnecting(true)
    setError(null)

    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')

      const extensions = await web3Enable('Plata Mia')

      if (extensions.length === 0) {
        throw new Error('No Polkadot.js extension found. Please install it from polkadot.js.org/extension')
      }

      const accounts = await web3Accounts()

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please create an account in the Polkadot.js extension')
      }

      const selectedAccount = accounts[0]
      setAccount({
        address: selectedAccount.address,
        name: selectedAccount.meta.name,
      })

      const { ApiPromise: Api, WsProvider } = await import('@polkadot/api')
      const provider = new WsProvider(CHAIN_CONFIG.rpcUrl)
      const apiInstance = await Api.create({ provider })
      apiRef.current = apiInstance
      setApi(apiInstance)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(message)
      setAccount(null)
      apiRef.current = null
      setApi(null)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (apiRef.current) {
      await apiRef.current.disconnect()
    }
    setAccount(null)
    setApi(null)
    apiRef.current = null
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (apiRef.current) {
        apiRef.current.disconnect()
      }
    }
  }, [])

  const value: WalletContextType = {
    account,
    api,
    isConnecting,
    isConnected: !!account,
    error,
    connect,
    disconnect,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWalletContext(): WalletContextType {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider')
  }
  return context
}

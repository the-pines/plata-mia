'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import { polkadotHubTestnet } from '@/lib/contracts'
import { isValidEvmAddress } from '@plata-mia/stealth-core'

export type WalletType = 'metamask' | 'polkadotjs' | null

export interface WalletAccount {
  address: string
  name?: string
}

interface WalletContextType {
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

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
  children: ReactNode
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [walletType, setWalletType] = useState<WalletType>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signer, setSigner] = useState<unknown | null>(null)
  const apiRef = useRef<unknown>(null)

  const substrateAddress = walletType === 'polkadotjs' && account ? account.address : null
  const evmAddress = walletType === 'metamask' && account ? account.address : null

  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not found. Please install MetaMask.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (accounts.length === 0) {
        throw new Error('No accounts found in MetaMask')
      }

      const selectedAccount = accounts[0]
      if (!isValidEvmAddress(selectedAccount)) {
        throw new Error('Invalid EVM address returned from MetaMask')
      }

      setAccount({ address: selectedAccount })
      setWalletType('metamask')
      setSigner(window.ethereum)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect MetaMask'
      setError(message)
      setAccount(null)
      setWalletType(null)
      setSigner(null)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const connectPolkadotJs = useCallback(async () => {
    if (typeof window === 'undefined') return

    setIsConnecting(true)
    setError(null)

    try {
      const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp')

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
      setWalletType('polkadotjs')

      const injector = await web3FromAddress(selectedAccount.address)
      setSigner(injector.signer)

      const { ApiPromise, WsProvider } = await import('@polkadot/api')
      const wsUrl = polkadotHubTestnet.rpcUrls.default.webSocket?.[0]
      if (!wsUrl) {
        throw new Error('WebSocket URL not configured')
      }
      const provider = new WsProvider(wsUrl)
      const apiInstance = await ApiPromise.create({ provider })
      apiRef.current = apiInstance
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(message)
      setAccount(null)
      setWalletType(null)
      apiRef.current = null
      setSigner(null)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (apiRef.current) {
      const api = apiRef.current as { disconnect: () => Promise<void> }
      await api.disconnect()
    }
    setAccount(null)
    setWalletType(null)
    apiRef.current = null
    setSigner(null)
    setError(null)
  }, [])

  const switchWallet = useCallback(async (type: WalletType) => {
    await disconnect()
    if (type === 'metamask') {
      await connectMetaMask()
    } else if (type === 'polkadotjs') {
      await connectPolkadotJs()
    }
  }, [disconnect, connectMetaMask, connectPolkadotJs])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum || walletType !== 'metamask') {
      return
    }

    const handleAccountsChanged = (accounts: unknown) => {
      const accountList = accounts as string[]
      if (accountList.length === 0) {
        disconnect()
      } else if (accountList[0] !== account?.address) {
        setAccount({ address: accountList[0] })
      }
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [walletType, account?.address, disconnect])

  useEffect(() => {
    return () => {
      if (apiRef.current) {
        const api = apiRef.current as { disconnect: () => Promise<void> }
        api.disconnect()
      }
    }
  }, [])

  const value: WalletContextType = {
    account,
    walletType,
    substrateAddress,
    evmAddress,
    isConnecting,
    isConnected: !!account,
    error,
    api: apiRef.current,
    signer,
    connectMetaMask,
    connectPolkadotJs,
    disconnect,
    switchWallet,
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

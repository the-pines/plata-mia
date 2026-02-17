'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { polkadotHubTestnet } from '@/lib/contracts'
import { isValidEvmAddress } from '@plata-mia/stealth-core'

export type WalletType = 'metamask' | 'polkadotjs' | null

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

interface WalletState {
  account: { address: string; name?: string } | null
  walletType: WalletType
  isConnecting: boolean
  error: string | null
  signer: unknown | null
  api: unknown | null
}

interface WalletActions {
  connectMetaMask: () => Promise<void>
  connectPolkadotJs: () => Promise<void>
  disconnect: () => Promise<void>
  switchWallet: (type: WalletType) => Promise<void>
}

type WalletStore = WalletState & WalletActions

// MetaMask accountsChanged listener cleanup
let accountsChangedHandler: ((accounts: unknown) => void) | null = null

function cleanupAccountsListener() {
  if (accountsChangedHandler && typeof window !== 'undefined' && window.ethereum) {
    window.ethereum.removeListener('accountsChanged', accountsChangedHandler)
    accountsChangedHandler = null
  }
}

function setupAccountsListener() {
  cleanupAccountsListener()

  accountsChangedHandler = (accounts: unknown) => {
    const accountList = accounts as string[]
    const state = useWalletStore.getState()

    if (accountList.length === 0) {
      state.disconnect()
    } else if (accountList[0] !== state.account?.address) {
      useWalletStore.setState({ account: { address: accountList[0] } })
    }
  }

  window.ethereum!.on('accountsChanged', accountsChangedHandler)
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      account: null,
      walletType: null,
      isConnecting: false,
      error: null,
      signer: null,
      api: null,

      connectMetaMask: async () => {
        if (typeof window === 'undefined' || !window.ethereum) {
          set({ error: 'MetaMask not found. Please install MetaMask.' })
          return
        }

        set({ isConnecting: true, error: null })

        try {
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
          })
          const accounts = (await window.ethereum.request({
            method: 'eth_requestAccounts',
          })) as string[]

          if (accounts.length === 0) {
            throw new Error('No accounts found in MetaMask')
          }

          const selectedAccount = accounts[0]
          if (!isValidEvmAddress(selectedAccount)) {
            throw new Error('Invalid EVM address returned from MetaMask')
          }

          set({
            account: { address: selectedAccount },
            walletType: 'metamask',
            signer: window.ethereum,
            isConnecting: false,
          })

          setupAccountsListener()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to connect MetaMask'
          set({
            error: message,
            account: null,
            walletType: null,
            signer: null,
            isConnecting: false,
          })
        }
      },

      connectPolkadotJs: async () => {
        if (typeof window === 'undefined') return

        set({ isConnecting: true, error: null })

        try {
          const { web3Enable, web3Accounts, web3FromAddress } = await import(
            '@polkadot/extension-dapp'
          )

          const extensions = await web3Enable('Plata Mia')
          if (extensions.length === 0) {
            throw new Error(
              'No Polkadot.js extension found. Please install it from polkadot.js.org/extension'
            )
          }

          const accounts = await web3Accounts()
          if (accounts.length === 0) {
            throw new Error(
              'No accounts found. Please create an account in the Polkadot.js extension'
            )
          }

          const selectedAccount = accounts[0]
          const injector = await web3FromAddress(selectedAccount.address)

          const { ApiPromise, WsProvider } = await import('@polkadot/api')
          const wsUrl = polkadotHubTestnet.rpcUrls.default.webSocket?.[0]
          if (!wsUrl) throw new Error('WebSocket URL not configured')

          const provider = new WsProvider(wsUrl)
          const apiInstance = await ApiPromise.create({ provider })

          set({
            account: {
              address: selectedAccount.address,
              name: selectedAccount.meta.name,
            },
            walletType: 'polkadotjs',
            signer: injector.signer,
            api: apiInstance,
            isConnecting: false,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to connect wallet'
          set({
            error: message,
            account: null,
            walletType: null,
            signer: null,
            api: null,
            isConnecting: false,
          })
        }
      },

      disconnect: async () => {
        const { api } = get()
        if (api) {
          const polkadotApi = api as { disconnect: () => Promise<void> }
          await polkadotApi.disconnect()
        }

        cleanupAccountsListener()

        set({
          account: null,
          walletType: null,
          signer: null,
          api: null,
          error: null,
        })
      },

      switchWallet: async (type: WalletType) => {
        const { disconnect, connectMetaMask, connectPolkadotJs } = get()
        await disconnect()
        if (type === 'metamask') await connectMetaMask()
        else if (type === 'polkadotjs') await connectPolkadotJs()
      },
    }),
    {
      name: 'plata-mia:wallet',
      partialize: (state) => ({ walletType: state.walletType }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const { walletType } = state
        if (!walletType) return

        if (walletType === 'metamask' && typeof window !== 'undefined' && window.ethereum) {
          window.ethereum
            .request({ method: 'eth_accounts' })
            .then((result) => {
              const accounts = result as string[]
              if (accounts.length > 0 && isValidEvmAddress(accounts[0])) {
                useWalletStore.setState({
                  account: { address: accounts[0] },
                  walletType: 'metamask',
                  signer: window.ethereum!,
                })
                setupAccountsListener()
              } else {
                useWalletStore.setState({ walletType: null })
              }
            })
        } else if (walletType === 'polkadotjs') {
          state.connectPolkadotJs()
        }
      },
    }
  )
)

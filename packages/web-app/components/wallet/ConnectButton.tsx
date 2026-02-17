'use client'

import { useState } from 'react'
import { useWallet, truncateAddress } from '@/hooks/useWallet'
import { type WalletType } from '@/stores/walletStore'
import { Button } from '@/components/ui'
import { WalletModal } from './WalletModal'

function WalletIcon({ type }: { type: WalletType }) {
  if (type === 'metamask') {
    return (
      <svg viewBox="0 0 318.6 318.6" className="w-4 h-4">
        <path fill="#E2761B" d="M274.1 35.5l-99.5 73.9L193 65.8z" />
        <path fill="#E4761B" d="M44.4 35.5l98.7 74.6-17.5-44.3zm193.9 171.3l-26.5 40.6 56.7 15.6 16.3-55.3zm-204.4.9L50.1 263l56.7-15.6-26.5-40.6z" />
        <path fill="#F6851B" d="M106.8 247.4l33.8-16.5-29.2-22.8zm71.1-16.5l33.9 16.5-4.7-39.3z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 160 160" className="w-4 h-4">
      <circle cx="80" cy="80" r="80" fill="#E6007A" />
      <circle cx="80" cy="48" r="20" fill="white" />
      <circle cx="80" cy="112" r="20" fill="white" />
    </svg>
  )
}

export function ConnectButton() {
  const {
    account,
    walletType,
    isConnecting,
    isConnected,
    error,
    disconnect,
    connectMetaMask,
    connectPolkadotJs,
  } = useWallet()

  const [showModal, setShowModal] = useState(false)

  const handleSelectWallet = async (type: WalletType) => {
    if (type === 'metamask') {
      await connectMetaMask()
    } else if (type === 'polkadotjs') {
      await connectPolkadotJs()
    }
    setShowModal(false)
  }

  if (isConnecting) {
    return (
      <Button variant="outline" size="sm" disabled>
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Connecting...
      </Button>
    )
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <WalletIcon type={walletType} />
          <span className="text-sm font-mono text-gray">
            {account.name ? `${account.name} (${truncateAddress(account.address)})` : truncateAddress(account.address)}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          Connect Wallet
        </Button>
        {error && (
          <span className="text-xs text-red-500 max-w-[200px] text-right">
            {error}
          </span>
        )}
      </div>
      <WalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleSelectWallet}
        isConnecting={isConnecting}
      />
    </>
  )
}

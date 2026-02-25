'use client'

import { useState, useRef, useEffect } from 'react'
import { useWallet, truncateAddress } from '@/hooks/useWallet'
import { useWalletStore, type WalletType } from '@/stores/walletStore'
import { Button } from '@/components/ui'
import { WalletModal } from './WalletModal'
import { showError } from '@/lib/toast'

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
    disconnect,
    connectMetaMask,
    connectPolkadotJs,
  } = useWallet()

  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  const handleSelectWallet = async (type: WalletType) => {
    if (type === 'metamask') {
      await connectMetaMask()
    } else if (type === 'polkadotjs') {
      await connectPolkadotJs()
    }
    const { error: connectError } = useWalletStore.getState()
    if (connectError) showError(connectError)
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
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-sm hover:border-phosphor/30 transition-colors cursor-pointer"
        >
          <WalletIcon type={walletType} />
          <span className="text-xs text-primary">
            {account.name ? `${account.name} (${truncateAddress(account.address)})` : truncateAddress(account.address)}
          </span>
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-sm overflow-hidden z-50">
            <a
              href="https://the-pines.github.io/plata-mia/overview"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowMenu(false)}
              className="block w-full px-4 py-2 text-xs uppercase tracking-wider text-primary hover:bg-surface-hover transition-colors text-left whitespace-nowrap"
            >
              docs
            </a>
            <button
              onClick={() => {
                disconnect()
                setShowMenu(false)
              }}
              className="w-full px-4 py-2 text-xs uppercase tracking-wider text-accent-red hover:bg-surface-hover transition-colors text-left whitespace-nowrap"
            >
              disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
        Connect
      </Button>
      <WalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleSelectWallet}
        isConnecting={isConnecting}
      />
    </>
  )
}

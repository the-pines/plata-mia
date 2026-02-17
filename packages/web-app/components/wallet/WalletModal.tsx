'use client'

import { useEffect, useRef } from 'react'
import { type WalletType } from '@/stores/walletStore'

interface WalletOption {
  type: WalletType
  name: string
  description: string
  icon: React.ReactNode
}

const walletOptions: WalletOption[] = [
  {
    type: 'polkadotjs',
    name: 'Polkadot.js',
    description: 'Connect using Polkadot.js extension',
    icon: (
      <svg viewBox="0 0 160 160" className="w-8 h-8">
        <circle cx="80" cy="80" r="80" fill="#E6007A" />
        <circle cx="80" cy="48" r="20" fill="white" />
        <circle cx="80" cy="112" r="20" fill="white" />
        <circle cx="48" cy="80" r="12" fill="white" />
        <circle cx="112" cy="80" r="12" fill="white" />
      </svg>
    ),
  },
  {
    type: 'metamask',
    name: 'MetaMask',
    description: 'Connect using MetaMask wallet',
    icon: (
      <svg viewBox="0 0 318.6 318.6" className="w-8 h-8">
        <path fill="#E2761B" d="M274.1 35.5l-99.5 73.9L193 65.8z" />
        <path fill="#E4761B" d="M44.4 35.5l98.7 74.6-17.5-44.3zm193.9 171.3l-26.5 40.6 56.7 15.6 16.3-55.3zm-204.4.9L50.1 263l56.7-15.6-26.5-40.6z" />
        <path fill="#D7C1B3" d="M103.6 138.2l-15.8 23.9 56.3 2.5-2-60.5zm111.3 0l-39-34.8-1.3 61.2 56.2-2.5zM106.8 247.4l33.8-16.5-29.2-22.8zm71.1-16.5l33.9 16.5-4.7-39.3z" />
        <path fill="#CD6116" d="M211.8 247.4l-33.9-16.5 2.7 22.1-.3 9.3zm-105 0l31.5 14.9-.2-9.3 2.5-22.1z" />
        <path fill="#E4751F" d="M138.8 193.5l-28.2-8.3 19.9-9.1zm40.9 0l8.3-17.4 20 9.1z" />
        <path fill="#F6851B" d="M106.8 247.4l4.8-40.6-31.3.9zm99.6-40.6l4.8 40.6 26.5-39.7zm23.8-44.7l-56.2 2.5 5.2 28.9 8.3-17.4 20 9.1zm-119.6 23.1l20-9.1 8.2 17.4 5.3-28.9-56.3-2.5z" />
        <path fill="#E2761B" d="M87.8 162.1l23.6 46-.8-22.9zm119.2 23.1l-1 22.9 23.7-46zm-64-20.6l-5.3 28.9 6.6 34.1 1.5-44.9zm30.5 0l-2.7 18 1.2 45 6.7-34.1z" />
        <path fill="#F6851B" d="M179.8 193.5l-6.7 34.1 4.8 3.3 29.2-22.8 1-22.9zm-69.2-8.3l.8 22.9 29.2 22.8 4.8-3.3-6.6-34.1z" />
        <path fill="#C0AD9E" d="M180.3 262.3l.3-9.3-2.5-2.2h-37.7l-2.3 2.2.2 9.3-31.5-14.9 11 9 22.3 15.5h38.3l22.4-15.5 11-9z" />
        <path fill="#161616" d="M177.9 230.9l-4.8-3.3h-27.7l-4.8 3.3-2.5 22.1 2.3-2.2h37.7l2.5 2.2z" />
        <path fill="#763D16" d="M278.3 114.2l8.5-40.8-12.7-37.9-96.2 71.4 37 31.3 52.3 15.3 11.6-13.5-5-3.6 8-7.3-6.2-4.8 8-6.1zM31.8 73.4l8.5 40.8-5.4 4 8 6.1-6.1 4.8 8 7.3-5 3.6 11.5 13.5 52.3-15.3 37-31.3-96.2-71.4z" />
        <path fill="#F6851B" d="M267.2 153.5l-52.3-15.3 15.9 23.9-23.7 46 31.2-.4h46.5zm-163.6-15.3l-52.3 15.3-17.4 54.2h46.4l31.1.4-23.6-46zm71 26.4l3.3-57.7 15.2-41.1h-67.5l15 41.1 3.5 57.7 1.2 18.2.1 44.8h27.7l.2-44.8z" />
      </svg>
    ),
  },
]

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: WalletType) => Promise<void>
  isConnecting: boolean
}

export function WalletModal({ isOpen, onClose, onSelect, isConnecting }: WalletModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isConnecting}
          >
            <svg className="w-5 h-5 text-gray-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {walletOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => option.type && onSelect(option.type)}
              disabled={isConnecting}
              className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-lg hover:border-lemon hover:bg-lemon-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex-shrink-0">{option.icon}</div>
              <div className="flex-1 text-left">
                <div className="font-medium text-gray">{option.name}</div>
                <div className="text-sm text-gray-lighter">{option.description}</div>
              </div>
              {isConnecting && (
                <svg className="animate-spin h-5 w-5 text-gray-light" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-lighter text-center">
          By connecting, you agree to use this application responsibly.
        </p>
      </div>
    </div>
  )
}

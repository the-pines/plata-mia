'use client'

import { useWallet, truncateAddress } from '@/hooks/useWallet'
import { Button } from '@/components/ui'

export function ConnectButton() {
  const { account, isConnecting, isConnected, error, connect, disconnect } = useWallet()

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
        <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
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
    <div className="flex flex-col items-end gap-1">
      <Button variant="primary" size="sm" onClick={connect}>
        Connect Wallet
      </Button>
      {error && (
        <span className="text-xs text-red-500 max-w-[200px] text-right">
          {error}
        </span>
      )}
    </div>
  )
}

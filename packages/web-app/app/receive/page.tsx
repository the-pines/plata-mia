'use client'

import { useState, useEffect } from 'react'
import { Card, TabBar } from '@/components/ui'
import { useWallet } from '@/hooks/useWallet'
import { hasStoredKeys } from '@/lib/keyStorage'
import { RegisterFlow } from '@/components/receive/RegisterFlow'
import { ScanFlow } from '@/components/receive/ScanFlow'

export default function ReceivePage() {
  const { isConnected, account } = useWallet()
  const [activeTab, setActiveTab] = useState<'register' | 'scan'>('register')

  useEffect(() => {
    if (account?.address && hasStoredKeys(account.address)) {
      setActiveTab('scan')
    }
  }, [account?.address])

  if (!isConnected) {
    return (
      <div className="w-full max-w-[480px] space-y-8">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lemon rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[#131313]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-white">Connect Your Wallet</h2>
              <p className="text-sm text-secondary">
                Please connect your wallet to manage your stealth address.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[480px] space-y-8">
      <TabBar
        tabs={[
          { key: 'register', label: 'Register' },
          { key: 'scan', label: 'Scan' },
        ]}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as 'register' | 'scan')}
      />

      {activeTab === 'register' && <RegisterFlow onComplete={() => setActiveTab('scan')} />}
      {activeTab === 'scan' && <ScanFlow />}
    </div>
  )
}

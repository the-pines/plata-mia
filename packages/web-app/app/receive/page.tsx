'use client'

import { useState } from 'react'
import { Button, Card, Input, KeyDisplay } from '@/components/ui'
import { getAnnouncements, Announcement } from '@/services/xxProxy.mock'
import {
  scanAnnouncement,
  deriveSpendingKey,
  bytesToHex,
  hexToBytes,
  ScanResult,
} from '@/hooks/useStealth'
import { CHAIN_CONFIG } from '@/lib/constants'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'

interface FoundPayment {
  announcement: Announcement
  scanResult: ScanResult
  derivedKey: string
}

export default function ReceivePage() {
  const [viewingSecret, setViewingSecret] = useState('')
  const [spendingSecret, setSpendingSecret] = useState('')
  const [spendingPubkey, setSpendingPubkey] = useState('')
  const [loading, setLoading] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)
  const [payments, setPayments] = useState<FoundPayment[]>([])

  const handleScan = async () => {
    if (!viewingSecret.trim() || !spendingSecret.trim() || !spendingPubkey.trim()) {
      showError('Please fill in all fields')
      return
    }

    setLoading(true)
    setPayments([])
    setScannedCount(0)
    const loadingId = showLoading('Scanning for payments...')

    try {
      const v = hexToBytes(viewingSecret)
      const s = hexToBytes(spendingSecret)
      const S = hexToBytes(spendingPubkey)

      const announcements = await getAnnouncements(0)
      setScannedCount(announcements.length)

      const found: FoundPayment[] = []

      for (const ann of announcements) {
        const R = hexToBytes(ann.R)

        const result = scanAnnouncement(v, S, R, ann.viewTag, CHAIN_CONFIG.ss58Prefix)

        if (result) {
          const derivedKey = deriveSpendingKey(s, v, R)

          found.push({
            announcement: ann,
            scanResult: result,
            derivedKey: bytesToHex(derivedKey),
          })
        }
      }

      setPayments(found)
      dismissToast(loadingId)

      if (found.length > 0) {
        showSuccess(`Found ${found.length} payment${found.length > 1 ? 's' : ''}!`)
      } else {
        showSuccess('Scan complete - no new payments')
      }
    } catch (err) {
      dismissToast(loadingId)
      showError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray">Receive</h1>
        <p className="text-gray-light mt-2">
          Scan for incoming payments and get your private keys
        </p>
      </div>

      <Card className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray">Enter Your Keys</h2>
          <p className="text-gray-lighter text-sm">
            Paste your keys from when you registered to scan for payments.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label="Viewing Secret (v)"
            placeholder="Paste your viewing secret key (hex)"
            value={viewingSecret}
            onChange={(e) => setViewingSecret(e.target.value)}
            className="font-mono text-sm"
          />

          <Input
            label="Spending Secret (s)"
            placeholder="Paste your spending secret key (hex)"
            value={spendingSecret}
            onChange={(e) => setSpendingSecret(e.target.value)}
            className="font-mono text-sm"
          />

          <Input
            label="Spending Public Key (S)"
            placeholder="Paste your spending public key (hex)"
            value={spendingPubkey}
            onChange={(e) => setSpendingPubkey(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        <Button onClick={handleScan} loading={loading} size="lg" className="w-full">
          {loading ? 'Scanning...' : 'Scan for Payments'}
        </Button>
      </Card>

      {scannedCount > 0 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray">Scan Results</h2>
            <span className="text-sm text-gray-lighter">
              Scanned {scannedCount} announcement{scannedCount !== 1 ? 's' : ''}
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-lg">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-lighter">No payments found for your keys</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <div key={index} className="p-4 border-2 border-lemon rounded-lg bg-lemon-light space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-semibold text-gray">Payment Found!</span>
                  </div>

                  <KeyDisplay
                    label="Stealth Address"
                    value={payment.scanResult.address}
                  />

                  <KeyDisplay
                    label="Private Key (import to wallet to spend)"
                    value={payment.derivedKey}
                  />

                  <div className="p-3 bg-white rounded border border-lemon">
                    <p className="text-xs text-gray-lighter">
                      <span className="font-medium text-gray">To spend:</span> Import this private key into a Polkadot wallet to access funds at the stealth address.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card variant="highlight" className="space-y-3">
        <h3 className="font-semibold text-gray">How scanning works</h3>
        <ol className="text-sm text-gray-light space-y-2">
          <li><span className="font-mono bg-lemon px-1.5 py-0.5 rounded mr-2">1</span>We fetch all announcements from the network</li>
          <li><span className="font-mono bg-lemon px-1.5 py-0.5 rounded mr-2">2</span>For each announcement, we compute a shared secret using your viewing key</li>
          <li><span className="font-mono bg-lemon px-1.5 py-0.5 rounded mr-2">3</span>We use the view tag for quick filtering (99.6% rejection rate)</li>
          <li><span className="font-mono bg-lemon px-1.5 py-0.5 rounded mr-2">4</span>For matches, we derive the stealth address and spending key</li>
        </ol>
      </Card>
    </div>
  )
}

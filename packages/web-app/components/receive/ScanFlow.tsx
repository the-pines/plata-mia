'use client'

import { useEffect } from 'react'
import { Button, Card, Input, KeyDisplay } from '@/components/ui'
import { getAnnouncements } from '@/services'
import {
  scanAnnouncement,
  deriveSpendingKey,
  bytes32ToPubkey,
  bytesToHex,
  hexToBytes,
} from '@plata-mia/stealth-core'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'
import { useWallet } from '@/hooks/useWallet'
import { loadKeys, hasStoredKeys } from '@/lib/keyStorage'
import { useReceiveStore, type FoundPayment } from '@/stores/receiveStore'

export function ScanFlow() {
  const { isConnected, account, signer, walletType } = useWallet()

  const {
    viewingSecret,
    spendingSecret,
    spendingPubkey,
    hasKeys,
    keysLoaded,
    unlocking,
    unlockPassword,
    loading,
    scannedCount,
    payments,
    setViewingSecret,
    setSpendingSecret,
    setSpendingPubkey,
    setUnlockPassword,
    setHasKeys,
    loadKeysFromStorage,
    setUnlocking,
    startScan,
    completeScan,
    failScan,
  } = useReceiveStore()

  useEffect(() => {
    if (isConnected && account) {
      setHasKeys(hasStoredKeys(account.address))
    } else {
      setHasKeys(false)
    }
  }, [isConnected, account, setHasKeys])

  const handleUnlock = async () => {
    if (!account || !walletType || !signer) return
    if (walletType === 'polkadotjs' && !unlockPassword) {
      showError('Please enter your encryption password')
      return
    }

    setUnlocking(true)
    try {
      const keys = await loadKeys(
        walletType,
        signer,
        account.address,
        walletType === 'polkadotjs' ? unlockPassword : undefined
      )
      loadKeysFromStorage({
        viewingSecret: keys.viewingSecret,
        spendingSecret: keys.spendingSecret,
        spendingPubkey: keys.spendingPubkey,
      })
      showSuccess('Keys loaded')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to unlock keys')
    } finally {
      setUnlocking(false)
    }
  }

  const handleScan = async () => {
    if (!viewingSecret.trim() || !spendingSecret.trim() || !spendingPubkey.trim()) {
      showError('Please fill in all fields')
      return
    }

    startScan()
    const loadingId = showLoading('Scanning for payments...')

    try {
      const v = hexToBytes(viewingSecret)
      const s = hexToBytes(spendingSecret)
      const S = hexToBytes(spendingPubkey)

      const announcements = await getAnnouncements(0)

      const found: FoundPayment[] = []

      for (const ann of announcements) {
        try {
          const R = bytes32ToPubkey(ann.R)
          const result = scanAnnouncement(v, S, R, ann.viewTag)

          if (result) {
            const derivedKey = deriveSpendingKey(s, v, R)
            found.push({
              announcement: ann,
              scanResult: result,
              derivedKey: bytesToHex(derivedKey),
            })
          }
        } catch {
          // Skip announcements with invalid curve points
        }
      }

      completeScan(announcements.length, found)
      dismissToast(loadingId)

      if (found.length > 0) {
        showSuccess(`Found ${found.length} payment${found.length > 1 ? 's' : ''}!`)
      } else {
        showSuccess('Scan complete - no new payments')
      }
    } catch (err) {
      failScan()
      dismissToast(loadingId)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        showError('Could not reach the announcement server. Make sure xx-proxy is running.')
      } else {
        showError(`Scan failed: ${msg}`)
      }
    }
  }

  return (
    <>
      {isConnected && hasKeys && !keysLoaded && (
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-lemon rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#131313]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-white">Saved Keys Found</h3>
              <p className="text-sm text-secondary">
                You have encrypted keys stored in this browser.
              </p>
            </div>
          </div>
          {walletType === 'polkadotjs' && (
            <Input
              label="Encryption Password"
              type="password"
              placeholder="Enter the password you used when saving"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
            />
          )}
          <Button variant="outline" onClick={handleUnlock} loading={unlocking} className="w-full">
            {walletType === 'metamask' ? 'Sign & Unlock Keys' : 'Unlock Keys'}
          </Button>
        </Card>
      )}

      <Card className="space-y-6">
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
            <span className="text-sm text-secondary">
              Scanned {scannedCount} announcement{scannedCount !== 1 ? 's' : ''}
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-6 text-center bg-module rounded-lg">
              <svg className="w-12 h-12 text-tertiary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-secondary">No payments found for your keys</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <div key={index} className="p-4 border border-lemon rounded-lg bg-lemon-muted space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-accent-green-muted rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-semibold text-white">Payment Found!</span>
                  </div>

                  <KeyDisplay
                    label="Stealth Address"
                    value={payment.scanResult.address}
                  />

                  <KeyDisplay
                    label="Private Key (import to wallet to spend)"
                    value={payment.derivedKey}
                  />

                  <div className="p-3 bg-surface border border-border rounded">
                    <p className="text-xs text-secondary">
                      <span className="font-medium text-white">To spend:</span> Import this private key into MetaMask to access funds at the stealth address.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { Button, Card, Input, KeyDisplay } from '@/components/ui'
import {
  generateSpendingKeyPair,
  generateViewingKeyPair,
  bytesToHex,
  pubkeyToBytes32,
} from '@plata-mia/stealth-core'
import { useWallet, truncateAddress } from '@/hooks/useWallet'
import { polkadotHubTestnet } from '@/lib/contracts'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'
import { storeKeys, hasStoredKeys, loadKeys } from '@/lib/keyStorage'
import { useRegisterStore } from '@/stores/registerStore'
import { useRegisterMetaMask, useRegisterPolkadotJs } from '@/queries/useRegistryQueries'
import { lookup } from '@/services/registry'
import type { ApiPromise } from '@polkadot/api'
import type { Signer } from '@polkadot/api/types'

interface RegisterFlowProps {
  onComplete: () => void
}

export function RegisterFlow({ onComplete }: RegisterFlowProps) {
  const { account, api, signer, walletType } = useWallet()
  const autoSaveTriggered = useRef(false)

  const {
    step,
    spending,
    viewing,
    hint,
    loading,
    storing,
    keysSaved,
    savePassword,
    showRawKeys,
    loadingEntry,
    existingEntry,
    existingEntryHint,
    setHint,
    setSavePassword,
    setKeys,
    setStoring,
    setKeysSaved,
    setLoading,
    setShowRawKeys,
    setLoadingEntry,
    setExistingEntry,
    complete,
  } = useRegisterStore()

  const registerMetaMask = useRegisterMetaMask()
  const registerPolkadotJs = useRegisterPolkadotJs()

  const hasKeys = account ? hasStoredKeys(account.address) : false

  const handleLoadExisting = async () => {
    if (!account || !walletType || !signer) return

    setLoadingEntry(true)
    try {
      const stored = await loadKeys(walletType, signer, account.address)
      if (!stored.hint) {
        setLoadingEntry(false)
        return
      }

      const entry = await lookup(stored.hint)
      if (entry) {
        setExistingEntry(entry, stored.hint)
      }
    } catch {
      showError('Could not load existing registration')
    } finally {
      setLoadingEntry(false)
    }
  }

  const handleSaveKeys = async () => {
    if (!spending || !viewing || !account || !walletType || !signer) return
    if (walletType === 'polkadotjs' && !savePassword) {
      showError('Please enter a password to encrypt your keys')
      return
    }

    setStoring(true)
    try {
      await storeKeys(
        {
          spendingSecret: bytesToHex(spending.secret),
          spendingPubkey: bytesToHex(spending.pubkey),
          viewingSecret: bytesToHex(viewing.secret),
          viewingPubkey: bytesToHex(viewing.pubkey),
          hint: hint || undefined,
        },
        walletType,
        signer,
        account.address,
        walletType === 'polkadotjs' ? savePassword : undefined
      )
      setKeysSaved(true)
      showSuccess('Keys saved to browser')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save keys')
    } finally {
      setStoring(false)
    }
  }

  useEffect(() => {
    if (step !== 'done' || walletType !== 'metamask' || keysSaved || autoSaveTriggered.current) return
    autoSaveTriggered.current = true
    handleSaveKeys()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, walletType, keysSaved])

  const handleGenerate = () => {
    if (account && hasStoredKeys(account.address)) {
      const confirmed = window.confirm(
        'You already have saved keys for this wallet. Generating new keys and saving them will overwrite the previous ones. If you lose access to your old keys, any funds sent to those stealth addresses will be unrecoverable.\n\nContinue?'
      )
      if (!confirmed) return
    }

    const spendingKp = generateSpendingKeyPair()
    const viewingKp = generateViewingKeyPair()
    setKeys(spendingKp, viewingKp)
    showSuccess('Keys generated successfully')
  }

  const handleRegister = async () => {
    if (!spending || !viewing || !hint.trim()) {
      showError('Please fill in all fields')
      return
    }

    if (!account) {
      showError('Please connect your wallet')
      return
    }

    setLoading(true)
    const loadingId = showLoading('Registering on-chain...')

    try {
      const spendBytes32 = pubkeyToBytes32(spending.pubkey)
      const viewBytes32 = pubkeyToBytes32(viewing.pubkey)

      if (walletType === 'metamask') {
        await registerMetaMask.mutateAsync({
          hint,
          spendingKey: spendBytes32,
          viewingKey: viewBytes32,
          preferredChain: polkadotHubTestnet.id,
          nickname: hint,
          account: account.address as `0x${string}`,
        })
      } else if (walletType === 'polkadotjs' && api && signer) {
        await registerPolkadotJs.mutateAsync({
          hint,
          spendingKey: spendBytes32,
          viewingKey: viewBytes32,
          preferredChain: polkadotHubTestnet.id,
          nickname: hint,
          api: api as ApiPromise,
          signerAddress: account.address,
          signer: signer as Signer,
        })
      } else {
        throw new Error('Wallet not properly connected')
      }

      dismissToast(loadingId)
      showSuccess('Hint registered on-chain!')
      autoSaveTriggered.current = false
      complete()
    } catch (err) {
      dismissToast(loadingId)
      showError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {step === 'generate' && (
        <>
          {existingEntry && existingEntryHint ? (
            <Card className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-phosphor-muted rounded-sm flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-phosphor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xs uppercase tracking-wider font-medium text-primary">Your Registration</h2>
                  <p className="text-xs text-secondary">You already have a registered stealth address.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="text-xs uppercase tracking-wider text-secondary">Hint:</span>{' '}
                  <span className="font-medium text-primary">{existingEntryHint}</span>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-secondary">Spending Key:</span>{' '}
                  <span className="text-primary">{truncateAddress(existingEntry.spendingKey)}</span>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-secondary">Viewing Key:</span>{' '}
                  <span className="text-primary">{truncateAddress(existingEntry.viewingKey)}</span>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-secondary">Preferred Chain:</span>{' '}
                  <span className="text-primary">{existingEntry.preferredChain}</span>
                </div>
              </div>
            </Card>
          ) : hasKeys && !existingEntry && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-medium text-primary">Existing Registration</h3>
                  <p className="text-xs text-secondary">
                    You have saved keys in this browser. View your on-chain registration.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadExisting}
                  loading={loadingEntry}
                >
                  View
                </Button>
              </div>
            </Card>
          )}

          <Card className="space-y-6">
            <Button onClick={handleGenerate} size="lg">
              Generate Keys
            </Button>
          </Card>
        </>
      )}

      {step === 'register' && spending && viewing && (
        <div className="space-y-6">
          <Card variant="highlight" className="space-y-4 border-accent-amber/20 bg-accent-amber-muted">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent-amber/20 rounded-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider font-medium text-accent-amber">Back up your keys!</h3>
                <p className="text-xs text-secondary">
                  Your keys will be saved to this browser after registration, but for extra safety you can
                  expand and copy the raw keys below.
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawKeys(!showRawKeys)}
              >
                {showRawKeys ? 'Hide raw keys' : 'Show raw keys'}
              </Button>
            </div>

            {showRawKeys && (
              <>
                <div className="space-y-4">
                  <h3 className="text-xs uppercase tracking-wider font-medium text-primary">Spending Keypair</h3>
                  <KeyDisplay label="Secret (keep private!)" value={bytesToHex(spending.secret)} />
                  <KeyDisplay label="Public Key (S)" value={bytesToHex(spending.pubkey)} />
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-xs uppercase tracking-wider font-medium text-primary">Viewing Keypair</h3>
                  <KeyDisplay label="Secret (keep private!)" value={bytesToHex(viewing.secret)} />
                  <KeyDisplay label="Public Key (V)" value={bytesToHex(viewing.pubkey)} />
                </div>
              </>
            )}
          </Card>

          <Card className="space-y-6">
            <Input
              label="Hint"
              placeholder="e.g., alice, bob.payments, myname"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />

            <Button onClick={handleRegister} loading={loading} size="lg" className="w-full">
              Register
            </Button>
          </Card>
        </div>
      )}

      {step === 'done' && (
        <Card variant="highlight" className="space-y-6">
          <div className="space-y-2 text-sm text-secondary">
            {keysSaved && (
              <p className="text-phosphor flex items-center gap-1 text-glow">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Keys saved to browser
              </p>
            )}
            {storing && (
              <p className="text-tertiary">Saving keys to browser...</p>
            )}
          </div>

          {!keysSaved && !storing && walletType === 'polkadotjs' && spending && viewing && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs text-secondary">
                Enter a password to encrypt and save your keys to this browser.
              </p>
              <Input
                label="Encryption Password"
                type="password"
                placeholder="Choose a password to encrypt your keys"
                value={savePassword}
                onChange={(e) => setSavePassword(e.target.value)}
              />
              <Button variant="outline" onClick={handleSaveKeys} loading={storing} className="w-full">
                Encrypt & Save to Browser
              </Button>
            </div>
          )}

          <Button variant="outline" onClick={onComplete}>
            Scan for Payments
          </Button>
        </Card>
      )}
    </>
  )
}

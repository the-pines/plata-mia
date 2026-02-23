'use client'

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

  const {
    step,
    spending,
    viewing,
    hint,
    loading,
    storing,
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
    saveFailed,
    setLoadingEntry,
    setExistingEntry,
    setSaveFailed,
    reset,
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

  const handleSaveKeys = async (): Promise<boolean> => {
    if (!spending || !viewing || !account || !walletType || !signer) return false
    if (walletType === 'polkadotjs' && !savePassword) {
      showError('Please enter a password to encrypt your keys')
      return false
    }

    setStoring(true)
    setSaveFailed(false)
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
      return true
    } catch (err) {
      setSaveFailed(true)
      showError(err instanceof Error ? err.message : 'Failed to save keys')
      return false
    } finally {
      setStoring(false)
    }
  }


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

      const saved = await handleSaveKeys()
      if (saved) {
        reset()
        onComplete()
      }
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
          {hasKeys && (
            <Card className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-phosphor-muted rounded-sm flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-phosphor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-medium text-primary">Registered On-Chain</h3>
                  <p className="text-xs text-secondary">
                    You have a stealth address registered on-chain.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={existingEntry ? undefined : handleLoadExisting} loading={loadingEntry} disabled={!!existingEntry} className={`w-full ${existingEntry ? '!text-phosphor !border-phosphor !opacity-100' : ''}`}>
                {existingEntry ? (
                  <>
                    <svg className="w-4 h-4 mr-2 text-phosphor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Registration Verified
                  </>
                ) : (
                  'Sign & View Registration'
                )}
              </Button>

              {existingEntry && existingEntryHint && (
                <div className="border-t border-border pt-4">
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
                </div>
              )}
            </Card>
          )}

          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent-amber/20 rounded-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider font-medium text-accent-amber">Back up your keys!</h3>
                <p className="text-xs text-secondary">
                  Your keys will be saved to this browser after registration, but for extra safety you can expand and copy the raw keys below.
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-6">
            <Button onClick={handleGenerate} size="lg" className="w-full">
              Generate Keys
            </Button>
          </Card>
        </>
      )}

      {step === 'register' && spending && viewing && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent-amber/20 rounded-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider font-medium text-accent-amber">Back up your keys!</h3>
                <p className="text-xs text-secondary">
                  Your keys will be saved to this browser after registration, but for extra safety you can expand and copy the raw keys below.
                </p>
              </div>
            </div>
            {saveFailed && (
              <Button variant="outline" onClick={handleSaveKeys} loading={storing} className="w-full">
                Save Keys
              </Button>
            )}
          </Card>

          <Card className="!p-0 overflow-hidden">
            <button
              onClick={() => setShowRawKeys(!showRawKeys)}
              className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-hover transition-colors"
            >
              <span className="text-xs uppercase tracking-wider font-medium text-primary">See Raw Keys</span>
              <span
                className="text-tertiary text-[10px] transition-transform duration-200"
                style={{ transform: showRawKeys ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▶
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: showRawKeys ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-4 space-y-4 border-t border-border">
                  <div className="pt-4 space-y-4">
                    <h3 className="text-xs uppercase tracking-wider font-medium text-primary">Spending Keypair</h3>
                    <KeyDisplay label="Secret (keep private!)" value={bytesToHex(spending.secret)} />
                    <KeyDisplay label="Public Key (S)" value={bytesToHex(spending.pubkey)} />
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <h3 className="text-xs uppercase tracking-wider font-medium text-primary">Viewing Keypair</h3>
                    <KeyDisplay label="Secret (keep private!)" value={bytesToHex(viewing.secret)} />
                    <KeyDisplay label="Public Key (V)" value={bytesToHex(viewing.pubkey)} />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-6">
            <Input
              label="Hint"
              placeholder="e.g., alice, bob.payments, myname"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />

            <Button onClick={handleRegister} loading={loading || storing} size="lg" className="w-full">
              {storing ? 'Saving Keys' : 'Register'}
            </Button>
          </Card>
        </div>
      )}

    </>
  )
}

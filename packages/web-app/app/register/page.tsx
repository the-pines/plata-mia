'use client'

import { Button, Card, Input, KeyDisplay } from '@/components/ui'
import {
  generateSpendingKeyPair,
  generateViewingKeyPair,
  bytesToHex,
  pubkeyToBytes32,
} from '@plata-mia/stealth-core'
import { useWallet } from '@/hooks/useWallet'
import { polkadotHubTestnet } from '@/lib/contracts'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'
import { storeKeys, hasStoredKeys } from '@/lib/keyStorage'
import { useRegisterStore } from '@/stores/registerStore'
import { useRegisterMetaMask, useRegisterPolkadotJs } from '@/queries/useRegistryQueries'
import type { ApiPromise } from '@polkadot/api'
import type { Signer } from '@polkadot/api/types'

export default function RegisterPage() {
  const { isConnected, account, api, signer, walletType } = useWallet()

  const {
    step,
    spending,
    viewing,
    hint,
    nickname,
    loading,
    storing,
    keysSaved,
    savePassword,
    setHint,
    setNickname,
    setSavePassword,
    setKeys,
    setStoring,
    setKeysSaved,
    setLoading,
    complete,
    reset,
  } = useRegisterStore()

  const registerMetaMask = useRegisterMetaMask()
  const registerPolkadotJs = useRegisterPolkadotJs()

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
          nickname: nickname || hint,
          account: account.address as `0x${string}`,
        })
      } else if (walletType === 'polkadotjs' && api && signer) {
        await registerPolkadotJs.mutateAsync({
          hint,
          spendingKey: spendBytes32,
          viewingKey: viewBytes32,
          preferredChain: polkadotHubTestnet.id,
          nickname: nickname || hint,
          api: api as ApiPromise,
          signerAddress: account.address,
          signer: signer as Signer,
        })
      } else {
        throw new Error('Wallet not properly connected')
      }

      dismissToast(loadingId)
      showSuccess('Hint registered on-chain!')
      complete()
    } catch (err) {
      dismissToast(loadingId)
      showError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray">Register</h1>
          <p className="text-gray-light mt-2">
            Generate your stealth keys to receive private payments
          </p>
        </div>
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lemon rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray">Connect Your Wallet</h2>
              <p className="text-sm text-gray-light">
                Please connect your wallet to register your stealth address.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray">Register</h1>
        <p className="text-gray-light mt-2">
          Generate your stealth keys to receive private payments
        </p>
      </div>

      {step === 'generate' && (
        <Card className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray">Step 1: Generate Keys</h2>
            <p className="text-gray-lighter text-sm">
              Click the button below to generate your spending and viewing keypairs.
              These keys will allow you to receive and spend private payments.
            </p>
          </div>
          <Button onClick={handleGenerate} size="lg">
            Generate Keys
          </Button>
        </Card>
      )}

      {step === 'register' && spending && viewing && (
        <div className="space-y-6">
          <Card variant="highlight" className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-lemon rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray">Save your keys!</h3>
                <p className="text-sm text-gray-light">
                  Copy and securely store these keys. They will not be shown again.
                  You need the viewing secret to scan for payments and the spending secret to spend them.
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-6">
            <h2 className="text-xl font-semibold text-gray">Step 2: Your Keys</h2>

            <div className="space-y-4">
              <h3 className="font-medium text-gray">Spending Keypair</h3>
              <KeyDisplay label="Secret (keep private!)" value={bytesToHex(spending.secret)} />
              <KeyDisplay label="Public Key (S)" value={bytesToHex(spending.pubkey)} />
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h3 className="font-medium text-gray">Viewing Keypair</h3>
              <KeyDisplay label="Secret (keep private!)" value={bytesToHex(viewing.secret)} />
              <KeyDisplay label="Public Key (V)" value={bytesToHex(viewing.pubkey)} />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray">Save Keys to Browser</h3>
                <p className="text-sm text-gray-lighter">
                  Encrypt and store your keys locally so you don&apos;t have to paste them every time.
                </p>
              </div>
              {keysSaved && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>
            {!keysSaved && (
              <>
                {walletType === 'polkadotjs' && (
                  <Input
                    label="Encryption Password"
                    type="password"
                    placeholder="Choose a password to encrypt your keys"
                    value={savePassword}
                    onChange={(e) => setSavePassword(e.target.value)}
                  />
                )}
                <Button
                  variant="outline"
                  onClick={handleSaveKeys}
                  loading={storing}
                  className="w-full"
                >
                  {walletType === 'metamask' ? 'Sign & Save to Browser' : 'Encrypt & Save to Browser'}
                </Button>
              </>
            )}
          </Card>

          <Card className="space-y-6">
            <h2 className="text-xl font-semibold text-gray">Step 3: Register</h2>
            <p className="text-gray-lighter text-sm">
              Choose a memorable hint that others can use to find you (like a username).
            </p>

            <Input
              label="Hint"
              placeholder="e.g., alice, bob.payments, myname"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />

            <Input
              label="Nickname (optional)"
              placeholder="Display name for your stealth address"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />

            <Button onClick={handleRegister} loading={loading} size="lg" className="w-full">
              Register
            </Button>
          </Card>
        </div>
      )}

      {step === 'done' && (
        <Card variant="highlight" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray">Registration Complete!</h2>
              <p className="text-gray-light">
                Your stealth address is now registered with hint: <span className="font-mono font-medium">{hint}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-light">
            <p>Others can now send you private payments using your hint.</p>
            <p className="font-medium text-gray">
              Remember: Keep your secret keys safe. You&apos;ll need them to receive and spend payments.
            </p>
          </div>

          {!keysSaved && spending && viewing && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-sm text-gray-light">
                You haven&apos;t saved your keys to this browser yet. Save them now so you can unlock them on the receive page.
              </p>
              {walletType === 'polkadotjs' && (
                <Input
                  label="Encryption Password"
                  type="password"
                  placeholder="Choose a password to encrypt your keys"
                  value={savePassword}
                  onChange={(e) => setSavePassword(e.target.value)}
                />
              )}
              <Button variant="outline" onClick={handleSaveKeys} loading={storing} className="w-full">
                {walletType === 'metamask' ? 'Sign & Save to Browser' : 'Encrypt & Save to Browser'}
              </Button>
            </div>
          )}

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/receive'}>
              Go to Receive
            </Button>
            <Button variant="secondary" onClick={reset}>
              Register Another
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button, Card, Input, KeyDisplay } from '@/components/ui'
import { registerWithMetaMask, registerWithPolkadotJs } from '@/services/registry'
import {
  generateSpendingKeyPair,
  generateViewingKeyPair,
  bytesToHex,
  KeyPair,
} from '@/hooks/useStealth'
import { useWallet } from '@/hooks/useWallet'
import { polkadotHubTestnet } from '@/lib/contracts'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'
import type { ApiPromise } from '@polkadot/api'
import type { Signer } from '@polkadot/types/types'

type Step = 'generate' | 'register' | 'done'

export default function RegisterPage() {
  const { isConnected, account, api, signer, walletType } = useWallet()
  const [step, setStep] = useState<Step>('generate')
  const [spending, setSpending] = useState<KeyPair | null>(null)
  const [viewing, setViewing] = useState<KeyPair | null>(null)
  const [hint, setHint] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = () => {
    const spendingKp = generateSpendingKeyPair()
    const viewingKp = generateViewingKeyPair()
    setSpending(spendingKp)
    setViewing(viewingKp)
    setStep('register')
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
      if (walletType === 'metamask') {
        await registerWithMetaMask(
          hint,
          bytesToHex(spending.pubkey),
          bytesToHex(viewing.pubkey),
          polkadotHubTestnet.id,
          nickname || hint,
          account.address as `0x${string}`
        )
      } else if (walletType === 'polkadotjs' && api && signer) {
        await registerWithPolkadotJs(
          hint,
          bytesToHex(spending.pubkey),
          bytesToHex(viewing.pubkey),
          polkadotHubTestnet.id,
          nickname || hint,
          api as ApiPromise,
          account.address,
          signer as Signer
        )
      } else {
        throw new Error('Wallet not properly connected')
      }

      dismissToast(loadingId)
      showSuccess('Hint registered on-chain!')
      setStep('done')
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

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/receive'}>
              Go to Receive
            </Button>
            <Button variant="secondary" onClick={() => {
              setStep('generate')
              setSpending(null)
              setViewing(null)
              setHint('')
              setNickname('')
            }}>
              Register Another
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

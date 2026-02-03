'use client'

import { useState } from 'react'
import { Button, Card, Input, KeyDisplay } from '@/components/ui'
import { lookup, StealthMetaAddress } from '@/services/registry.mock'
import { publishAnnouncement } from '@/services/xxProxy.mock'
import {
  deriveStealthAddress,
  bytesToHex,
  hexToBytes,
  DerivedAddress,
} from '@/hooks/useStealth'
import { useWallet } from '@/hooks/useWallet'
import { CHAIN_CONFIG } from '@/lib/constants'

type Step = 'lookup' | 'send' | 'done'

export default function SendPage() {
  const { isConnected } = useWallet()
  const [step, setStep] = useState<Step>('lookup')
  const [hint, setHint] = useState('')
  const [recipient, setRecipient] = useState<StealthMetaAddress | null>(null)
  const [derivedAddress, setDerivedAddress] = useState<DerivedAddress | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')

  const handleLookup = async () => {
    if (!hint.trim()) {
      setError('Please enter a hint')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await lookup(hint)
      if (!result) {
        setError('Recipient not found')
        return
      }

      setRecipient(result)

      // Derive stealth address
      const derived = deriveStealthAddress(
        hexToBytes(result.spendingKey),
        hexToBytes(result.viewingKey),
        CHAIN_CONFIG.ss58Prefix
      )
      setDerivedAddress(derived)
      setStep('send')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!derivedAddress || !amount) {
      setError('Please enter an amount')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Mock transfer - in real implementation, this would be a Polkadot.js transfer
      const mockBlockNumber = Math.floor(Date.now() / 1000)
      const mockTxHash = '0x' + bytesToHex(crypto.getRandomValues(new Uint8Array(32)))

      // Publish announcement to xx-network (mock)
      await publishAnnouncement(
        bytesToHex(derivedAddress.ephemeralPubkey),
        derivedAddress.viewTag,
        mockBlockNumber
      )

      setTxHash(mockTxHash)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('lookup')
    setHint('')
    setRecipient(null)
    setDerivedAddress(null)
    setAmount('')
    setError('')
    setTxHash('')
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray">Send</h1>
          <p className="text-gray-light mt-2">
            Send private payments to stealth addresses
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
                Please connect your Polkadot.js wallet to send private payments.
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
        <h1 className="text-3xl font-bold text-gray">Send</h1>
        <p className="text-gray-light mt-2">
          Send private payments to stealth addresses
        </p>
      </div>

      {step === 'lookup' && (
        <Card className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray">Find Recipient</h2>
            <p className="text-gray-lighter text-sm">
              Enter the recipient&apos;s hint to look up their stealth address.
            </p>
          </div>

          <Input
            label="Recipient Hint"
            placeholder="e.g., alice, bob.payments"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            error={error}
          />

          <Button onClick={handleLookup} loading={loading} size="lg">
            Look Up
          </Button>
        </Card>
      )}

      {step === 'send' && recipient && derivedAddress && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-gray">Recipient Found</h2>

            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-lighter">Hint</span>
                <span className="font-mono text-gray">{hint}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-lighter">Chain</span>
                <span className="text-gray">{CHAIN_CONFIG.name}</span>
              </div>
            </div>

            <KeyDisplay
              label="Stealth Address (unique for this payment)"
              value={derivedAddress.address}
            />
          </Card>

          <Card className="space-y-6">
            <h2 className="text-xl font-semibold text-gray">Send Payment</h2>

            <Input
              label={`Amount (${CHAIN_CONFIG.tokenSymbol})`}
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={error}
            />

            <div className="p-4 bg-lemon-light rounded-lg border border-lemon">
              <p className="text-sm text-gray">
                <span className="font-medium">Note:</span> This is a demo with mocked transfers.
                The announcement will be published but no real tokens will be transferred.
              </p>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={handleSend} loading={loading} size="lg" className="flex-1">
                Send {amount ? `${amount} ${CHAIN_CONFIG.tokenSymbol}` : ''}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === 'done' && derivedAddress && (
        <Card variant="highlight" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray">Payment Sent!</h2>
              <p className="text-gray-light">
                {amount} {CHAIN_CONFIG.tokenSymbol} sent to {hint}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <KeyDisplay label="Stealth Address" value={derivedAddress.address} />
            <KeyDisplay label="Transaction Hash (mock)" value={txHash} />
          </div>

          <p className="text-sm text-gray-lighter">
            The announcement has been published. The recipient can now scan for this payment.
          </p>

          <Button onClick={reset} variant="secondary" className="w-full">
            Send Another Payment
          </Button>
        </Card>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Input,
  KeyDisplay,
  ChainSelector,
  TransferStatus,
  TabBar,
} from '@/components/ui'
import { publishAnnouncement } from '@/services'
import { getTokenGatewayService } from '@/services/tokenGateway'
import {
  deriveStealthAddress,
  bytesToHex,
  hexToBytes,
} from '@plata-mia/stealth-core'
import { useWallet } from '@/hooks/useWallet'
import {
  getChainById,
  isCrossChainTransfer,
  requiresHyperbridge,
  ensureMetaMaskChain,
} from '@/lib/chains'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'
import { useSendStore } from '@/stores/sendStore'
import { useHistoryStore, getPendingCount } from '@/stores/historyStore'
import { type HistoryEntry } from '@/types/history'
import { SendHistory } from '@/components/send/SendHistory'
import { useQueryClient } from '@tanstack/react-query'
import { registryKeys } from '@/queries/useRegistryQueries'
import { lookup } from '@/services/registry'

export default function SendPage() {
  const { isConnected, account } = useWallet()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send')

  const {
    step,
    hint,
    recipient,
    derivedAddress,
    amount,
    sourceChainId,
    destChainId,
    txHash,
    transferProgress,
    loading,
    setHint,
    setAmount,
    setSourceChainId,
    setDestChainId,
    setLookupResult,
    startTransfer,
    updateProgress,
    completeTransfer,
    failTransfer,
    setLoading,
    reset,
  } = useSendStore()

  const { entries, loadForWallet, addEntry } = useHistoryStore()

  const sourceChain = getChainById(sourceChainId) || null
  const destChain = getChainById(destChainId) || null
  const isCrossChain = sourceChain && destChain && isCrossChainTransfer(sourceChain, destChain)
  const usesHyperbridge = sourceChain && destChain && requiresHyperbridge(sourceChain, destChain)
  const pendingCount = getPendingCount(entries)

  useEffect(() => {
    if (account?.address) {
      loadForWallet(account.address)
    }
  }, [account?.address, loadForWallet])

  const saveHistoryEntry = (txHash: string, requestId?: string, commitmentHash?: string) => {
    if (!sourceChain || !destChain || !derivedAddress) return

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      hint,
      recipientAddress: derivedAddress.address,
      amount,
      tokenSymbol: sourceChain.tokenSymbol,
      sourceChainId: sourceChain.id,
      destChainId: destChain.id,
      transferType: isCrossChain ? 'cross-chain' : 'same-chain',
      status: isCrossChain ? 'source_finalized' : 'completed',
      txHash,
      requestId,
      commitmentHash,
    }
    addEntry(entry)
  }

  const handleLookup = async () => {
    if (!hint.trim()) {
      showError('Please enter a hint')
      return
    }

    if (!destChain) {
      showError('Please select a destination chain')
      return
    }

    setLoading(true)
    const loadingId = showLoading('Looking up recipient...')

    try {
      const result = await queryClient.fetchQuery({
        queryKey: registryKeys.lookup(hint),
        queryFn: () => lookup(hint),
        staleTime: 60_000,
      })
      dismissToast(loadingId)

      if (!result) {
        showError('Recipient not found')
        return
      }

      const derived = deriveStealthAddress(
        hexToBytes(result.spendingKey),
        hexToBytes(result.viewingKey)
      )
      setLookupResult(result, derived)
      showSuccess('Recipient found')
    } catch (err) {
      dismissToast(loadingId)
      showError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!derivedAddress || !amount || !sourceChain || !destChain) {
      showError('Please fill in all fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      showError('Please enter a valid amount')
      return
    }

    startTransfer()

    try {
      await ensureMetaMaskChain(sourceChain)
      const amountBigInt = BigInt(Math.floor(amountNum * 10 ** sourceChain.tokenDecimals))

      if (isCrossChain && usesHyperbridge) {
        const gateway = getTokenGatewayService()

        const result = await gateway.teleport(
          {
            sourceChain,
            destChain,
            recipient: derivedAddress.address,
            amount: amountBigInt,
          },
          (progress) => {
            updateProgress(progress)
          }
        )

        const blockNumber = result.txHash
          ? Math.floor(Date.now() / 1000)
          : Math.floor(Date.now() / 1000)
        await publishAnnouncement(
          bytesToHex(derivedAddress.ephemeralPubkey.slice(1)),
          derivedAddress.viewTag,
          blockNumber
        )

        saveHistoryEntry(result.txHash, result.requestId, result.commitmentHash)
        completeTransfer(result.txHash)
      } else {
        updateProgress({ status: 'signing' })

        const { createPublicClient, createWalletClient, custom, http } = await import('viem')

        if (typeof window === 'undefined' || !window.ethereum) {
          throw new Error('No wallet detected')
        }

        const walletClient = createWalletClient({
          transport: custom(window.ethereum),
        })

        const publicClient = createPublicClient({
          transport: http(sourceChain.rpcUrl),
        })

        const [walletAccount] = await walletClient.requestAddresses()
        if (!walletAccount) throw new Error('No account connected')

        const hash = await walletClient.sendTransaction({
          account: walletAccount,
          to: derivedAddress.address,
          value: amountBigInt,
          chain: {
            id: sourceChain.chainId!,
            name: sourceChain.name,
            nativeCurrency: {
              name: sourceChain.tokenSymbol,
              symbol: sourceChain.tokenSymbol,
              decimals: sourceChain.tokenDecimals,
            },
            rpcUrls: { default: { http: [sourceChain.rpcUrl] } },
          },
        })

        updateProgress({ status: 'source_submitted', txHash: hash })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        const blockNumber = Number(receipt.blockNumber)

        updateProgress({
          status: 'source_finalized',
          txHash: hash,
          sourceBlockNumber: blockNumber,
        })

        await publishAnnouncement(
          bytesToHex(derivedAddress.ephemeralPubkey.slice(1)),
          derivedAddress.viewTag,
          blockNumber
        )

        saveHistoryEntry(hash)
        completeTransfer(hash)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed'
      showError(errorMessage)
      failTransfer(errorMessage)
    }
  }

  if (!isConnected) {
    return (
      <div className="w-full space-y-6">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-phosphor-muted rounded-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-phosphor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-wider font-medium text-primary">Connect Your Wallet</h2>
              <p className="text-xs text-secondary">
                Please connect your wallet to send private payments.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <TabBar
        tabs={[
          { key: 'send', label: 'Send' },
          { key: 'history', label: 'History', count: pendingCount },
        ]}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as 'send' | 'history')}
      />

      {activeTab === 'history' && <SendHistory />}

      {activeTab === 'send' && (
        <>
          {step === 'lookup' && (
            <Card className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <ChainSelector
                  label="Source Chain"
                  value={sourceChainId}
                  onChange={setSourceChainId}
                />
                <ChainSelector
                  label="Destination Chain"
                  value={destChainId}
                  onChange={setDestChainId}
                />
              </div>

              {isCrossChain && (
                <div className="p-3 bg-accent-cyan-muted border border-accent-cyan/20 rounded-sm">
                  <p className="text-xs uppercase tracking-wider text-accent-cyan">
                    Cross-chain transfer via Hyperbridge
                  </p>
                </div>
              )}

              <Input
                label="Recipient Hint"
                placeholder="e.g., alice, bob.payments"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
              />

              <Button onClick={handleLookup} loading={loading} size="lg">
                Look Up
              </Button>
            </Card>
          )}

          {step === 'send' && recipient && derivedAddress && sourceChain && destChain && (
            <div className="space-y-6">
              <Card className="space-y-4">
                <div className="p-4 bg-surface-page border border-border rounded-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-secondary">Hint</span>
                    <span className="text-primary">{hint}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-secondary">Source</span>
                    <span className="text-primary">{sourceChain.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-secondary">Destination</span>
                    <span className="text-primary">{destChain.name}</span>
                  </div>
                </div>

                <KeyDisplay
                  label={`Stealth Address (${destChain.type.toUpperCase()})`}
                  value={derivedAddress.address}
                />
              </Card>

              <Card className="space-y-6">
                <Input
                  label={`Amount (${sourceChain.tokenSymbol})`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
                  }}
                />

                {isCrossChain && (
                  <div className="p-4 bg-accent-cyan-muted rounded-sm border border-accent-cyan/20">
                    <p className="text-xs text-accent-cyan">
                      This will use Hyperbridge to securely bridge your tokens. Transfer may take a few
                      minutes.
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" onClick={reset}>
                    Cancel
                  </Button>
                  <Button onClick={handleSend} loading={loading} size="lg" className="flex-1">
                    Send {amount ? `${amount} ${sourceChain.tokenSymbol}` : ''}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {step === 'transferring' && transferProgress && sourceChain && (
            <Card className="space-y-6">
              <TransferStatus
                status={transferProgress.status}
                isCrossChain={!!isCrossChain}
                sourceTxHash={transferProgress.txHash}
                sourceExplorerUrl={sourceChain.explorerUrl}
                error={transferProgress.error}
              />

              {transferProgress.status === 'failed' && (
                <Button onClick={reset} variant="outline" className="w-full">
                  Try Again
                </Button>
              )}
            </Card>
          )}

          {step === 'done' && derivedAddress && sourceChain && destChain && (
            <Card variant="highlight" className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-surface-page border border-border rounded-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase tracking-wider text-secondary">From</span>
                    <span className="text-primary">{sourceChain.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase tracking-wider text-secondary">To</span>
                    <span className="text-primary">{destChain.name}</span>
                  </div>
                </div>
                <KeyDisplay label="Stealth Address" value={derivedAddress.address} />
                <KeyDisplay
                  label="Transaction Hash"
                  value={txHash}
                />
              </div>

              {sourceChain.explorerUrl && txHash && (
                <a
                  href={`${sourceChain.explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-accent-cyan hover:underline"
                >
                  View on {sourceChain.name} Explorer
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}

              <Button onClick={reset} variant="secondary" className="w-full">
                Send Another Payment
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

'use client'

import {
  Button,
  Card,
  Input,
  KeyDisplay,
  ChainSelector,
  TransferStatus,
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
import { useQueryClient } from '@tanstack/react-query'
import { registryKeys } from '@/queries/useRegistryQueries'
import { lookup } from '@/services/registry'

export default function SendPage() {
  const { isConnected } = useWallet()
  const queryClient = useQueryClient()

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

  const sourceChain = getChainById(sourceChainId) || null
  const destChain = getChainById(destChainId) || null
  const isCrossChain = sourceChain && destChain && isCrossChainTransfer(sourceChain, destChain)
  const usesHyperbridge = sourceChain && destChain && requiresHyperbridge(sourceChain, destChain)

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

        const [account] = await walletClient.requestAddresses()
        if (!account) throw new Error('No account connected')

        const hash = await walletClient.sendTransaction({
          account,
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
                Please connect your wallet to send private payments.
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
            <h2 className="text-xl font-semibold text-gray">Select Chains</h2>
            <p className="text-gray-lighter text-sm">
              Choose the source chain (where you&apos;ll send from) and destination chain
              (where the recipient will receive funds).
            </p>
          </div>

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
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Cross-chain transfer via Hyperbridge
              </p>
            </div>
          )}

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
          />

          <Button onClick={handleLookup} loading={loading} size="lg">
            Look Up
          </Button>
        </Card>
      )}

      {step === 'send' && recipient && derivedAddress && sourceChain && destChain && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-gray">Recipient Found</h2>

            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-lighter">Hint</span>
                <span className="font-mono text-gray">{hint}</span>
              </div>
              {recipient.nickname && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-lighter">Nickname</span>
                  <span className="text-gray">{recipient.nickname}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-lighter">Source</span>
                <span className="text-gray">{sourceChain.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-lighter">Destination</span>
                <span className="text-gray">{destChain.name}</span>
              </div>
              {isCrossChain && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-lighter">Transfer Type</span>
                  <span className="text-blue-600 font-medium">Cross-chain (Hyperbridge)</span>
                </div>
              )}
            </div>

            <KeyDisplay
              label={`Stealth Address (${destChain.type.toUpperCase()})`}
              value={derivedAddress.address}
            />
          </Card>

          <Card className="space-y-6">
            <h2 className="text-xl font-semibold text-gray">Send Payment</h2>

            <Input
              label={`Amount (${sourceChain.tokenSymbol})`}
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {!isCrossChain && sourceChain.type === 'evm' && (
              <div className="p-4 bg-lemon-light rounded-lg border border-lemon">
                <p className="text-sm text-gray">
                  <span className="font-medium">Note:</span> This will send a native token
                  transfer to the derived stealth address via your connected wallet.
                </p>
              </div>
            )}

            {isCrossChain && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Cross-chain transfer:</span> This will use
                  Hyperbridge to securely bridge your tokens. Transfer may take a few
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
          <h2 className="text-xl font-semibold text-gray">Transfer in Progress</h2>

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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray">Payment Sent!</h2>
              <p className="text-gray-light">
                {amount} {sourceChain.tokenSymbol} sent to {hint}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-lighter">From</span>
                <span className="text-gray">{sourceChain.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-lighter">To</span>
                <span className="text-gray">{destChain.name}</span>
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
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
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

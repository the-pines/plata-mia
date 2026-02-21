'use client'

import { type HistoryEntry, TERMINAL_STATUSES } from '@/types/history'
import { getChainById } from '@/lib/chains'
import { getHyperbridgeExplorerLink } from '@/lib/constants'
import { Card } from '@/components/ui'

interface HistoryCardProps {
  entry: HistoryEntry
}

const STATUS_CONFIG = {
  pending:          { dot: 'bg-tertiary' },
  source_finalized: { dot: 'bg-lemon' },
  relaying:         { dot: 'bg-accent-blue' },
  completed:        { dot: 'bg-accent-green' },
  failed:           { dot: 'bg-accent-red' },
  timeout:          { dot: 'bg-orange-500' },
} as const

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const BRIDGE_STEPS = [
  { key: 'source_finalized', label: 'Sent' },
  { key: 'relaying',         label: 'Bridging' },
  { key: 'completed',        label: 'Arrived' },
] as const

function stepIndex(status: string): number {
  if (status === 'completed') return 3
  if (status === 'relaying') return 2
  if (status === 'source_finalized') return 1
  return 0
}

function BridgeProgress({ status }: { status: string }) {
  const current = stepIndex(status)

  return (
    <div className="flex items-center gap-1 py-1">
      {BRIDGE_STEPS.map((step, i) => {
        const done = i < current
        const active = i === current && current < 3

        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-6 h-0.5 ${done || active ? 'bg-accent-blue' : 'bg-border'}`} />
            )}
            <div className="flex items-center gap-1">
              {done ? (
                <svg className="w-3.5 h-3.5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : active ? (
                <Spinner className="w-3.5 h-3.5 text-accent-blue" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-sm border-2 border-border" />
              )}
              <span className={`text-xs uppercase tracking-wider ${done ? 'text-accent-green' : active ? 'text-accent-blue font-medium' : 'text-tertiary'}`}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function HistoryCard({ entry }: HistoryCardProps) {
  const sourceChain = getChainById(entry.sourceChainId)
  const destChain = getChainById(entry.destChainId)
  const config = STATUS_CONFIG[entry.status]
  const isTerminal = TERMINAL_STATUSES.includes(entry.status)
  const isCrossChain = entry.transferType === 'cross-chain'
  const isTestnet = sourceChain?.isTestnet || destChain?.isTestnet || false
  const bridgeExplorerLink = getHyperbridgeExplorerLink(entry.commitmentHash, isTestnet)
  const isActive = !isTerminal && (entry.status === 'pending' || entry.status === 'relaying')

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${isTerminal ? config.dot : 'bg-lemon'} ${isActive ? 'animate-flicker' : ''}`} />
          <span className="font-medium text-primary">
            {entry.amount} {entry.tokenSymbol}
          </span>
        </div>
        <span className="text-xs text-tertiary">{formatTimeAgo(entry.timestamp)}</span>
      </div>

      <div className="text-xs text-secondary">
        <span className="uppercase tracking-wider">To:</span> <span className="text-primary">{entry.hint}</span>
      </div>

      <div className="text-xs text-secondary">
        {sourceChain?.name ?? entry.sourceChainId}
        {' → '}
        {destChain?.name ?? entry.destChainId}
      </div>

      {isCrossChain && !entry.status.startsWith('fail') && entry.status !== 'timeout' && (
        <BridgeProgress status={entry.status} />
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border text-xs flex-wrap">
        {sourceChain?.explorerUrl && entry.txHash && (
          <a
            href={`${sourceChain.explorerUrl}/tx/${entry.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            View on {sourceChain.name}
          </a>
        )}
        {isCrossChain && bridgeExplorerLink && (
          <>
            <span className="text-tertiary">|</span>
            <a
              href={bridgeExplorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              View on Hyperbridge
            </a>
          </>
        )}
        {isCrossChain && entry.destTxHash && destChain?.explorerUrl && (
          <>
            <span className="text-tertiary">|</span>
            <a
              href={`${destChain.explorerUrl}/tx/${entry.destTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              View on {destChain.name}
            </a>
          </>
        )}
      </div>
    </Card>
  )
}

'use client'

import { useState } from 'react'
import { type HistoryEntry, TERMINAL_STATUSES } from '@/types/history'
import { getChainById } from '@/lib/chains'
import { getHyperbridgeExplorerLink } from '@/lib/constants'
import { Card } from '@/components/ui'

interface HistoryCardProps {
  entry: HistoryEntry
}

const STATUS_CONFIG = {
  pending:          { dot: 'bg-tertiary' },
  source_finalized: { dot: 'bg-phosphor' },
  relaying:         { dot: 'bg-accent-cyan' },
  completed:        { dot: 'bg-phosphor' },
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
              <div className={`w-6 h-0.5 ${done || active ? 'bg-accent-cyan' : 'bg-border'}`} />
            )}
            <div className="flex items-center gap-1">
              {done ? (
                <svg className="w-3.5 h-3.5 text-phosphor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : active ? (
                <Spinner className="w-3.5 h-3.5 text-accent-cyan" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-sm border-2 border-border" />
              )}
              <span className={`text-xs uppercase tracking-wider ${done ? 'text-phosphor' : active ? 'text-accent-cyan font-medium' : 'text-tertiary'}`}>
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
  const [open, setOpen] = useState(false)
  const sourceChain = getChainById(entry.sourceChainId)
  const destChain = getChainById(entry.destChainId)
  const config = STATUS_CONFIG[entry.status]
  const isTerminal = TERMINAL_STATUSES.includes(entry.status)
  const isCrossChain = entry.transferType === 'cross-chain'
  const isTestnet = sourceChain?.isTestnet || destChain?.isTestnet || false
  const bridgeExplorerLink = getHyperbridgeExplorerLink(entry.commitmentHash, isTestnet)
  const isActive = !isTerminal && (entry.status === 'pending' || entry.status === 'relaying' || (isCrossChain && entry.status === 'source_finalized'))

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          {isActive ? (
            <Spinner className="w-4 h-4 text-phosphor shrink-0" />
          ) : (
            <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${config.dot}`} />
          )}
          <span className="font-medium text-primary">
            {entry.amount} {entry.tokenSymbol}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-tertiary">{formatTimeAgo(entry.timestamp)}</span>
          <span
            className="text-tertiary text-[10px] transition-transform duration-200"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▶
          </span>
        </div>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4 space-y-3 border-t border-border">
            <div className="text-xs text-secondary pt-3">
              <span className="uppercase tracking-wider">To:</span>{' '}
              <span className="text-primary">{entry.hint}</span>
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
                  className="text-accent-cyan hover:underline"
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
                    className="text-accent-cyan hover:underline"
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
                    className="text-accent-cyan hover:underline"
                  >
                    View on {destChain.name}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

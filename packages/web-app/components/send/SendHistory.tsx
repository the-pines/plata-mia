'use client'

import { useEffect, useRef } from 'react'
import { useHistoryStore } from '@/stores/historyStore'
import { useWallet } from '@/hooks/useWallet'
import { getTokenGatewayService, type TransferProgress } from '@/services/tokenGateway'
import { type HistoryEntry, type HistoryStatus, TERMINAL_STATUSES } from '@/types/history'
import { Card } from '@/components/ui'
import { HistoryCard } from './HistoryCard'

const POLL_INTERVAL_MS = 30_000
const THROTTLE_MS = 20_000

const STATUS_ORDER: HistoryStatus[] = [
  'pending',
  'source_finalized',
  'relaying',
  'completed',
]

function mapTransferStatus(progress: TransferProgress): HistoryStatus {
  switch (progress.status) {
    case 'source_finalized':
      return 'source_finalized'
    case 'hyperbridge_relaying':
      return 'relaying'
    case 'dest_finalized':
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'timeout':
      return 'timeout'
    default:
      return 'pending'
  }
}

function shouldUpgrade(current: HistoryStatus, incoming: HistoryStatus): boolean {
  const currentIdx = STATUS_ORDER.indexOf(current)
  const incomingIdx = STATUS_ORDER.indexOf(incoming)
  if (currentIdx === -1 || incomingIdx === -1) {
    return TERMINAL_STATUSES.includes(incoming)
  }
  return incomingIdx > currentIdx
}

export function SendHistory() {
  const { account } = useWallet()
  const { entries, loadForWallet, updateStatus } = useHistoryStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (account?.address) {
      loadForWallet(account.address)
    }
  }, [account?.address, loadForWallet])

  const pollEntry = async (entry: HistoryEntry) => {
    if (!entry.commitmentHash) return
    if (TERMINAL_STATUSES.includes(entry.status)) return
    if (entry.lastChecked && Date.now() - entry.lastChecked < THROTTLE_MS) return

    try {
      const gateway = getTokenGatewayService()
      const progress = await gateway.queryStatus(entry.commitmentHash)
      const newStatus = mapTransferStatus(progress)

      const extra: Partial<HistoryEntry> = {}
      if (progress.destTxHash) {
        extra.destTxHash = progress.destTxHash
      }

      if (shouldUpgrade(entry.status, newStatus)) {
        updateStatus(entry.id, newStatus, extra)
      } else {
        updateStatus(entry.id, entry.status, extra)
      }
    } catch {
      updateStatus(entry.id, entry.status)
    }
  }

  const pollAll = () => {
    const current = useHistoryStore.getState().entries
    const pollable = current.filter(
      (e) => e.transferType === 'cross-chain' && !TERMINAL_STATUSES.includes(e.status)
    )
    pollable.forEach(pollEntry)
  }

  useEffect(() => {
    const hasPollable = entries.some(
      (e) => e.transferType === 'cross-chain' && !TERMINAL_STATUSES.includes(e.status)
    )

    if (hasPollable) {
      intervalRef.current = setInterval(pollAll, POLL_INTERVAL_MS)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length])

  if (entries.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="w-12 h-12 bg-module rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-secondary text-sm">No transactions yet</p>
        <p className="text-tertiary text-xs">Your send history will appear here</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <HistoryCard key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

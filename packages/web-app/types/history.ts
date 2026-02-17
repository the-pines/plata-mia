export type HistoryStatus =
  | 'pending'
  | 'source_finalized'
  | 'relaying'
  | 'completed'
  | 'failed'
  | 'timeout'

export type TransferType = 'same-chain' | 'cross-chain'

export interface HistoryEntry {
  id: string
  timestamp: number
  hint: string
  recipientAddress: string
  amount: string
  tokenSymbol: string
  sourceChainId: string
  destChainId: string
  transferType: TransferType
  status: HistoryStatus
  txHash: string
  requestId?: string
  commitmentHash?: string
  destTxHash?: string
  error?: string
  lastChecked?: number
}

export const TERMINAL_STATUSES: HistoryStatus[] = ['completed', 'failed', 'timeout']

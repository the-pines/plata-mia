'use client'

import { TransferStatus as TransferStatusType } from '@/services/tokenGateway'

interface TransferStatusProps {
  status: TransferStatusType
  isCrossChain: boolean
  sourceTxHash?: string
  sourceExplorerUrl?: string
  destExplorerUrl?: string
  error?: string
}

const STATUS_STEPS_SAME_CHAIN = [
  { key: 'signing', label: 'Signing' },
  { key: 'source_submitted', label: 'Submitting' },
  { key: 'source_finalized', label: 'Finalizing' },
  { key: 'completed', label: 'Completed' },
] as const

const STATUS_STEPS_CROSS_CHAIN = [
  { key: 'signing', label: 'Signing' },
  { key: 'source_submitted', label: 'Source Submitted' },
  { key: 'source_finalized', label: 'Source Finalized' },
  { key: 'hyperbridge_relaying', label: 'Relaying via Hyperbridge' },
  { key: 'dest_finalized', label: 'Destination Finalized' },
  { key: 'completed', label: 'Completed' },
] as const

export function TransferStatus({
  status,
  isCrossChain,
  sourceTxHash,
  sourceExplorerUrl,
  destExplorerUrl,
  error,
}: TransferStatusProps) {
  const steps = isCrossChain ? STATUS_STEPS_CROSS_CHAIN : STATUS_STEPS_SAME_CHAIN

  const currentStepIndex = steps.findIndex((s) => s.key === status)
  const isError = status === 'failed' || status === 'timeout'
  const isComplete = status === 'completed'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {isComplete ? (
          <CheckIcon className="w-5 h-5 text-green-500" />
        ) : isError ? (
          <ErrorIcon className="w-5 h-5 text-red-500" />
        ) : (
          <SpinnerIcon className="w-5 h-5 text-lemon animate-spin" />
        )}
        <span className="font-medium text-gray">
          {isError ? 'Transfer Failed' : isComplete ? 'Transfer Complete' : 'Processing...'}
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

        {steps.map((step, index) => {
          const isActive = index === currentStepIndex && !isError
          const isDone = index < currentStepIndex || isComplete
          const isPending = index > currentStepIndex

          return (
            <div key={step.key} className="relative flex items-start gap-3 py-2">
              <div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                  isDone
                    ? 'bg-green-500'
                    : isActive
                      ? 'bg-lemon'
                      : isError && index === currentStepIndex
                        ? 'bg-red-500'
                        : 'bg-gray-200'
                }`}
              >
                {isDone ? (
                  <CheckIcon className="w-3.5 h-3.5 text-white" />
                ) : isActive ? (
                  <div className="w-2 h-2 bg-gray rounded-full animate-pulse" />
                ) : isError && index === currentStepIndex ? (
                  <ErrorIcon className="w-3.5 h-3.5 text-white" />
                ) : (
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <span
                  className={`text-sm ${
                    isDone
                      ? 'text-gray'
                      : isActive
                        ? 'text-gray font-medium'
                        : 'text-gray-lighter'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {sourceTxHash && sourceExplorerUrl && (
        <a
          href={`${sourceExplorerUrl}/tx/${sourceTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          View on explorer
          <ExternalLinkIcon className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

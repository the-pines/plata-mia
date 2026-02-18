'use client'

import { ChainConfig, SUPPORTED_CHAINS } from '@/lib/chains'

interface ChainSelectorProps {
  label?: string
  value: string
  onChange: (chainId: string) => void
  filter?: (chain: ChainConfig) => boolean
  disabled?: boolean
  error?: string
}

export function ChainSelector({
  label,
  value,
  onChange,
  filter,
  disabled = false,
  error,
}: ChainSelectorProps) {
  const chains = filter ? SUPPORTED_CHAINS.filter(filter) : SUPPORTED_CHAINS

  const selectedChain = chains.find((c) => c.id === value)

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-4 py-2.5 pr-10 bg-surface border border-border rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-lemon focus:ring-1 focus:ring-lemon transition-colors disabled:bg-module disabled:cursor-not-allowed ${error ? 'border-accent-red' : ''}`}
        >
          {chains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name} ({chain.tokenSymbol})
              {chain.isTestnet ? ' [Testnet]' : ''}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDownIcon />
        </div>
      </div>
      {selectedChain && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-tertiary">
          <ChainTypeBadge type={selectedChain.type} />
          {selectedChain.isTestnet && (
            <span className="px-1.5 py-0.5 bg-lemon-muted text-lemon rounded">
              Testnet
            </span>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-accent-red">{error}</p>}
    </div>
  )
}

function ChainTypeBadge({ type }: { type: 'evm' | 'substrate' }) {
  const colors = {
    evm: 'bg-accent-blue-muted text-accent-blue',
    substrate: 'bg-[#7B61FF15] text-[#7B61FF]',
  }

  return (
    <span className={`px-1.5 py-0.5 rounded ${colors[type]}`}>
      {type.toUpperCase()}
    </span>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      className="w-4 h-4 text-tertiary"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  )
}

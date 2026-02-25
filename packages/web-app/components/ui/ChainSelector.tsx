'use client'

import { type ChainConfig, getActiveChains } from '@/lib/config'

interface ChainSelectorProps {
  label?: string
  value: string
  onChange: (chainId: string) => void
  chains?: ChainConfig[]
  disabled?: boolean
  error?: string
}

export function ChainSelector({
  label,
  value,
  onChange,
  chains,
  disabled = false,
  error,
}: ChainSelectorProps) {
  const list = chains ?? getActiveChains()
  const selectedChain = list.find((c) => c.id === value)

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs uppercase tracking-wider font-medium text-secondary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-4 py-2.5 pr-10 bg-surface-page border border-border rounded-sm text-primary appearance-none cursor-pointer focus:outline-none focus:border-phosphor focus:shadow-[0_0_0_1px_rgba(0,255,65,0.15)] transition-colors disabled:bg-surface disabled:cursor-not-allowed ${error ? 'border-accent-red' : ''}`}
        >
          {list.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name} ({chain.nativeCurrency.symbol})
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
            <span className="px-1.5 py-0.5 bg-phosphor-muted text-phosphor rounded-sm text-xs uppercase tracking-wider">
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
    evm: 'bg-accent-cyan-muted text-accent-cyan',
    substrate: 'bg-phosphor-muted text-phosphor',
  }

  return (
    <span className={`px-1.5 py-0.5 rounded-sm text-xs uppercase tracking-wider ${colors[type]}`}>
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

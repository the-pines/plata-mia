'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ALL_TOKENS,
  getChain,
  isNativeToken,
  getTokenAddress,
  isCrossChain as checkCrossChain,
} from '@/lib/config'
import { getTokenGatewayService, type TokenAvailability } from '@/services/tokenGateway'

interface TokenSelectorProps {
  chainId: string
  destChainId: string
  value: string
  onChange: (symbol: string) => void
  onAvailabilityChange?: (available: boolean) => void
  disabled?: boolean
}

function getSameChainAvailability(chainId: string): Record<string, TokenAvailability> {
  const result: Record<string, TokenAvailability> = {}
  for (const token of ALL_TOKENS) {
    if (isNativeToken(chainId, token.symbol)) {
      result[token.symbol] = { available: true }
    } else if (getTokenAddress(chainId, token.symbol)) {
      result[token.symbol] = { available: true }
    } else {
      result[token.symbol] = { available: false, reason: 'Not on this chain' }
    }
  }
  return result
}

export function TokenSelector({
  chainId,
  destChainId,
  value,
  onChange,
  onAvailabilityChange,
  disabled = false,
}: TokenSelectorProps) {
  const sourceChain = getChain(chainId)
  const destChain = getChain(destChainId)
  const isCrossChain = sourceChain && destChain && checkCrossChain(sourceChain, destChain)

  const [availability, setAvailability] = useState<Record<string, TokenAvailability>>({})
  const [checking, setChecking] = useState(false)
  const [open, setOpen] = useState(false)
  const checkRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const onAvailabilityChangeRef = useRef(onAvailabilityChange)
  onAvailabilityChangeRef.current = onAvailabilityChange

  const notifyAvailability = useCallback((avail: Record<string, TokenAvailability>, selected: string) => {
    const status = avail[selected]
    onAvailabilityChangeRef.current?.(status?.available !== false)
  }, [])

  useEffect(() => {
    setAvailability({})
    const checkId = ++checkRef.current

    if (!isCrossChain || !sourceChain || !destChain) {
      const sameChain = getSameChainAvailability(chainId)
      setAvailability(sameChain)
      notifyAvailability(sameChain, value)
      return
    }

    setChecking(true)
    const gateway = getTokenGatewayService()
    gateway.checkTokensAvailability(sourceChain, destChain, ALL_TOKENS).then((result) => {
      if (checkId !== checkRef.current) return
      setAvailability(result)
      setChecking(false)
      notifyAvailability(result, value)
    })
  }, [chainId, destChainId, isCrossChain, sourceChain, destChain, value, notifyAvailability])

  useEffect(() => {
    notifyAvailability(availability, value)
  }, [value, availability, notifyAvailability])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = (symbol: string) => {
    if (disabled) return
    onChange(symbol)
    setOpen(false)
  }

  const selectedToken = ALL_TOKENS.find((t) => t.symbol === value)
  const selectedIsNative = isNativeToken(chainId, value)
  const selectedStatus = availability[value]
  const selectedUnavailable = selectedStatus?.available === false
  const selectedChecking = isCrossChain && !selectedStatus && checking

  return (
    <div className="w-full" ref={containerRef}>
      <label className="block text-xs uppercase tracking-wider font-medium text-secondary mb-2">
        Token
      </label>
      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 pr-10 bg-surface-page border rounded-sm text-left
            transition-colors cursor-pointer
            focus:outline-none focus:border-phosphor focus:shadow-[0_0_0_1px_rgba(0,255,65,0.15)]
            disabled:bg-surface disabled:cursor-not-allowed
            ${open ? 'border-phosphor shadow-[0_0_0_1px_rgba(0,255,65,0.15)]' : 'border-border'}
            ${selectedUnavailable ? 'border-accent-red/40' : ''}
          `}
        >
          <span className={`block text-sm ${selectedUnavailable ? 'text-tertiary' : 'text-primary'}`}>
            {selectedToken?.symbol ?? value}
          </span>
          <span className="block text-xs text-tertiary">
            {selectedChecking
              ? 'Checking...'
              : selectedUnavailable
                ? selectedStatus.reason
                : selectedIsNative
                  ? 'Native'
                  : selectedToken?.name ?? ''
            }
          </span>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={`w-4 h-4 text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.5)] max-h-64 overflow-y-auto">
            {ALL_TOKENS.map((token) => {
              const isSelected = token.symbol === value
              const isNative = isNativeToken(chainId, token.symbol)
              const status = availability[token.symbol]
              const isUnavailable = status?.available === false
              const isChecking = isCrossChain && !status && checking

              return (
                <button
                  key={token.symbol}
                  type="button"
                  onClick={() => handleSelect(token.symbol)}
                  className={`
                    w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between gap-3
                    cursor-pointer hover:bg-surface-hover
                    ${isSelected ? 'bg-phosphor-muted' : ''}
                    ${isUnavailable ? 'opacity-50' : ''}
                  `}
                >
                  <div className="min-w-0">
                    <span className={`block text-sm font-medium ${isUnavailable ? 'text-tertiary' : 'text-primary'}`}>
                      {token.symbol}
                    </span>
                    <span className="block text-xs text-tertiary truncate">
                      {isChecking
                        ? 'Checking...'
                        : isUnavailable
                          ? status.reason
                          : isNative
                            ? 'Native'
                            : token.name
                      }
                    </span>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-phosphor flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

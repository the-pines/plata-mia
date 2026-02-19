'use client'

import { useState } from 'react'

interface KeyDisplayProps {
  label: string
  value: string
  copyable?: boolean
}

export function KeyDisplay({ label, value, copyable = true }: KeyDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs uppercase tracking-wider font-medium text-secondary">{label}</label>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-xs uppercase tracking-wider text-tertiary hover:text-lemon transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <div className="w-full px-4 py-3 bg-surface-page border border-dashed border-border rounded-sm text-sm text-primary break-all">
        {value}
      </div>
    </div>
  )
}

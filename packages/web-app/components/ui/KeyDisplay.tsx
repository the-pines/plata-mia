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
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray">{label}</label>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-xs text-gray-lighter hover:text-gray transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-gray break-all">
        {value}
      </div>
    </div>
  )
}

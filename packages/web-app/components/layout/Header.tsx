'use client'

import { useState, useEffect } from 'react'
import { ConnectButton } from '@/components/wallet'

const WORD = 'plata_mia'
const TYPE_SPEED = 120
const ERASE_SPEED = 80
const PAUSE_FULL = 2000
const PAUSE_EMPTY = 800

function useTypewriter() {
  const [text, setText] = useState('')
  const [erasing, setErasing] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    if (!erasing) {
      if (text.length < WORD.length) {
        timeout = setTimeout(() => setText(WORD.slice(0, text.length + 1)), TYPE_SPEED)
      } else {
        timeout = setTimeout(() => setErasing(true), PAUSE_FULL)
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(text.slice(0, -1)), ERASE_SPEED)
      } else {
        timeout = setTimeout(() => setErasing(false), PAUSE_EMPTY)
      }
    }

    return () => clearTimeout(timeout)
  }, [text, erasing])

  return text
}

export function Header() {
  const typed = useTypewriter()

  return (
    <header className="border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="block w-1.5 h-1.5 rounded-full bg-phosphor dot-pulse" />
        <span className="text-xs uppercase tracking-wider text-phosphor text-glow">
          {typed}
          <span className="animate-blink">_</span>
        </span>
      </div>
      <ConnectButton />
    </header>
  )
}

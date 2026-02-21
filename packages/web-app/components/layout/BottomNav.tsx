'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[448px] z-40">
      <div className="flex bg-surface/90 backdrop-blur-sm border border-border rounded-sm">
        <Link
          href="/send"
          className={`flex-1 flex items-center justify-center py-3.5 text-xs uppercase tracking-widest font-medium transition-colors ${
            pathname === '/send'
              ? 'text-lemon border-b-2 border-lemon'
              : 'text-tertiary hover:text-secondary'
          }`}
        >
          send
        </Link>
        <div className="w-px bg-border" />
        <Link
          href="/receive"
          className={`flex-1 flex items-center justify-center py-3.5 text-xs uppercase tracking-widest font-medium transition-colors ${
            pathname === '/receive'
              ? 'text-accent-green border-b-2 border-accent-green'
              : 'text-tertiary hover:text-secondary'
          }`}
        >
          receive
        </Link>
      </div>
    </nav>
  )
}

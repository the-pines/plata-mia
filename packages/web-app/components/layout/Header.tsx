'use client'

import Link from 'next/link'
import { ConnectButton } from '@/components/wallet'

export function Header() {
  return (
    <header className="shadow-[0_1px_0_0_#1A1A1A] px-4 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 bg-lemon rounded-sm flex items-center justify-center">
          <span className="text-surface-page font-bold text-sm">P</span>
        </div>
        <span className="text-base uppercase tracking-wider font-medium text-primary">Plata Mia</span>
      </Link>
      <ConnectButton />
    </header>
  )
}

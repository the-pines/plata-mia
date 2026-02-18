'use client'

import Link from 'next/link'
import { ConnectButton } from '@/components/wallet'

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lemon rounded-lg flex items-center justify-center">
            <span className="text-[#131313] font-bold text-lg">P</span>
          </div>
          <span className="font-bold text-xl text-white">Plata Mia</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/register" className="text-secondary hover:text-white transition-colors font-medium">
              Register
            </Link>
            <Link href="/send" className="text-secondary hover:text-white transition-colors font-medium">
              Send
            </Link>
            <Link href="/receive" className="text-secondary hover:text-white transition-colors font-medium">
              Receive
            </Link>
          </nav>
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}

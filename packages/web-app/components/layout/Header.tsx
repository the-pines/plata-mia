'use client'

import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b-2 border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lemon rounded-lg flex items-center justify-center">
            <span className="text-gray font-bold text-lg">P</span>
          </div>
          <span className="font-bold text-xl text-gray">Plata Mia</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/register" className="text-gray-light hover:text-gray transition-colors font-medium">
            Register
          </Link>
          <Link href="/send" className="text-gray-light hover:text-gray transition-colors font-medium">
            Send
          </Link>
          <Link href="/receive" className="text-gray-light hover:text-gray transition-colors font-medium">
            Receive
          </Link>
        </nav>
      </div>
    </header>
  )
}

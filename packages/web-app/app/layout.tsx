import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { Header, BottomNav } from '@/components/layout'
import { Providers } from '@/providers/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Plata Mia - Stealth Payments',
  description: 'Privacy-preserving payments on Polkadot',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex justify-center bg-surface-page">
        <Providers>
          <div className="w-full max-w-[480px] min-h-screen flex flex-col relative overflow-x-hidden">
            <Header />
            <main className="flex-1 flex flex-col px-4 pt-8 pb-24">
              {children}
            </main>
            <BottomNav />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

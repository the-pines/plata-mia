import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout'
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
      <body>
        <Providers>
          <Header />
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

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
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1 flex flex-col items-center px-4 pt-8 pb-8">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout'
import { WalletProvider } from '@/contexts/WalletContext'
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
        <WalletProvider>
          <Header />
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster />
        </WalletProvider>
      </body>
    </html>
  )
}

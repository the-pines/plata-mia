import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { Header, BottomNav } from '@/components/layout'
import { Providers } from '@/providers/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'PLATA_MIA — Private Stealth Payments',
  description:
    'Send and receive tokens privately across EVM chains. Stealth addresses, Hyperbridge cross-chain transfers, and xx-network anonymous announcements.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💸</text></svg>',
  },
  metadataBase: new URL('https://plata-mia.vercel.app'),
  openGraph: {
    title: 'PLATA_MIA — Private Stealth Payments',
    description:
      'Send and receive tokens privately across EVM chains. Stealth addresses, Hyperbridge cross-chain transfers, and xx-network anonymous announcements.',
    siteName: 'PLATA_MIA',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PLATA_MIA — Private Stealth Payments',
    description:
      'Send and receive tokens privately across EVM chains. Stealth addresses, Hyperbridge cross-chain transfers, and xx-network anonymous announcements.',
  },
  keywords: [
    'stealth addresses',
    'privacy',
    'crypto payments',
    'EVM',
    'cross-chain',
    'Hyperbridge',
    'xx-network',
    'Polkadot',
  ],
  robots: {
    index: true,
    follow: true,
  },
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
          <div className="crt-overlay" />
          <div className="crt-vignette" />
          <div className="w-full max-w-[480px] min-h-screen flex flex-col relative overflow-x-hidden">
            <Header />
            <main className="flex-1 flex flex-col px-4 pt-8 pb-24">
              {children}
            </main>
            <BottomNav />
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#0A0F0A',
                color: '#C0FFC0',
                border: '1px solid #0D1A0D',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}

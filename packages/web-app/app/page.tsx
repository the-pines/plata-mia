import Link from 'next/link'
import { Card } from '@/components/ui'

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray">
          Stealth Payments
        </h1>
        <p className="text-lg text-gray-light max-w-2xl mx-auto">
          Send and receive private payments on Polkadot.
          Only you know where your money goes.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <Link href="/register">
          <Card className="hover:border-lemon transition-colors cursor-pointer h-full">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-lemon-light rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray">Register</h2>
              <p className="text-gray-lighter text-sm">
                Generate your stealth keys and register to receive private payments.
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/send">
          <Card className="hover:border-lemon transition-colors cursor-pointer h-full">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-lemon-light rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray">Send</h2>
              <p className="text-gray-lighter text-sm">
                Send payments to anyone using their stealth address.
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/receive">
          <Card className="hover:border-lemon transition-colors cursor-pointer h-full">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-lemon-light rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray">Receive</h2>
              <p className="text-gray-lighter text-sm">
                Scan for incoming payments and get your private keys.
              </p>
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-12 p-6 bg-lemon-light rounded-xl border-2 border-lemon">
        <h3 className="font-semibold text-gray mb-2">How it works</h3>
        <ol className="text-sm text-gray-light space-y-2">
          <li><span className="font-mono bg-lemon px-1.5 py-0.5 rounded mr-2">1</span>Register your stealth address with a memorable hint</li>
          <li><span className="font-mono bg-lemon px-1.5 py-0.5 rounded mr-2">2</span>Share your hint with anyone who wants to pay you</li>
          <li><span className="font-mono bg-lemon px-1.5 py-0.5 rounded mr-2">3</span>Senders look up your hint and send to a unique stealth address</li>
          <li><span className="font-mono bg-lemon px-1.5 py-0.5 rounded mr-2">4</span>Scan for payments and derive your private key to spend</li>
        </ol>
      </div>
    </div>
  )
}

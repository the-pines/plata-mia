import { z } from 'zod/v4'

const envSchema = z.object({
  NEXT_PUBLIC_NETWORK: z.enum(['testnet', 'mainnet']),
  NEXT_PUBLIC_XX_PROXY_URL: z.url(),
  NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().optional(),
  NEXT_PUBLIC_HYPERBRIDGE_INDEXER: z.url().optional(),
})

function parseEnv() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
    NEXT_PUBLIC_XX_PROXY_URL: process.env.NEXT_PUBLIC_XX_PROXY_URL,
    NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    NEXT_PUBLIC_HYPERBRIDGE_INDEXER: process.env.NEXT_PUBLIC_HYPERBRIDGE_INDEXER,
  })

  if (!result.success) {
    const formatted = z.prettifyError(result.error)
    throw new Error(`Invalid environment variables:\n${formatted}`)
  }

  return result.data
}

export const env = parseEnv()

# web-app

Next.js frontend for Plata Mia stealth payments.

## Setup

```bash
cp .env.example .env   # fill in values
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Environment

See `.env.example` for all variables. Required:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_XX_PROXY_URL` | Announcement proxy URL |

Optional:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Alchemy RPC key (falls back to public RPCs) |
| `NEXT_PUBLIC_HYPERBRIDGE_INDEXER` | Custom Hyperbridge indexer URL |

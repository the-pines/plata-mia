# PLATA_MIA

Privacy-preserving stealth payments across EVM chains. Recipients register secp256k1 keys on-chain, senders derive one-time stealth addresses locally and transfer tokens single or cross-chain via Hyperbridge. Payment announcements propagate through xx-network's cMix mixnet so only the recipient can detect incoming funds.



## Environment


| Variable                          | Required | Description                                 |
| --------------------------------- | -------- | ------------------------------------------- |
| `NEXT_PUBLIC_NETWORK`             | Yes      | `testnet` or `mainnet`                      |
| `NEXT_PUBLIC_XX_PROXY_URL`        | Yes      | Announcement proxy URL                      |
| `NEXT_PUBLIC_ALCHEMY_API_KEY`     | No       | Alchemy RPC key (falls back to public RPCs) |
| `NEXT_PUBLIC_HYPERBRIDGE_INDEXER` | No       | Custom Hyperbridge indexer URL              |


## Local Development

### 1. xx-proxy (announcement backend)

```bash
cd packages/xx-proxy
cp .env.example .env          # set XX_CERT_PATH and XX_PASSWORD
make build && make run         # starts on :8080
```

Requires a `mainnet.crt` file — see xx-proxy README for how to obtain it.

### 2. web-app

```bash
cd packages/web-app
cp .env.example .env          # set NEXT_PUBLIC_NETWORK=testnet, proxy URL
pnpm install
pnpm dev                      # starts on :3000
```

Connect MetaMask to a testnet (Ethereum Sepolia, Arbitrum Sepolia, etc.), get test tokens from the [Polkadot faucet](https://faucet.polkadot.io/) for Paseo, and you're ready to register, send, and receive.
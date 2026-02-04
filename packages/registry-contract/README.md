# Registry Contract

A stealth meta-address registry for the Plata Mia protocol. Users register their stealth payment credentials, allowing senders to look up recipients and generate stealth addresses.

## Contract Interface

### Functions

| Function | Description |
|----------|-------------|
| `register(identifier, spendingKey, viewingKey, preferredChain, nickname)` | Register a new stealth meta-address |
| `lookup(identifier)` | Retrieve a registered stealth meta-address |
| `getOwner(identifier)` | Get the owner of a registration |
| `updatePreferredChain(identifier, newChain)` | Update preferred chain (owner only) |
| `updateNickname(identifier, newNickname)` | Update nickname (owner only) |

### Events

- `Registered` - Emitted when a new address is registered
- `ChainUpdated` - Emitted when preferred chain changes
- `NicknameUpdated` - Emitted when nickname changes

## Deployment

| Network | Chain ID | Address |
|---------|----------|---------|
| Polkadot Hub TestNet | 420420417 | `0x47568470D89CD2Ea20553ffB08bD630BC95FE4bB` |

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
cd solidity
npm install
```

### Run Tests

```bash
npm test
```

### Compile

```bash
npm run compile
```

### Deploy

1. Create `.env` file:
```bash
cp .env.example .env
```

2. Add your seed phrase to `.env`:
```
DEPLOYER_SURI="your twelve word seed phrase here"
```

3. Get testnet tokens from [Polkadot Faucet](https://faucet.polkadot.io/)
   - Network: Polkadot testnet (Paseo)
   - Chain: AssetHub

4. Deploy:
```bash
npm run deploy
```

## Network Configuration

Add to MetaMask:

| Field | Value |
|-------|-------|
| Network Name | Polkadot Hub TestNet |
| RPC URL | `https://eth-rpc-testnet.polkadot.io` |
| Chain ID | `420420417` |
| Symbol | `PAS` |
| Explorer | `https://blockscout-testnet.polkadot.io` |

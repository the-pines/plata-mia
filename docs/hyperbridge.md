# Hyperbridge in Plata Mia

## Status

TokenGateway is live on mainnet. 4,359 teleports recorded, most recent today. ~28 messages/day. Modest but real usage.

Contract address `0xFd413e3AFe560182C4471F4d143A96d3e259B6dE` is the same across all chains (CREATE2). Our addresses match the official docs exactly.

## Recent outage

Feb 14-19, 2026. Polkadot runtime change broke BEEFY proofs when Hyperbridge moved from parachain to parathread. $5M TVL was frozen across 12 networks. Restored Feb 19.

## Why our bridging might fail

1. **Fee token balance** — user needs DAI (Ethereum/Arbitrum/Optimism) or USDT (BSC) to pay the relayer. If missing, the approval tx reverts silently.

2. **`redeem: false` hardcoded** — means "lock on source, mint wrapped on destination". If the wrapped token isn't registered on the destination chain, it fails at delivery.

3. **Native token handling** — we send `value: amount` with assetId `WETH`. The gateway may expect different handling for native ETH vs wrapped.

4. **Relayer availability** — thin with ~28 messages/day. Transfers may take a long time.

5. **Post-outage issues** — outage ended 6 days ago, may still have residual problems.

## What to do

- Test directly on `gateway.hyperbridge.network` to isolate if it's our code or the protocol
- Check fee token balance before attempting teleport, show clear error if missing
- Run `scripts/check-gateways-mainnet.sh` to verify which token routes are registered
- Track commitment hash lifecycle: SOURCE → SOURCE_FINALIZED → HYPERBRIDGE_DELIVERED → DESTINATION
- Look into Intent Gateway (`0x2A89653A...`) — newer, faster bridging via liquidity providers (1,057+ transfers)

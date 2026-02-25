# Overview

Plata Mia is a private payments app. It lets you send and receive tokens on EVM-compatible chains without exposing your financial activity on-chain.

Every payment goes to a unique, one-time address called a stealth address. Nobody — not even someone watching the blockchain — can link your payments together or trace them back to your identity.

## How It Works

1. **Register** — generate your stealth keys and publish them under a human-readable hint (like a username).
2. **Send** — look up a recipient by their hint, and the app generates a fresh address just for that payment. Supports same-chain and cross-chain transfers.
3. **Receive** — scan the network to find payments addressed to you, then redeem the funds to any wallet.

The entire process is handled by the app. You don't need to understand the cryptography — just connect your wallet and go.

## What Makes It Private

- Each payment uses a different address, so transactions can't be linked together.
- Announcements (the signals that tell a recipient about a payment) are delivered through a mixnet, stripping metadata like IP addresses.
- Only the recipient can detect which payments are theirs, using their private viewing key.

## Next Steps

- [Application](/application) — learn how to use the app step by step.
- [Architecture](/architecture) — understand how the system is built.
- [Stealth Addresses](/stealth-addresses) — learn how stealth addresses provide privacy.

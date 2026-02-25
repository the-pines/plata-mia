# Stealth Addresses

Stealth addresses let someone receive payments without revealing their identity on-chain. Every payment goes to a unique, one-time address that only the recipient can detect and spend from. An outside observer sees unrelated addresses with no visible link between them.

## The Problem

On most blockchains, if you share your address to receive a payment, anyone can see every transaction that address has ever received. Your entire financial history becomes public. Stealth addresses solve this by generating a fresh address for each payment.

## Two Key Pairs

To use stealth addresses, a recipient generates two key pairs:

- **Spending key pair:** Controls the funds. The private spending key is needed to move tokens out of a stealth address.
- **Viewing key pair:** Detects incoming payments. The private viewing key lets the recipient scan for payments addressed to them — but it cannot spend funds.

This separation is useful. You could give a viewing key to an accountant or a portfolio tracker without giving them the ability to move your money.

Both public keys are registered on-chain under a human-readable hint (like "alice"). The hint is hashed before storage, so the plain text never appears on the blockchain. Anyone who wants to send a payment looks up the hint to get the public keys.

## How Sending Works

When you send a payment through Plata Mia:

1. The app looks up the recipient's two public keys using their hint
2. The app generates a fresh temporary key pair just for this payment — a new one every time, which is what makes payments unlinkable
3. Using the temporary private key and the recipient's viewing public key, the app computes a shared value through a two-step process (a key exchange followed by a hash) that only the sender and recipient can reproduce
4. That shared value is combined with the recipient's spending public key through elliptic curve math to produce a new, unique stealth address
5. The app sends your funds to this stealth address
6. The app publishes an announcement containing the temporary public key and a view tag

The stealth address has never been seen before on-chain. Nobody can link it to the recipient's registered keys.

You don't need to do any of this manually — Plata Mia handles every step automatically when you click Send.

## How Receiving Works

When you scan for payments in Plata Mia:

1. The app fetches new announcements from the network
2. For each announcement, the app uses your private viewing key and the sender's temporary public key to recompute the same shared value from step 3 above
3. A quick check using the view tag filters out non-matching announcements instantly — the app only needs to do the full check on roughly 1 in 256 announcements
4. If the view tag matches, the app derives the expected stealth address and checks if it holds any funds
5. If funds are found, the app can derive the private spending key for that address — this requires both your viewing key (to recompute the shared value) and your spending key (to produce the final key)

Again, this is all automatic. You click Scan, and the app shows you any payments it finds.

## View Tags

A view tag is the first byte of the shared secret hash — a single value between 0 and 255. The sender includes it in the announcement alongside the temporary public key.

When scanning, the recipient recomputes the shared secret and checks whether its first byte matches the view tag in the announcement. If it doesn't match, the announcement is skipped immediately — no elliptic curve point addition or address derivation needed. Since one byte has 256 possible values, only about 1 in 256 announcements pass this filter, eliminating 99.6% of candidates with a single byte comparison.

## Announcements and Privacy

Announcements are broadcast through the xx network, a mixnet that strips metadata like IP addresses and timing information from messages. This means the announcement itself — the only data that connects a sender to a payment — is delivered privately.

An announcement contains:
- The temporary public key (so the recipient can recompute the shared value)
- A view tag (for fast filtering)
- A block hint (tells the recipient which block to check on-chain)

None of these reveal the sender's identity or the recipient's registered keys. And because a fresh temporary key is generated for every payment, even the announcements themselves can't be linked to each other.

## Further Reading

Plata Mia's stealth address scheme is based on [EIP-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564), the Ethereum standard for stealth address protocols.

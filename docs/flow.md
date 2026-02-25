# Stealth Payment Flow

## 1. Register

The recipient creates two key pairs:

- **Spending** — controls ownership of stealth addresses. Whoever holds `spendingPriv` can move the funds.
- **Viewing** — allows detecting incoming payments. Whoever holds `viewingPriv` can scan announcements and find payments, but cannot spend them.

The public halves (`spendingPub`, `viewingPub`) get published to the on-chain registry under a human-readable identifier. The private halves (`spendingPriv`, `viewingPriv`) stay on the recipient's device.

## 2. Send

The sender looks up `spendingPub` and `viewingPub` from the registry. Then:

- Generates a random throwaway key pair called the **ephemeral key** (`ephemeralPriv`, `ephemeralPub`) — new one per payment
- Combines `ephemeralPriv` with `viewingPub` to get a `sharedSecret` (only sender and recipient can compute this)
- Uses `sharedSecret` together with `spendingPub` to derive a brand new address — the `stealthAddress`
- Extracts a `viewTag` from the `sharedSecret` (a single byte used for fast filtering later)

The sender transfers tokens to `stealthAddress`, then publishes `ephemeralPub` and `viewTag` as an announcement through xx-network.

## 3. Scan

The recipient checks each announcement:

- Takes `ephemeralPub` from the announcement and combines it with `viewingPriv` — this gives the same `sharedSecret` the sender computed
- Checks if `viewTag` matches (quick 1-byte comparison that filters out ~99.6% of non-matching announcements)
- If it matches, derives `stealthAddress` and checks if it has funds

Only the recipient can do this because it requires `viewingPriv`.

## 4. Redeem

The recipient combines `spendingPriv` with `sharedSecret` to get `stealthPriv` — the private key that controls the `stealthAddress`. They use it to sign a transaction and move the funds to their wallet.

Only the recipient can do this because it requires `spendingPriv`.

## Why it works

- **Unlinkable** — every payment goes to a unique `stealthAddress` created from fresh randomness (`ephemeralPriv`)
- **Only recipient detects** — scanning needs `viewingPriv`
- **Only recipient spends** — redeeming needs `spendingPriv`
- **No metadata leak** — announcements go through xx-network's mixnet, not on-chain
